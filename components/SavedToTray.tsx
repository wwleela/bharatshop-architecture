/**
 * BharatShop OS — SavedToTray.tsx
 *
 * The "Saved to Tray" delight moment.
 * Shows when a bill is captured — online OR offline.
 * The user gets immediate feedback. Gemini does the work in background.
 *
 * Usage:
 *   const [showTray, setShowTray] = useState(false);
 *   <SavedToTray visible={showTray} billCount={queueStatus.pending} />
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

interface Props {
  visible: boolean;
  billCount?: number;
  isOnline?: boolean;
  onHide?: () => void;
}

export default function SavedToTray({
  visible,
  billCount = 1,
  isOnline = true,
  onHide,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Slide up + fade in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      // Check mark pops in with spring
      Animated.spring(checkScale, {
        toValue: 1, delay: 150,
        tension: 120, friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 2.5s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0, duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10, duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide?.();
        // Reset for next use
        checkScale.setValue(0);
        translateY.setValue(20);
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.container,
      { opacity, transform: [{ translateY }] },
    ]}>
      {/* Check mark */}
      <Animated.View style={[
        styles.checkWrap,
        { transform: [{ scale: checkScale }] },
      ]}>
        <Text style={styles.checkIcon}>✓</Text>
      </Animated.View>

      {/* Message */}
      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {isOnline ? 'Processing...' : 'Saved to Tray'}
        </Text>
        <Text style={styles.sub}>
          {isOnline
            ? 'Gemini is reading the bill'
            : `${billCount} bill${billCount !== 1 ? 's' : ''} queued · will sync when online`}
        </Text>
      </View>

      {/* Sync indicator for offline */}
      {!isOnline && (
        <View style={styles.offlinePill}>
          <Text style={styles.offlinePillText}>○ offline</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#131728',
    borderWidth: 1,
    borderColor: 'rgba(61,235,160,0.25)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#3DEBA0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
    maxWidth: 300,
  },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(61,235,160,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(61,235,160,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkIcon: {
    fontSize: 13,
    color: '#3DEBA0',
    fontWeight: '700',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EAE8E2',
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    color: '#6B6A64',
    lineHeight: 15,
  },
  offlinePill: {
    backgroundColor: 'rgba(245,166,35,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  offlinePillText: {
    fontSize: 9,
    color: '#F5A623',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
