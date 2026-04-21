// app/(tabs)/_layout.tsx — BharatShop OS 2026
// Modern SVG icons — no emoji, clean presentation-ready design

import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { useAuth } from '@/context/AuthContext';

const SAFFRON = '#E8771A';
const MUTED   = '#AAAAAA';
const WHITE   = '#FFFFFF';

// ── SVG Icons ────────────────────────────────────────────────

function InsightsIcon({ focused }: { focused: boolean }) {
  const c = focused ? SAFFRON : MUTED;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3}  y={12} width={4} height={9} rx={1} fill={c} opacity={focused ? 1 : 0.6} />
      <Rect x={10} y={7}  width={4} height={14} rx={1} fill={c} opacity={focused ? 1 : 0.6} />
      <Rect x={17} y={3}  width={4} height={18} rx={1} fill={c} opacity={focused ? 1 : 0.6} />
    </Svg>
  );
}

function POSIcon({ focused }: { focused: boolean }) {
  const c = focused ? SAFFRON : MUTED;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={2} width={16} height={20} rx={2} stroke={c} strokeWidth={1.5} opacity={focused ? 1 : 0.6} />
      <Line x1={8}  y1={8}  x2={16} y2={8}  stroke={c} strokeWidth={1.5} strokeLinecap="round" opacity={focused ? 1 : 0.6} />
      <Line x1={8}  y1={12} x2={16} y2={12} stroke={c} strokeWidth={1.5} strokeLinecap="round" opacity={focused ? 1 : 0.6} />
      <Line x1={8}  y1={16} x2={12} y2={16} stroke={c} strokeWidth={1.5} strokeLinecap="round" opacity={focused ? 1 : 0.6} />
    </Svg>
  );
}

function ScannerIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.scanButton, focused && styles.scanButtonFocused]}>
      <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
        {/* Camera body */}
        <Rect x={3} y={8} width={24} height={17} rx={3} stroke={WHITE} strokeWidth={1.8} />
        {/* Lens */}
        <Circle cx={15} cy={16} r={5} stroke={WHITE} strokeWidth={1.8} />
        <Circle cx={15} cy={16} r={2} fill={WHITE} opacity={0.5} />
        {/* Flash bump */}
        <Rect x={11} y={5} width={8} height={4} rx={1.5} stroke={WHITE} strokeWidth={1.5} />
        {/* Corner viewfinder lines */}
        <Path d="M8 13 L8 11 L10 11" stroke={WHITE} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
        <Path d="M22 13 L22 11 L20 11" stroke={WHITE} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
      </Svg>
    </View>
  );
}

// ── Tab layout ────────────────────────────────────────────────
export default function TabLayout() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [session, loading]);

  if (!session) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarStyle:             styles.tabBar,
        tabBarActiveTintColor:   SAFFRON,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle:        styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:      'Insights',
          tabBarIcon: ({ focused }) => <InsightsIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title:        '',
          tabBarIcon:   ({ focused }) => <ScannerIcon focused={focused} />,
          tabBarStyle:  { ...styles.tabBar, overflow: 'visible' },
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title:      'POS',
          tabBarIcon: ({ focused }) => <POSIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth:  0.5,
    borderTopColor:  '#EBEBEB',
    height:          64,
    paddingBottom:   8,
    paddingTop:      4,
  },
  tabLabel: {
    fontSize:   10,
    fontWeight: '600',
  },
  scanButton: {
    width:           68,
    height:          68,
    borderRadius:    34,
    backgroundColor: SAFFRON,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    24,
    shadowColor:     SAFFRON,
    shadowOpacity:   0.45,
    shadowRadius:    12,
    shadowOffset:    { width: 0, height: -2 },
    elevation:       12,
  },
  scanButtonFocused: {
    shadowOpacity: 0.7,
    shadowRadius:  18,
  },
});
