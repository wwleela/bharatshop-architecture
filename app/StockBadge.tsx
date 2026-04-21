// components/ui/StockBadge.tsx — BharatShop OS 2026
// ─────────────────────────────────────────────────────────────────────────────
// Shows current stock and low-stock threshold at a glance.
// Three visual states:
//   • OUT   stock === 0            → crimson background, "OUT" label
//   • LOW   0 < stock ≤ threshold  → amber background, qty + threshold shown
//   • OK    stock > threshold      → emerald pill, qty only
//
// Usage:
//   <StockBadge stock={product.stock} threshold={product.low_stock_threshold} />
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text } from 'react-native';

interface StockBadgeProps {
  stock:     number;
  threshold?: number;
  /** compact: small pill (for list rows). default: larger card badge */
  compact?:  boolean;
}

type StockState = 'out' | 'low' | 'ok';

function getState(stock: number, threshold: number): StockState {
  if (stock === 0)          return 'out';
  if (stock <= threshold)   return 'low';
  return 'ok';
}

const CONFIG = {
  out: {
    bg:        'bg-crimson',
    text:      'text-white',
    label:     'OUT OF STOCK',
    dot:       'bg-white',
  },
  low: {
    bg:        'bg-amber',
    text:      'text-black',
    label:     'LOW STOCK',
    dot:       'bg-black',
  },
  ok: {
    bg:        'bg-emerald',
    text:      'text-black',
    label:     '',
    dot:       'bg-black',
  },
} as const;

export function StockBadge({ stock, threshold = 5, compact = false }: StockBadgeProps) {
  const state = getState(stock, threshold);
  const cfg   = CONFIG[state];

  if (compact) {
    // Compact pill — for inventory list rows
    return (
      <View className={`flex-row items-center px-2 py-0.5 rounded-full ${cfg.bg}`}>
        {state !== 'ok' && (
          <View className={`w-1.5 h-1.5 rounded-full mr-1 ${cfg.dot}`} />
        )}
        <Text className={`text-xs font-bold ${cfg.text}`}>
          {state === 'out'
            ? 'OUT'
            : state === 'low'
            ? `${stock}/${threshold}`
            : `${stock}`}
        </Text>
      </View>
    );
  }

  // Full badge — for product cards and detail views
  return (
    <View className={`rounded-lg px-3 py-2 ${cfg.bg}`}>
      {/* Top row: qty large */}
      <View className="flex-row items-baseline gap-1">
        <Text className={`text-2xl font-bold ${cfg.text}`}>{stock}</Text>
        {state === 'low' && (
          <Text className={`text-sm ${cfg.text} opacity-70`}>
            / {threshold} min
          </Text>
        )}
        {state === 'ok' && (
          <Text className={`text-sm ${cfg.text} opacity-70`}>in stock</Text>
        )}
      </View>

      {/* Bottom row: status label */}
      {state !== 'ok' && (
        <View className="flex-row items-center mt-0.5 gap-1">
          <View className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <Text className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</Text>
        </View>
      )}

      {/* Threshold hint for low state */}
      {state === 'low' && (
        <Text className={`text-xs mt-1 ${cfg.text} opacity-60`}>
          Reorder when ≤ {threshold} units
        </Text>
      )}
    </View>
  );
}

export default StockBadge;
