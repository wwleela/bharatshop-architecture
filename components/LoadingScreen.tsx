/**
 * BharatShop OS — LoadingScreen.tsx
 * Branded animated loading screen.
 * Use as the splash/loading overlay in your root layout.
 *
 * Usage:
 *   import LoadingScreen from '@/components/LoadingScreen';
 *   {loading && <LoadingScreen />}
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  Dimensions, StatusBar,
} from 'react-native';
import Svg, { Circle, Path, Rect, Line, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ── BharatShop Logo SVG ───────────────────────────────────────────────────────
function BSLogo({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* Background circle */}
      <Circle cx="100" cy="100" r="90" fill="#0C1428" />
      {/* Store arch */}
      <Path
        d="M55 130 L55 90 Q55 60 100 60 Q145 60 145 90 L145 130 Z"
        fill="none"
        stroke="#3DEBA0"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Door */}
      <Rect x="85" y="105" width="30" height="25" rx="4" fill="#3DEBA0" opacity={0.9} />
      {/* AI scan lines */}
      <Line x1="62" y1="88" x2="138" y2="88" stroke="#3DEBA0" strokeWidth="1.5" strokeDasharray="5,4" opacity={0.5} />
      <Line x1="62" y1="100" x2="138" y2="100" stroke="#3DEBA0" strokeWidth="1.5" strokeDasharray="5,4" opacity={0.25} />
      {/* Gemini node */}
      <Circle cx="100" cy="60" r="5" fill="#3DEBA0" />
      <Circle cx="100" cy="60" r="10" fill="none" stroke="#3DEBA0" strokeWidth="1" opacity={0.35} />
      {/* Monogram */}
      <SvgText
        x="100" y="97"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="20"
        fontWeight="700"
        fill="#ffffff"
      >
        BS
      </SvgText>
    </Svg>
  );
}

// ── Loading bar ───────────────────────────────────────────────────────────────
function LoadingBar({ progress }: { progress: Animated.Value }) {
  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  return (
    <View style={styles.barWrap}>
      <Animated.View style={[styles.barFill, { width: barWidth }]} />
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  onFinish?: () => void;
  duration?: number;
}

export default function LoadingScreen({ onFinish, duration = 2000 }: Props) {
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequence: logo in → text in → progress bar → fade out
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, tension: 80, friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Text entrance
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1, duration: 300, delay: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tagOpacity, {
          toValue: 1, duration: 300, delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Progress bar
      Animated.timing(progress, {
        toValue: 1, duration: duration - 800,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      // Hold briefly
      Animated.delay(150),
      // Fade out
      Animated.timing(containerOpacity, {
        toValue: 0, duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => onFinish?.());

    // Subtle logo pulse throughout
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#060810" />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        <BSLogo size={80} />
      </Animated.View>

      {/* Brand name */}
      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.brandName}>
          <Text style={styles.brandNameWhite}>Bharat</Text>
          <Text style={styles.brandNameGreen}>Shop</Text>
          <Text style={styles.brandNameWhite}> OS</Text>
        </Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: tagOpacity }}>
        <Text style={styles.tagline}>AI · KIRANA · ZERO-ENTRY</Text>
      </Animated.View>

      {/* Progress bar */}
      <View style={{ marginTop: 28 }}>
        <LoadingBar progress={progress} />
      </View>

      {/* Subtle bottom hint */}
      <Animated.Text style={[styles.bottomHint, { opacity: tagOpacity }]}>
        Powered by Gemini 2.5 Flash
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    inset: 0,
    flex: 1,
    backgroundColor: '#060810',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoWrap: {
    marginBottom: 20,
    shadowColor: '#3DEBA0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  brandNameWhite: {
    color: '#EAE8E2',
  },
  brandNameGreen: {
    color: '#3DEBA0',
  },
  tagline: {
    fontSize: 11,
    color: '#6B6A64',
    letterSpacing: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
  barWrap: {
    width: 120,
    height: 2,
    backgroundColor: '#1A1F35',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 2,
    backgroundColor: '#3DEBA0',
    borderRadius: 2,
  },
  bottomHint: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: '#3A3935',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
});
