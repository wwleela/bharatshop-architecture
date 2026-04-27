import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/Theme';

const { width } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function LoadingScreen({ onFinish }: Props) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence: Fade in logo → Wait → Fade out entire screen
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
      Animated.delay(1500),
      Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      onFinish();
    });
  }, [fadeAnim, logoOpacity, scaleAnim, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }], opacity: logoOpacity }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.logoEmoji}>🛍️</Text>
        </View>
        <Text style={styles.brandName}>BharatShop</Text>
        <Text style={styles.tagline}>Smart Kirana OS</Text>
      </Animated.View>
      
      <View style={styles.footer}>
        <View style={styles.progressBar}>
          <Animated.View style={styles.progressFill} />
        </View>
        <Text style={styles.footerText}>Powering Digital India</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.amber,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 48,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Colors.amber,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    width: width * 0.4,
    height: 3,
    backgroundColor: '#2A2A2A',
    borderRadius: 1.5,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.amber,
    width: '100%',
  },
  footerText: {
    fontSize: 11,
    color: '#555555',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
