// app/(tabs)/scanner.tsx — The Eye · P4 Final (patched)
// FIXES: removed dead Animated import, SDK 51 'facing' prop via useCamera hook
// POLISH: animated scan line during 'scanning' stage, smoother transitions

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Alert, Animated, StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { CameraView } from 'expo-camera';

import { useCamera }          from '@/hooks/useCamera';
import { scanBillBase64 }      from '@/services/GeminiService';
import { enqueueBill }         from '@/services/OfflineQueueService';
import { addScannedProducts } from '@/services/SupabaseService';
import {
  trackBillScanned, trackScanFailed, trackManualEntry,
} from '@/services/MixpanelService';
import { ScannedProduct }                            from '@/types';
import { Colors, TouchTargets, Spacing, Radius }     from '@/constants/Theme';
import { formatINR }                                 from '@/services/UPIService';
import SavedToTray                                   from '@/components/SavedToTray';
import SwipeableCard                                 from '@/components/ui/SwipeableCard';
import Toggle                                        from '@/components/ui/Toggle';

type ScanStage = 'camera' | 'scanning' | 'results' | 'manual' | 'saving' | 'done';

const CONFIDENCE_COLOR: Record<'high' | 'medium' | 'low', string> = {
  high:   Colors.emerald,
  medium: Colors.amber,
  low:    Colors.crimson,
};

// Animated scan line that sweeps during 'scanning' stage
function ScanLine() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 80] });

  return (
    <Animated.View style={{
      position: 'absolute', left: 2, right: 2,
      height: 2, borderRadius: 1,
      backgroundColor: Colors.amber,
      opacity: 0.85,
      transform: [{ translateY }],
      // reason: inline for tightly coupled animation value
      shadowColor: Colors.amber, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
    }} />
  );
}

export default function ScannerTab() {
  const cam = useCamera();
  const [stage,    setStage]    = useState<ScanStage>('camera');
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [latency,  setLatency]  = useState<number | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [showTray, setShowTray] = useState(false);

  // ── Capture → Offline Queue (Outbox pattern) ────────────────
  const handleCapture = useCallback(async () => {
    setError(null);
    setLatency(null);
    setStage('scanning');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const base64 = await cam.capture();
    if (!base64) {
      setError('Camera capture failed. Try again.');
      setStage('camera');
      return;
    }

    try {
      // ENQUEUE: This works offline and returns immediately
      await enqueueBill(base64);
      
      // Feedback UX: Show "Saved to Tray" animation
      setShowTray(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Wait for animation, then reset to camera for next snap
      setTimeout(() => {
        setShowTray(false);
        setStage('camera');
      }, 2000);

    } catch (e) {
      setError('Failed to save to outbox. Check storage.');
      setStage('camera');
    }
  }, [cam]);

  // ── Confirm → save to Supabase ─────────────────────────────
  const handleConfirm = useCallback(async () => {
    const valid = products.filter(p => p.name.trim());
    if (valid.length === 0) return;
    setStage('saving');
    try {
      await addScannedProducts(valid);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProducts(valid);
      setStage('done');
    } catch (e) {
      Alert.alert('Save Failed', (e as Error).message);
      setStage('results');
    }
  }, [products]);

  const updateProduct = useCallback((i: number, field: keyof ScannedProduct, v: string | number) => {
    setProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: v } : p));
  }, []);

  const removeProduct = useCallback((i: number) => {
    setProducts(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const resetToCamera = useCallback(() => {
    setStage('camera');
    setProducts([]);
    setError(null);
  }, []);

  const goManual = useCallback(async () => {
    await trackManualEntry(0);
    setProducts([]);
    setStage('manual');
  }, []);

  const confirmItem = useCallback((item: ScannedProduct) => {
    console.log('Confirmed:', item.name);
  }, []);

  const manualEditItem = useCallback((item: ScannedProduct) => {
    setProducts([item]);
    setStage('manual');
  }, []);

  // ── Permission gate ─────────────────────────────────────────
  if (!cam.hasPermission) {
    return (
      <View style={{
        flex: 1, backgroundColor: Colors.background,
        alignItems: 'center', justifyContent: 'center', padding: 28,
      }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: '#12100A',
          borderWidth: 1.5, borderColor: Colors.amber,
          alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <Text style={{ fontSize: 36 }}>📷</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 10 }}>
          Camera Access Needed
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          BharatShop needs camera access to scan supplier bills — no typing needed.
        </Text>
        <TouchableOpacity
          onPress={cam.requestPermission}
          style={{
            backgroundColor: Colors.amber, borderRadius: Radius.lg,
            paddingHorizontal: 28, height: TouchTargets.standard,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: Colors.textInverse, fontWeight: '700', fontSize: 16 }}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Done screen ─────────────────────────────────────────────
  if (stage === 'done') {
    return (
      <View style={{
        flex: 1, backgroundColor: Colors.background,
        alignItems: 'center', justifyContent: 'center', padding: 28,
      }}>
        <View style={{
          width: 88, height: 88, borderRadius: 44,
          backgroundColor: '#0A1A0E',
          borderWidth: 1.5, borderColor: Colors.emerald,
          alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.emerald, marginBottom: 8 }}>
          Inventory Updated!
        </Text>
        <Text style={{ fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 6 }}>
          {products.length} product{products.length !== 1 ? 's' : ''} added to your store.
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 36 }}>
          Stock levels updated across all devices.
        </Text>
        <TouchableOpacity
          onPress={resetToCamera}
          style={{
            backgroundColor: Colors.amber, borderRadius: Radius.lg,
            paddingHorizontal: 28, height: TouchTargets.standard,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: Colors.textInverse, fontWeight: '700', fontSize: 16 }}>
            Scan Another Bill
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Results / Manual entry ──────────────────────────────────
  if (stage === 'results' || stage === 'manual' || stage === 'saving') {
    const isManual   = stage === 'manual';
    const validCount = products.filter(p => p.name.trim()).length;

    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{
          paddingHorizontal: Spacing[4], paddingTop: 56, paddingBottom: Spacing[3],
          borderBottomWidth: 0.5, borderColor: Colors.border,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary }}>
              {isManual ? '✍️ Manual Entry' : `📋 ${products.length} item${products.length !== 1 ? 's' : ''} found`}
            </Text>
            {latency && !isManual && (
              <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                {(latency / 1000).toFixed(1)}s
              </Text>
            )}
          </View>
          {isManual && (
            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>
              {error || "Couldn't read the bill. Enter items below."}
            </Text>
          )}
          {!isManual && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {(['high', 'medium', 'low'] as const).map(conf => {
                const count = products.filter(p => p.confidence === conf).length;
                if (!count) return null;
                return (
                  <View key={conf} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: CONFIDENCE_COLOR[conf] }} />
                    <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                      {count} {conf}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          {!isManual ? (
            <SwipeableCard
              data={products}
              onSwipeRight={confirmItem}
              onSwipeLeft={manualEditItem}
              timer={3}
            />
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing[4] }}>
              {products.map((p, i) => (
                <ProductRow
                  key={i} product={p} index={i}
                  onUpdate={updateProduct} onRemove={removeProduct}
                />
              ))}

              <TouchableOpacity
                onPress={() => setProducts(prev => [...prev, {
                  name: '', quantity: 1, cost_price: 0, total: 0,
                  category: 'other', confidence: 'low',
                }])}
                style={{
                  borderWidth: 1, borderColor: Colors.border,
                  borderStyle: 'dashed', borderRadius: Radius.lg,
                  padding: 14, alignItems: 'center', marginBottom: Spacing[4],
                }}
              >
                <Text style={{ color: Colors.textMuted, fontSize: 14 }}>+ Add item</Text>
              </TouchableOpacity>
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </View>

        <View style={{
          padding: Spacing[4], borderTopWidth: 0.5, borderColor: Colors.border,
          backgroundColor: Colors.surface,
        }}>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={stage === 'saving' || validCount === 0}
            style={{
              backgroundColor: Colors.emerald,
              borderRadius: Radius.lg, height: TouchTargets.standard,
              alignItems: 'center', justifyContent: 'center',
              opacity: (stage === 'saving' || validCount === 0) ? 0.5 : 1,
              marginBottom: 10,
            }}
          >
            {stage === 'saving'
              ? <ActivityIndicator color={Colors.textInverse} />
              : <Text style={{ color: Colors.textInverse, fontSize: 16, fontWeight: '700' }}>
                  ✓ Add {validCount} item{validCount !== 1 ? 's' : ''} to Inventory
                </Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={resetToCamera} style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>← Scan again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Camera view (SDK 51 — CameraView with 'facing' prop) ────
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        ref={cam.cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={cam.flash}
      />

      {/* Overlay container for all camera UI elements */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Saved to Tray Success Overlay */}
        <SavedToTray 
          visible={showTray} 
          onHide={() => setShowTray(false)} 
          isOnline={false} // scanner handles offline outbox
        />

        {/* Scanning overlay */}
        {stage === 'scanning' && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.42)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <ActivityIndicator color={Colors.amber} size="large" />
            <Text style={{ color: '#fff', fontSize: 15, marginTop: 16, fontWeight: '600' }}>
              Reading bill with AI…
            </Text>
          </View>
        )}

        {/* Reticle + scan line */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 288, height: 192, position: 'relative', overflow: 'hidden' }}>
            {/* Main border */}
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              borderWidth: 1.5, borderColor: `${Colors.amber}66`,
              borderRadius: Radius.md,
            }} />

            {/* Animated scan line (only during scanning) */}
            {stage === 'scanning' && <ScanLine />}

            {/* Corner accents */}
            {[
              { top: -1, left: -1,   borderTopWidth: 2.5,    borderLeftWidth: 2.5 },
              { top: -1, right: -1,  borderTopWidth: 2.5,    borderRightWidth: 2.5 },
              { bottom: -1, left: -1, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
              { bottom: -1, right: -1, borderBottomWidth: 2.5, borderRightWidth: 2.5 },
            ].map((pos, i) => (
              <View key={i} style={[{
                position: 'absolute', width: 22, height: 22,
                borderColor: Colors.amber,
                borderTopWidth: 0, borderBottomWidth: 0,
                borderLeftWidth: 0, borderRightWidth: 0,
                borderRadius: 2,
              }, pos]} />
            ))}
          </View>
          <Text style={{
            color: 'rgba(255,255,255,0.60)', fontSize: 13,
            marginTop: 18, textAlign: 'center',
          }}>
            {stage === 'scanning' ? '' : 'Align supplier bill within frame'}
          </Text>
        </View>

        {/* Error toast */}
        {error && (
          <View style={{
            position: 'absolute', top: 60, left: 20, right: 20,
            backgroundColor: Colors.crimson, borderRadius: Radius.md, padding: 12,
          }}>
            <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        {/* Capture bar */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingBottom: 42, paddingHorizontal: 32, alignItems: 'center',
        }}>
          {stage !== 'scanning' && (
            <>
              {/* Hero capture button */}
              <TouchableOpacity
                onPress={handleCapture}
                style={{
                  width: TouchTargets.hero, height: TouchTargets.hero,
                  borderRadius: TouchTargets.hero / 2,
                  backgroundColor: Colors.amber,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: Colors.amber, shadowOpacity: 0.6,
                  shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
                  elevation: 16,
                }}
              >
                <Text style={{ fontSize: 32 }}>📷</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', marginTop: 22, gap: 40, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={cam.toggleFlash}
                  style={{
                    alignItems: 'center',
                    minWidth: TouchTargets.minimum, minHeight: TouchTargets.minimum,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>
                    {cam.flash === 'on' ? '⚡' : '🔦'}
                  </Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 10, marginTop: 2 }}>
                    {cam.flash === 'on' ? 'Flash on' : 'Flash off'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goManual}
                  style={{ minWidth: TouchTargets.minimum, minHeight: TouchTargets.minimum, justifyContent: 'center' }}
                >
                  <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>Type manually</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Product row ───────────────────────────────────────────────
function ProductRow({ product, index: i, onUpdate, onRemove }: {
  product: ScannedProduct; index: number;
  onUpdate: (i: number, f: keyof ScannedProduct, v: string | number) => void;
  onRemove: (i: number) => void;
}) {
  const [gstIncluded, setGstIncluded] = useState(!!product.gst_rate);

  return (
    <View style={{
      backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14,
      borderWidth: 0.5, borderColor: Colors.border, marginBottom: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: CONFIDENCE_COLOR[product.confidence], marginRight: 8,
        }} />
        <TextInput
          value={product.name}
          onChangeText={v => onUpdate(i, 'name', v)}
          placeholder="Product name"
          placeholderTextColor={Colors.textMuted}
          style={{ flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '600' }}
        />
        <TouchableOpacity onPress={() => onRemove(i)} style={{ padding: 6 }}>
          <Text style={{ color: Colors.crimson, fontSize: 22, lineHeight: 24 }}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'QTY',    field: 'quantity'   as const, value: String(product.quantity),   kb: 'number-pad'  as const },
          { label: 'COST ₹', field: 'cost_price' as const, value: String(product.cost_price), kb: 'decimal-pad' as const },
        ].map(({ label, field, value, kb }) => (
          <View key={field} style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 }}>
              {label}
            </Text>
            <TextInput
              value={value}
              onChangeText={v => onUpdate(
                i, field,
                field === 'quantity' ? (parseInt(v, 10) || 1) : (parseFloat(v) || 0),
              )}
              keyboardType={kb}
              style={{
                color: Colors.textPrimary, fontSize: 16, fontWeight: '600',
                borderBottomWidth: 0.5, borderColor: Colors.border, paddingBottom: 4,
              }}
            />
          </View>
        ))}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 }}>
            TOTAL
          </Text>
          <Text style={{ fontSize: 15, color: Colors.textSecondary, paddingBottom: 4, paddingTop: 2 }}>
            {formatINR(product.quantity * product.cost_price)}
          </Text>
        </View>
      </View>

      <View style={{ borderTopWidth: 0.5, borderColor: Colors.border, paddingTop: 8 }}>
        <Toggle 
          label="Include GST?" 
          value={gstIncluded} 
          onChange={(val) => {
            setGstIncluded(val);
            if (!val) onUpdate(i, 'gst_rate', 0);
          }} 
        />
        {gstIncluded && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 10, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 }}>
              GST % (CGST + SGST)
            </Text>
            <TextInput
              value={String(product.gst_rate || 18)}
              onChangeText={v => onUpdate(i, 'gst_rate', parseFloat(v) || 0)}
              keyboardType="number-pad"
              style={{
                color: Colors.textPrimary, fontSize: 14, fontWeight: '600',
                borderBottomWidth: 0.5, borderColor: Colors.border, paddingBottom: 4,
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}
