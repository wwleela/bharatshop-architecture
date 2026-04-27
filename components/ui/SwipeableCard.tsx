import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  PanResponder, Animated, TouchableOpacity,
} from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/Theme';
import { ScannedProduct } from '@/types';
import { formatINR } from '@/services/UPIService';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

interface Props {
  data: ScannedProduct[];
  onSwipeRight: (item: ScannedProduct) => void;
  onSwipeLeft: (item: ScannedProduct) => void;
  timer?: number;
}

export default function SwipeableCard({ data, onSwipeRight, onSwipeLeft, timer = 3 }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timer);
  const position = useRef(new Animated.ValueXY()).current;
  const timerRef = useRef<any>(null);

  const currentItem = data[currentIndex];

  useEffect(() => {
    if (!currentItem) return;

    // Reset timer for each new card
    setTimeLeft(timer);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSwipeRight(); // Auto-confirm
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, currentItem]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          handleSwipeRight();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          handleSwipeLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const handleSwipeRight = () => {
    if (!currentItem) return;
    Animated.timing(position, {
      toValue: { x: width + 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onSwipeRight(currentItem);
      nextCard();
    });
  };

  const handleSwipeLeft = () => {
    if (!currentItem) return;
    Animated.timing(position, {
      toValue: { x: -width - 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onSwipeLeft(currentItem);
      nextCard();
    });
  };

  const nextCard = () => {
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex((prev) => prev + 1);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  if (!currentItem) return null;

  const rotation = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate: rotation },
            ],
          },
        ]}
      >
        <View style={styles.timerBarContainer}>
          <Animated.View 
            style={[
              styles.timerBar, 
              { width: `${(timeLeft / timer) * 100}%` }
            ]} 
          />
        </View>

        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: getConfidenceColor(currentItem.confidence) }]} />
          <Text style={styles.category}>{currentItem.category.toUpperCase()}</Text>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>

        <Text style={styles.name}>{currentItem.name}</Text>
        
        <View style={styles.detailsRow}>
          <View>
            <Text style={styles.label}>QUANTITY</Text>
            <Text style={styles.value}>{currentItem.quantity}</Text>
          </View>
          <View>
            <Text style={styles.label}>COST PRICE</Text>
            <Text style={styles.value}>{formatINR(currentItem.cost_price)}</Text>
          </View>
          <View>
            <Text style={styles.label}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatINR(currentItem.quantity * currentItem.cost_price)}</Text>
          </View>
        </View>

        {currentItem.tax_breakdown && (
          <View style={styles.taxRow}>
            <Text style={styles.taxText}>
              GST ({currentItem.gst_rate}%): CGST {formatINR(currentItem.tax_breakdown.cgst)} + SGST {formatINR(currentItem.tax_breakdown.sgst)}
            </Text>
          </View>
        )}

        <View style={styles.hintRow}>
          <Text style={styles.hintText}>← Swipe Left to Edit</Text>
          <Text style={styles.hintText}>Swipe Right to Confirm →</Text>
        </View>
      </Animated.View>
      
      <Text style={styles.remainingText}>
        {data.length - currentIndex} items remaining
      </Text>
    </View>
  );
}

function getConfidenceColor(conf: string) {
  if (conf === 'high') return Colors.emerald;
  if (conf === 'medium') return Colors.amber;
  return Colors.crimson;
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
  },
  card: {
    width: width - Spacing[8],
    backgroundColor: '#1C1C1E',
    borderRadius: Radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  timerBarContainer: {
    height: 4,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    backgroundColor: Colors.amber,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
    flex: 1,
  },
  timerText: {
    fontSize: 12,
    color: Colors.amber,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.emerald,
  },
  taxRow: {
    marginTop: -16,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 8,
  },
  taxText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  hintText: {
    fontSize: 10,
    color: '#48484A',
    fontWeight: '600',
  },
  remainingText: {
    marginTop: 20,
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
});
