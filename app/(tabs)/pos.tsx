// app/(tabs)/pos.tsx — BharatShop POS · Redesigned 2026
// FIXES: safe area, pull-to-refresh, stock guard, immediate post-sale refresh

import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator, Alert, Animated, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import QRCode       from 'react-native-qrcode-svg';
import { router }   from 'expo-router';
import { useInventory }           from '@/hooks/useInventory';
import { useCart }                from '@/context/CartContext';
import { recordSale }             from '@/services/SupabaseService';
import { trackSaleCompleted }     from '@/services/MixpanelService';
import { getStoreConfig }         from '@/app/settings';
import { generateQRValue, generateTransactionId, formatINR } from '@/services/UPIService';
import { Product, CartItem } from '@/types';

const T = {
  bg:'#F7F7F5', surface:'#FFFFFF', border:'#EBEBEB',
  textPrimary:'#111111', textSec:'#555555', textMuted:'#999999',
  saffron:'#E8771A', saffronBg:'#FEF3E8',
  green:'#1A7A4A', greenBg:'#E8F5EE',
  red:'#C0392B', redBg:'#FDECEA',
  amber:'#F0A500', amberBg:'#FEF9E8',
};

export default function POSTab() {
  const insets = useSafeAreaInsets();
  const { products, loading, refresh } = useInventory();
  const { items, total, itemCount, addItem, clearCart } = useCart();
  const [showCart, setShowCart]       = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [filter, setFilter]           = useState('all');
  const [storeConfig, setStoreConfig] = useState({ upiVpa: 'yourname@upi', storeName: 'My Store' });
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { getStoreConfig().then(setStoreConfig); }, []);

  useEffect(() => {
    if (itemCount === 0) return;
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
  }, [itemCount]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['all', ...cats] as string[];
  }, [products]);

  const filtered = useMemo(
    () => filter === 'all' ? products : products.filter(p => p.category === filter),
    [products, filter],
  );

  const cartQtyFor = useCallback((productId: string) =>
    items.find(i => i.product.id === productId)?.qty ?? 0, [items]);

  const handleAdd = useCallback(async (product: Product) => {
    const inCart = cartQtyFor(product.id);
    if (inCart >= product.stock) {
      Alert.alert('Not enough stock', `Only ${product.stock} ${product.name} available. You already have ${inCart} in cart.`);
      return;
    }
    addItem(product);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [addItem, cartQtyFor]);

  if (loading && products.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={T.saffron} size="large" />
        <Text style={{ color: T.textMuted, fontSize: 13, marginTop: 14 }}>Loading products…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: T.surface, borderBottomWidth: 0.5, borderColor: T.border, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: T.textPrimary }}>Point of Sale</Text>
          <Text style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>{storeConfig.storeName}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={{ width: 40, height: 40, backgroundColor: T.bg, borderRadius: 20, borderWidth: 0.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 17 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: T.surface, borderBottomWidth: 0.5, borderColor: T.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
          {categories.map(cat => {
            const active = filter === cat;
            return (
              <TouchableOpacity key={cat} onPress={() => setFilter(cat)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: active ? T.saffron : T.bg, borderWidth: 0.5, borderColor: active ? T.saffron : T.border }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : T.textSec }}>
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 120 }}
        columnWrapperStyle={{ gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={T.saffron} />}
        renderItem={({ item }) => (
          <POSProductCard product={item} cartQty={cartQtyFor(item.id)} onAdd={() => handleAdd(item)} />
        )}
        ListEmptyComponent={
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text>
            <Text style={{ color: T.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
              No products yet.{'\n'}Scan a supplier bill to add inventory.
            </Text>
          </View>
        }
      />

      {itemCount > 0 && (
        <Animated.View style={{ position: 'absolute', bottom: insets.bottom + 16, left: 16, right: 16, transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity onPress={() => setShowCart(true)} style={{ backgroundColor: T.saffron, borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, shadowColor: T.saffron, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{itemCount}</Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>{itemCount === 1 ? 'item' : 'items'} in cart</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>{formatINR(total)} →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <CartModal visible={showCart} items={items} total={total} onClose={() => setShowCart(false)} onCheckout={() => { setShowCart(false); setShowPayment(true); }} />
      <PaymentModal visible={showPayment} total={total} items={items} storeConfig={storeConfig} onClose={() => setShowPayment(false)} onSaleComplete={() => { setShowPayment(false); clearCart(); refresh(); }} />
    </View>
  );
}

const POSProductCard = memo(function POSProductCard({ product, cartQty, onAdd }: { product: Product; cartQty: number; onAdd: () => void }) {
  const outOfStock = product.stock === 0;
  const remaining  = product.stock - cartQty;
  const lowStock   = product.stock > 0 && product.stock <= (product.low_stock_threshold ?? 5);
  const cartFull   = cartQty >= product.stock && product.stock > 0;
  return (
    <TouchableOpacity onPress={onAdd} disabled={outOfStock || cartFull} activeOpacity={0.75} style={{ flex: 1, backgroundColor: T.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: outOfStock ? '#F5C6C2' : lowStock ? '#FFE4B0' : T.border, opacity: (outOfStock || cartFull) ? 0.5 : 1, minHeight: 120 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: T.textPrimary, lineHeight: 18, marginBottom: 8 }} numberOfLines={2}>{product.name}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: T.green, marginBottom: 6 }}>{formatINR(product.sell_price)}</Text>
      <View style={{ backgroundColor: outOfStock ? T.redBg : cartFull ? T.bg : lowStock ? T.amberBg : T.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: outOfStock ? T.red : cartFull ? T.textMuted : lowStock ? T.amber : T.textMuted }}>
          {outOfStock ? 'Out of stock' : cartFull ? 'Max in cart' : cartQty > 0 ? `${remaining} left · ${cartQty} in cart` : lowStock ? `Only ${product.stock} left` : `${product.stock} in stock`}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

function CartModal({ visible, items, total, onClose, onCheckout }: { visible: boolean; items: CartItem[]; total: number; onClose: () => void; onCheckout: () => void; }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20, maxHeight: '78%' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: T.textPrimary }}>Cart · {items.reduce((s, i) => s + i.qty, 0)} items</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: T.textSec, fontSize: 18, lineHeight: 22 }}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <View key={item.product.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderColor: T.border }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: T.textPrimary, fontSize: 14, fontWeight: '500' }}>{item.product.name}</Text>
                  <Text style={{ color: T.textMuted, fontSize: 12, marginTop: 3 }}>×{item.qty} · {formatINR(item.product.sell_price)} each</Text>
                </View>
                <Text style={{ color: T.textPrimary, fontWeight: '700', fontSize: 15 }}>{formatINR(item.qty * item.product.sell_price)}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 20, paddingTop: 14, borderTopWidth: 0.5, borderColor: T.border }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: T.textSec }}>Total</Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: T.green }}>{formatINR(total)}</Text>
          </View>
          <TouchableOpacity onPress={onCheckout} style={{ backgroundColor: T.saffron, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Proceed to Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', padding: 12 }}>
            <Text style={{ color: T.textSec, fontSize: 14 }}>Continue shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PaymentModal({ visible, total, items, storeConfig, onClose, onSaleComplete }: { visible: boolean; total: number; items: CartItem[]; storeConfig: { upiVpa: string; storeName: string }; onClose: () => void; onSaleComplete: () => void; }) {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<'upi' | 'cash'>('upi');
  const [saving, setSaving] = useState(false);
  const [txnId]  = useState(() => generateTransactionId());
  const upiValue = generateQRValue({ vpa: storeConfig.upiVpa, name: storeConfig.storeName, amount: total, description: 'BharatShop sale', transactionId: txnId });

  async function confirmSale() {
    setSaving(true);
    try {
      const saleItems = items.map(i => ({ product_id: i.product.id, name: i.product.name, qty: i.qty, sell_price: i.product.sell_price }));
      await recordSale(saleItems, method, method === 'upi' ? txnId : undefined);
      await trackSaleCompleted(total, method, items.reduce((s, i) => s + i.qty, 0));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaleComplete();
    } catch (e) {
      Alert.alert('Sale Failed', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: 13, color: T.textMuted, textAlign: 'center', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 }}>COLLECT PAYMENT</Text>
          <Text style={{ fontSize: 36, fontWeight: '700', color: T.green, textAlign: 'center', marginBottom: 20 }}>{formatINR(total)}</Text>
          <View style={{ flexDirection: 'row', backgroundColor: T.bg, borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 0.5, borderColor: T.border }}>
            {(['upi', 'cash'] as const).map(m => (
              <TouchableOpacity key={m} onPress={async () => { setMethod(m); await Haptics.selectionAsync(); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: method === m ? T.surface : 'transparent', alignItems: 'center', borderWidth: method === m ? 0.5 : 0, borderColor: T.border }}>
                <Text style={{ color: method === m ? T.textPrimary : T.textMuted, fontWeight: '600', fontSize: 15 }}>{m === 'upi' ? '📱  UPI' : '💵  Cash'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {method === 'upi' && (
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 0.5, borderColor: T.border }}>
                <QRCode value={upiValue} size={180} />
              </View>
              <Text style={{ color: T.textSec, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                Paying to <Text style={{ color: T.saffron, fontWeight: '600' }}>{storeConfig.upiVpa}</Text>
              </Text>
              <Text style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>Ref: {txnId}</Text>
            </View>
          )}
          {method === 'cash' && (
            <View style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 8 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: T.greenBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 36 }}>💵</Text>
              </View>
              <Text style={{ color: T.textSec, fontSize: 16, textAlign: 'center', fontWeight: '500' }}>Collect {formatINR(total)} in cash</Text>
            </View>
          )}
          <TouchableOpacity onPress={confirmSale} disabled={saving} style={{ backgroundColor: T.green, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 8, opacity: saving ? 0.65 : 1 }}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>✓  Sale Complete</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', padding: 12 }}>
            <Text style={{ color: T.textSec, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
