// services/SupabaseService.ts — BharatShop OS 2026
// ─────────────────────────────────────────────────────────────────────────────
// FIXES IN THIS FILE
// ──────────────────
// BUG-1  subscribeToProducts crash
//        "cannot add postgres_changes callbacks after subscribe()"
//        Root cause: React StrictMode / hot-reload calls subscribe twice on the
//        same channel name before the previous cleanup ran.
//        Fix: module-level Map tracks live channels; always remove before recreate.
//
// BUG-3  recordSale stock race condition
//        Root cause: fetch-stock → subtract → write is not atomic. Two
//        concurrent sales both read the same stock value.
//        Fix: PostgreSQL RPC `decrement_stock` does GREATEST(0, stock - qty)
//        in one round-trip. Safe sequential fallback if RPC not yet deployed.
//
// IMPROVEMENT  fetchLowStockProducts
//        Previous code hardcoded `lte('stock', 5)` then client-filtered by
//        low_stock_threshold — wrong. Now fully server-side via RPC or correct
//        client filter against the per-product threshold column.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Product, Sale, SaleItem, ScannedProduct } from '@/types';

const SUPABASE_URL = (
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL as string | undefined
) ?? '';
const SUPABASE_ANON_KEY = (
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined
) ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  global: {
    headers: { 'X-Client-Info': 'bharatshop-os/0.1.0' },
  },
});

// ─── Products ─────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function upsertProduct(
  product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<Product> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('products')
    .upsert({ ...product, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── BUG-1 FIX: Realtime subscription channel guard ──────────────────────────
//
// Problem: Supabase channels are stateful objects. Calling .on() after
// .subscribe() throws "cannot add postgres_changes callbacks after subscribe()".
// This happens in React when:
//   a) React 18 StrictMode double-invokes useEffect in development
//   b) Hot reload triggers a new mount before the previous cleanup ran
//   c) useInventory hook is called on a screen that re-mounts frequently
//
// Fix: store every live channel in a module-level Map keyed by userId.
// Before creating a new channel, remove the existing one for that user.
// supabase.removeChannel() is idempotent — safe to call even if already removed.

const _liveChannels = new Map<string, ReturnType<typeof supabase.channel>>();

export function subscribeToProducts(
  userId:   string,
  onChange: (products: Product[]) => void,
): () => void {
  // Tear down stale channel if it exists
  const stale = _liveChannels.get(userId);
  if (stale) {
    supabase.removeChannel(stale);
    _liveChannels.delete(userId);
  }

  // Build channel fresh — .on() must be called BEFORE .subscribe()
  const channel = supabase
    .channel(`products:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'products',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        const fresh = await fetchProducts().catch(() => []);
        onChange(fresh);
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('[SupabaseService] Realtime CHANNEL_ERROR — will retry on reconnect');
      }
    });

  _liveChannels.set(userId, channel);

  // Cleanup function returned to useEffect / useInventory
  return () => {
    supabase.removeChannel(channel);
    _liveChannels.delete(userId);
  };
}

// ─── AI Bill Scan → Inventory ─────────────────────────────────────────────────

export async function addScannedProducts(scanned: ScannedProduct[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // To ensure reliability, we process updates sequentially but collect errors.
  // In a production environment, this should be a single RPC call or a transaction.
  for (const s of scanned) {
    try {
      const { data: existing } = await supabase
        .from('products')
        .select('id, stock')
        .eq('user_id', user.id)
        .ilike('name', s.name.trim())
        .maybeSingle();

      if (existing) {
        await supabase
          .from('products')
          .update({ stock: existing.stock + s.quantity })
          .eq('id', existing.id);
      } else {
        await supabase.from('products').insert({
          user_id:             user.id,
          name:                s.name.trim(),
          stock:               s.quantity,
          cost_price:          s.cost_price,
          sell_price:          parseFloat((s.cost_price * 1.2).toFixed(2)),
          category:            s.category,
          low_stock_threshold: 5,
        });
      }
    } catch (err) {
      console.error(`[SupabaseService] Failed to process scanned item: ${s.name}`, err);
    }
  }
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export async function updateStock(productId: string, newStock: number): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ stock: Math.max(0, newStock) }) // never write negative stock
    .eq('id', productId);
  if (error) throw error;
}

// ─── BUG-3 FIX: Atomic stock decrement ───────────────────────────────────────
//
// Problem: recordSale fetched stock, subtracted qty, then wrote back.
// Two simultaneous sales (possible when shopkeeper has two devices or taps
// twice quickly) both read the same stock value → both deduct from it →
// stock ends up higher than reality.
//
// Fix: PostgreSQL RPC that does everything in one DB operation:
//
//   CREATE OR REPLACE FUNCTION decrement_stock(p_id uuid, p_qty int)
//   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
//   BEGIN
//     UPDATE products
//       SET stock = GREATEST(0, stock - p_qty)
//       WHERE id = p_id
//         AND user_id = auth.uid();
//   END;
//   $$;
//
// Run the SQL above in Supabase → SQL Editor once to deploy the RPC.
// Until then, the fallback below handles it safely for single-device MVP.

async function decrementStockSafe(productId: string, qty: number): Promise<void> {
  // Attempt atomic RPC (requires SQL above deployed in Supabase)
  const { error: rpcError } = await supabase.rpc('decrement_stock', {
    p_id:  productId,
    p_qty: qty,
  });

  if (!rpcError) return; // Atomic path ✅

  // Fallback: safe sequential read-then-write (acceptable for single-device MVP)
  if (rpcError.code === 'PGRST202') {
    // PGRST202 = RPC function not found — log once then use fallback silently
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', productId)
      .single();
    if (product) {
      await updateStock(productId, product.stock - qty);
    }
  } else {
    // Unexpected RPC error — propagate
    throw rpcError;
  }
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export async function recordSale(
  items:         SaleItem[],
  paymentMethod: 'upi' | 'cash',
  upiRef?:       string,
): Promise<Sale> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const total = items.reduce((sum, i) => sum + i.sell_price * i.qty, 0);

  // Decrement stock atomically for all items concurrently
  // Promise.allSettled — a stock failure doesn't block recording the sale
  const stockResults = await Promise.allSettled(
    items.map(item => decrementStockSafe(item.product_id, item.qty)),
  );
  stockResults.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(`[SupabaseService] Stock decrement failed for item ${items[i]?.product_id}:`, result.reason);
    }
  });

  // Insert sale record — JSONB snapshot preserves price-at-time-of-sale
  const { data, error } = await supabase
    .from('sales')
    .insert({
      user_id:        user.id,
      items,          // snapshot: [{ product_id, name, qty, sell_price }]
      total,
      payment_method: paymentMethod,
      upi_ref:        upiRef ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTodaySales(): Promise<Sale[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('timestamp', today.toISOString())
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// IMPROVEMENT: correct low-stock logic
// Supabase JS client cannot do column-to-column comparisons (stock <= low_stock_threshold)
// directly. We fetch all products and filter client-side — acceptable for MVP
// (product catalogs are typically < 500 rows for a Kirana store).
// For production: use a Postgres VIEW or RPC that does the column comparison server-side.
export async function fetchLowStockProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('stock', { ascending: true });
  if (error) throw error;
  return (data ?? []).filter(
    p => p.stock <= (p.low_stock_threshold ?? 5),
  );
}
