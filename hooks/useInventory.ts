// hooks/useInventory.ts — BharatShop OS 2026 (fixed)
// FIXES:
//   1. load in useEffect deps caused infinite re-subscribe — use useRef to stabilise
//   2. CHANNEL_ERROR had no fallback — added 30s polling + AppState foreground refresh
//   3. Cleanup properly cancels both subscription AND polling interval

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Product } from '@/types';
import { fetchProducts, subscribeToProducts } from '@/services/SupabaseService';
import { supabase } from '@/services/SupabaseService';

interface UseInventoryResult {
  products: Product[];
  loading:  boolean;
  error:    string | null;
  refresh:  () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000;

export function useInventory(): UseInventoryResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const isMounted = useRef(true);

  const load = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      if (isMounted.current) setProducts(data);
    } catch (e) {
      if (isMounted.current) setError((e as Error).message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    let unsubscribe: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function init() {
      await load();

      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted.current) {
        unsubscribe = subscribeToProducts(user.id, (fresh) => {
          if (isMounted.current) setProducts(fresh);
        });
      }

      pollTimer = setInterval(async () => {
        if (!isMounted.current) return;
        try {
          const data = await fetchProducts();
          if (isMounted.current) setProducts(data);
        } catch {
          // silent fallback
        }
      }, POLL_INTERVAL_MS);
    }

    init();

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') load();
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      isMounted.current = false;
      unsubscribe?.();
      if (pollTimer) clearInterval(pollTimer);
      appStateSub.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { products, loading, error, refresh: load };
}
