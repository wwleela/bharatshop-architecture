// app/(tabs)/index.tsx — BharatShop Insights · v2 2026
// Now reads store city/coords from config for location-aware trends

import { useRef, useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router }           from 'expo-router';
import { useDailyBriefing } from '@/hooks/useDailyBriefing';
import { useInventory }     from '@/hooks/useInventory';
import { useAuth }          from '@/context/AuthContext';
import { BriefingCard }     from '@/components/cards/BriefingCard';
import LoadingScreen        from '@/components/LoadingScreen';
import { formatINR }        from '@/services/UPIService';
import { getStoreConfig }   from '@/app/settings';

const T = {
  bg:         '#F7F7F5',
  surface:    '#FFFFFF',
  border:     '#EBEBEB',
  text:       '#111111',
  textSec:    '#555555',
  textMuted:  '#999999',
  saffron:    '#E8771A',
  saffronBg:  '#FEF3E8',
  green:      '#1A7A4A',
  greenBg:    '#E8F5EE',
  red:        '#C0392B',
  redBg:      '#FDECEA',
};

function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function InsightsTab() {
  const insets = useSafeAreaInsets();
  const { briefing, loading: briefingLoading, refresh } = useDailyBriefing();
  const { products } = useInventory();
  
  const [showSplash, setShowSplash] = useState(true);

  const totalProducts = products.length;
  const revenue = briefing?.todaySalesTotal ?? 0;
  const lowStockProducts = briefing?.lowStockProducts ?? [];

  // Load store location from settings
  const [city, setCity] = useState<string | null>(null);
  const [locationSet, setLocationSet] = useState(false);
  useEffect(() => {
    getStoreConfig().then(cfg => {
      setCity(cfg.city);
      setLocationSet(cfg.lat !== null);
    });
  }, []);

  if (briefingLoading && !briefing) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={T.saffron} size="large" />
        <Text style={{ color: T.textMuted, marginTop: 14, fontSize: 14 }}>Loading your briefing…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {showSplash && <LoadingScreen onFinish={() => setShowSplash(false)} />}
      
      <ScrollView
        style={{ flex: 1, backgroundColor: T.bg }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
        }}
        refreshControl={
          <RefreshControl refreshing={briefingLoading} onRefresh={refresh} tintColor={T.saffron} progressViewOffset={insets.top} />
        }
      >
      {/* ── Header ── */}
      <FadeIn delay={0}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 11, color: T.textMuted, fontWeight: '500', letterSpacing: 0.6, marginBottom: 4 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
              {city ? `  ·  ${city.toUpperCase()}` : ''}
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: T.text, lineHeight: 32 }}>
              {greeting()} 🙏
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={{
              width: 40, height: 40, backgroundColor: T.surface,
              borderRadius: 20, borderWidth: 0.5, borderColor: T.border,
              alignItems: 'center', justifyContent: 'center', marginTop: 4,
            }}
          >
            <Text style={{ fontSize: 17 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </FadeIn>

      {/* ── Location prompt if not set ── */}
      {!locationSet && (
        <FadeIn delay={30}>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: T.saffronBg, borderRadius: 12,
              padding: 12, marginBottom: 12,
              borderWidth: 0.5, borderColor: '#F5C99A',
            }}
          >
            <Text style={{ fontSize: 14 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: T.saffron }}>
                Set your store location
              </Text>
              <Text style={{ fontSize: 12, color: '#C45A0A' }}>
                Tap to enable location-aware product trends
              </Text>
            </View>
            <Text style={{ color: T.saffron, fontSize: 16 }}>→</Text>
          </TouchableOpacity>
        </FadeIn>
      )}

      {/* ── Revenue card ── */}
      <FadeIn delay={60}>
        <View style={{ backgroundColor: T.surface, borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: T.border, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, color: T.textMuted, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8 }}>TODAY'S REVENUE</Text>
          <Text style={{ fontSize: 38, fontWeight: '700', color: revenue > 0 ? T.green : T.text, lineHeight: 44, marginBottom: 8 }}>
            {formatINR(revenue)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: totalProducts > 0 ? T.greenBg : T.saffronBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: totalProducts > 0 ? T.green : T.saffron }}>
                {totalProducts > 0 ? `${totalProducts} products` : 'No products yet'}
              </Text>
            </View>
            {totalProducts === 0 && <Text style={{ fontSize: 12, color: T.textMuted }}>— scan a bill to start</Text>}
          </View>
        </View>
      </FadeIn>

      {/* ── Low stock alert ── */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <FadeIn delay={100}>
          <View style={{ backgroundColor: T.redBg, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#F5C6C2', marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: T.red, marginBottom: 10, letterSpacing: 0.4 }}>
              ⚠ LOW STOCK · {lowStockProducts.length} item{lowStockProducts.length !== 1 ? 's' : ''}
            </Text>
            {lowStockProducts.slice(0, 3).map((item: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: i > 0 ? 0.5 : 0, borderColor: '#F5C6C2' }}>
                <Text style={{ fontSize: 13, color: T.text, flex: 1 }}>{item.name}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: T.red }}>{item.stock} left</Text>
              </View>
            ))}
          </View>
        </FadeIn>
      )}

      {/* ── Daily briefing card ── */}
      {briefing && (
        <FadeIn delay={140}>
          <BriefingCard briefing={briefing} style={{ marginBottom: 12 }} />
        </FadeIn>
      )}

      {/* ── Quick actions ── */}
      <FadeIn delay={180}>
        <Text style={{ fontSize: 11, color: T.textMuted, fontWeight: '600', letterSpacing: 0.7, marginBottom: 10, marginTop: 4 }}>QUICK ACTIONS</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <QuickAction emoji="📷" label="Scan Bill" sublabel="Add inventory" onPress={() => router.push('/(tabs)/scanner')} accent={T.saffron} accentBg={T.saffronBg} />
          <QuickAction emoji="🧾" label="Make a Sale" sublabel="Open POS" onPress={() => router.push('/(tabs)/pos')} accent={T.green} accentBg={T.greenBg} />
        </View>
      </FadeIn>
    </ScrollView>
    </View>
  );
}

function QuickAction({ emoji, label, sublabel, onPress, accent, accentBg }: {
  emoji: string; label: string; sublabel: string; onPress: () => void; accent: string; accentBg: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72} style={{ flex: 1, backgroundColor: T.surface, borderRadius: 16, padding: 16, alignItems: 'flex-start', borderWidth: 0.5, borderColor: T.border, minHeight: 110 }}>
      <View style={{ width: 40, height: 40, backgroundColor: accentBg, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: '700', color: accent, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: T.textMuted }}>{sublabel}</Text>
    </TouchableOpacity>
  );
}
