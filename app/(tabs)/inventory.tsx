// app/(tabs)/inventory.tsx — Inventory Tab · P4 Final (patched)
// POLISH: margin chip colour-coded, edit modal quick-adjust UX tightened,
//         empty state copy improved, section header for low-stock mode

import { useState, useMemo, useCallback, memo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router }           from 'expo-router';
import { useInventory }     from '@/hooks/useInventory';
import { updateStock }      from '@/services/SupabaseService';
import { Colors, TouchTargets, Radius, Spacing } from '@/constants/Theme';
import { formatINR }        from '@/services/UPIService';
import { Product, ProductCategory } from '@/types';

const CATEGORIES: Array<ProductCategory | 'all'> = [
  'all', 'dairy', 'snacks', 'beverages', 'staples', 'personal', 'other',
];

export default function InventoryTab() {
  const { products, loading, error, refresh } = useInventory();
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<ProductCategory | 'all'>('all');
  const [lowOnly,     setLowOnly]     = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    let list = products;
    if (filter !== 'all') list = list.filter(p => p.category === filter);
    if (lowOnly)          list = list.filter(p => p.stock <= p.low_stock_threshold);
    if (search.trim())    list = list.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [products, filter, lowOnly, search]);

  const lowStockCount = useMemo(
    () => products.filter(p => p.stock <= p.low_stock_threshold).length,
    [products],
  );

  if (error) {
    return (
      <View style={{
        flex: 1, backgroundColor: Colors.background,
        alignItems: 'center', justifyContent: 'center', padding: 28,
      }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Failed to load inventory
        </Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={refresh}
          style={{
            backgroundColor: Colors.amber, borderRadius: Radius.lg,
            paddingHorizontal: 24, height: TouchTargets.standard,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: Colors.textInverse, fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* ── Header ── */}
      <View style={{
        paddingHorizontal: Spacing[4], paddingTop: 56, paddingBottom: Spacing[3],
        borderBottomWidth: 0.5, borderColor: Colors.border,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[3] }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary }}>
            Inventory
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {lowStockCount > 0 && (
              <TouchableOpacity
                onPress={() => setLowOnly(v => !v)}
                style={{
                  backgroundColor: lowOnly ? '#1A0808' : Colors.surface,
                  borderWidth: 1, borderColor: Colors.crimson,
                  borderRadius: Radius.pill,
                  paddingHorizontal: 10, paddingVertical: 5,
                }}
              >
                <Text style={{ fontSize: 12, color: Colors.crimson, fontWeight: '700' }}>
                  ⚠ {lowStockCount} low
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push('/scanner')}
              style={{
                backgroundColor: Colors.amber, borderRadius: Radius.pill,
                paddingHorizontal: 12, height: 32,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: Colors.textInverse, fontSize: 13, fontWeight: '700' }}>
                + Scan Bill
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: Colors.surface,
          borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border,
          paddingHorizontal: 12, height: 42, marginBottom: Spacing[3],
        }}>
          <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products…"
            placeholderTextColor={Colors.textMuted}
            style={{ flex: 1, color: Colors.textPrimary, fontSize: 15 }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 20 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setFilter(cat)}
              style={{
                paddingHorizontal: 12, paddingVertical: 5,
                borderRadius: Radius.pill,
                backgroundColor: filter === cat ? Colors.amber : Colors.surface,
                borderWidth: 0.5,
                borderColor: filter === cat ? Colors.amber : Colors.border,
                marginRight: 8,
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: '600',
                color: filter === cat ? Colors.textInverse : Colors.textSecondary,
              }}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Stats bar ── */}
      <View style={{
        paddingHorizontal: Spacing[4], paddingVertical: Spacing[2],
        borderBottomWidth: 0.5, borderColor: Colors.border,
      }}>
        <Text style={{ fontSize: 12, color: Colors.textMuted }}>
          {filtered.length} of {products.length} products
          {lowOnly ? ' · low stock only' : ''}
        </Text>
      </View>

      {/* ── Product list ── */}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.amber} />
        }
        contentContainerStyle={{ padding: Spacing[3] }}
        renderItem={({ item }) => (
          <InventoryRow product={item} onPress={() => setEditProduct(item)} />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 64 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>
              {lowOnly ? '✅' : '📦'}
            </Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
              {search
                ? `No products match "${search}"`
                : lowOnly
                  ? 'Everything is well-stocked!'
                  : 'No products yet.\nScan a supplier bill to add inventory.'}
            </Text>
          </View>
        }
      />

      {/* Edit stock modal */}
      {editProduct && (
        <EditStockModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={() => { setEditProduct(null); refresh(); }}
        />
      )}
    </View>
  );
}

// ── Inventory row ─────────────────────────────────────────────
const InventoryRow = memo(function InventoryRow({
  product, onPress,
}: { product: Product; onPress: () => void }) {
  const outOfStock = product.stock === 0;
  const lowStock   = product.stock > 0 && product.stock <= product.low_stock_threshold;
  const stockColor = outOfStock ? Colors.crimson : lowStock ? Colors.amber : Colors.emerald;

  const margin    = product.sell_price - product.cost_price;
  const marginPct = product.cost_price > 0
    ? Math.round((margin / product.cost_price) * 100)
    : 0;
  // Colour-code: healthy margin ≥15%, tight 5–14%, thin <5%
  const marginColor = marginPct >= 15
    ? Colors.emerald
    : marginPct >= 5
      ? Colors.amber
      : Colors.crimson;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: 14, marginBottom: 8,
        borderWidth: 0.5,
        borderColor: outOfStock ? Colors.crimson : lowStock ? Colors.amber : Colors.border,
        flexDirection: 'row', alignItems: 'center',
      }}
    >
      {/* Stock colour strip */}
      <View style={{
        width: 5, minHeight: 48, borderRadius: 3,
        backgroundColor: stockColor, marginRight: 14, opacity: 0.85,
      }} />

      {/* Product info */}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4,
        }} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>
            Cost: {formatINR(product.cost_price)}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>
            Sell: {formatINR(product.sell_price)}
          </Text>
          {/* Margin chip */}
          <View style={{
            paddingHorizontal: 6, paddingVertical: 2,
            borderRadius: 4,
            backgroundColor: `${marginColor}18`,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: marginColor }}>
              {marginPct >= 0 ? '+' : ''}{marginPct}%
            </Text>
          </View>
        </View>
      </View>

      {/* Stock count */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: stockColor }}>
          {product.stock}
        </Text>
        <Text style={{ fontSize: 11, color: Colors.textMuted }}>{product.unit}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Edit Stock Modal ──────────────────────────────────────────
function EditStockModal({
  product, onClose, onSaved,
}: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [stock,  setStock]  = useState(String(product.stock));
  const [saving, setSaving] = useState(false);

  async function save() {
    const newStock = parseInt(stock, 10);
    if (isNaN(newStock) || newStock < 0) {
      Alert.alert('Invalid', 'Stock must be 0 or more.');
      return;
    }
    setSaving(true);
    try {
      await updateStock(product.id, newStock);
      onSaved();
    } catch (e) {
      Alert.alert('Failed', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const currentVal = parseInt(stock, 10) || 0;

  return (
    <Modal visible animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <View style={{
          backgroundColor: Colors.surface,
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: Spacing[5],
        }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 }}>
            Edit Stock
          </Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing[5] }}>
            {product.name}
          </Text>

          {/* Quick adjust */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing[4] }}>
            {([-10, -5, -1, +1, +5, +10] as const).map(delta => {
              const newVal = Math.max(0, currentVal + delta);
              const isNeg  = delta < 0;
              return (
                <TouchableOpacity
                  key={delta}
                  onPress={() => setStock(String(newVal))}
                  style={{
                    flex: 1, height: 42, borderRadius: Radius.md,
                    backgroundColor: isNeg ? '#1A0808' : '#0A1A0A',
                    borderWidth: 0.5,
                    borderColor: isNeg ? Colors.crimson : Colors.emerald,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '700',
                    color: isNeg ? Colors.crimson : Colors.emerald,
                  }}>
                    {delta > 0 ? '+' : ''}{delta}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Manual input */}
          <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>
            Set exact quantity
          </Text>
          <TextInput
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
            selectTextOnFocus
            style={{
              backgroundColor: Colors.background,
              borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border,
              paddingHorizontal: 16, height: TouchTargets.standard,
              color: Colors.textPrimary, fontSize: 26, textAlign: 'center',
              fontWeight: '700', letterSpacing: 3,
              marginBottom: Spacing[5],
            }}
          />

          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={{
              backgroundColor: Colors.emerald, borderRadius: Radius.lg,
              height: TouchTargets.standard, alignItems: 'center', justifyContent: 'center',
              marginBottom: 10, opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? <ActivityIndicator color={Colors.textInverse} />
              : <Text style={{ color: Colors.textInverse, fontWeight: '700', fontSize: 16 }}>
                  ✓ Update Stock
                </Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', padding: 10 }}>
            <Text style={{ color: Colors.textSecondary }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
