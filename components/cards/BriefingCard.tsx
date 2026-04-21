// components/cards/BriefingCard.tsx — BharatShop OS 2026
// Renders the daily briefing: weather, festival alert, demand boost/reduce lists,
// and low-stock product list. Used in the Insights tab.

import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { DailyBriefing } from '@/types';
import { Colors, Radius, Spacing } from '@/constants/Theme';
import { AlertBadge } from '@/components/ui/AlertBadge';

interface BriefingCardProps {
  briefing: DailyBriefing;
  style?:   ViewStyle;
}

export function BriefingCard({ briefing, style }: BriefingCardProps) {
  const {
    weather, festivalToday, upcomingFestival,
    demandBoosts, demandReduces, lowStockProducts,
  } = briefing;

  const weatherEmoji = {
    hot:     '☀️',
    cold:    '🧥',
    monsoon: '🌧️',
    mild:    '🌤️',
  }[weather.condition];

  return (
    <View style={[styles.card, style]}>

      {/* ── Weather row ── */}
      <View style={styles.row}>
        <Text style={styles.weatherEmoji}>{weatherEmoji}</Text>
        <View>
          <Text style={styles.weatherLabel}>TODAY'S WEATHER</Text>
          <Text style={styles.weatherText}>{weather.description}</Text>
        </View>
      </View>

      {/* ── Festival today ── */}
      {festivalToday && (
        <View style={styles.festivalBanner}>
          <Text style={styles.festivalTitle}>
            🪔 {festivalToday.name} · {festivalToday.nameHi}
          </Text>
          <Text style={styles.festivalAlert}>{festivalToday.stockAlert}</Text>
        </View>
      )}

      {/* ── Upcoming festival (next 7 days) ── */}
      {!festivalToday && upcomingFestival && (
        <View style={styles.upcomingRow}>
          <AlertBadge label="UPCOMING" />
          <Text style={styles.upcomingText} numberOfLines={1}>
            {upcomingFestival.name} — stock up: {upcomingFestival.stockAlert}
          </Text>
        </View>
      )}

      {/* ── Demand boosts ── */}
      {demandBoosts.length > 0 && (
        <View style={styles.demandRow}>
          <Text style={styles.demandLabel}>📈 PUSH</Text>
          <Text style={styles.demandItems} numberOfLines={2}>
            {demandBoosts.join(' · ')}
          </Text>
        </View>
      )}

      {/* ── Demand reduces ── */}
      {demandReduces.length > 0 && (
        <View style={styles.demandRow}>
          <Text style={[styles.demandLabel, { color: Colors.textMuted }]}>📉 SLOW</Text>
          <Text style={[styles.demandItems, { color: Colors.textMuted }]} numberOfLines={1}>
            {demandReduces.join(' · ')}
          </Text>
        </View>
      )}

      {/* ── Low stock alert ── */}
      {lowStockProducts.length > 0 && (
        <View style={styles.lowStockSection}>
          <Text style={styles.lowStockTitle}>
            ⚠ {lowStockProducts.length} low-stock item{lowStockProducts.length !== 1 ? 's' : ''}
          </Text>
          {lowStockProducts.slice(0, 3).map(p => (
            <View key={p.id} style={styles.lowStockRow}>
              <Text style={styles.lowStockName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.lowStockQty}>{p.stock} left</Text>
            </View>
          ))}
          {lowStockProducts.length > 3 && (
            <Text style={styles.lowStockMore}>
              +{lowStockProducts.length - 3} more
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    borderWidth:     0.5,
    borderColor:     Colors.border,
    padding:         Spacing[4],
  },
  // Weather
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  Spacing[3],
    gap:           12,
  },
  weatherEmoji: {
    fontSize: 28,
  },
  weatherLabel: {
    fontSize:      10,
    fontWeight:    '700',
    color:         Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom:  2,
  },
  weatherText: {
    fontSize:   14,
    fontWeight: '600',
    color:      Colors.textPrimary,
  },
  // Festival today
  festivalBanner: {
    backgroundColor: '#1A1200',
    borderWidth:     0.5,
    borderColor:     `${Colors.amber}66`,
    borderRadius:    Radius.md,
    padding:         Spacing[3],
    marginBottom:    Spacing[3],
  },
  festivalTitle: {
    fontSize:     13,
    fontWeight:   '700',
    color:        Colors.amber,
    marginBottom: 4,
  },
  festivalAlert: {
    fontSize:  12,
    color:     Colors.textSecondary,
    lineHeight: 18,
  },
  // Upcoming festival
  upcomingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    marginBottom:  Spacing[3],
  },
  upcomingText: {
    flex:     1,
    fontSize: 12,
    color:    Colors.textSecondary,
  },
  // Demand signals
  demandRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
    marginBottom:  Spacing[2],
  },
  demandLabel: {
    fontSize:     10,
    fontWeight:   '700',
    color:        Colors.emerald,
    letterSpacing: 0.6,
    paddingTop:   1,
    minWidth:     36,
  },
  demandItems: {
    flex:       1,
    fontSize:   12,
    color:      Colors.textSecondary,
    lineHeight: 18,
  },
  // Low stock
  lowStockSection: {
    marginTop:   Spacing[3],
    paddingTop:  Spacing[3],
    borderTopWidth: 0.5,
    borderColor: Colors.border,
  },
  lowStockTitle: {
    fontSize:     12,
    fontWeight:   '700',
    color:        Colors.crimson,
    marginBottom: Spacing[2],
  },
  lowStockRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  lowStockName: {
    flex:     1,
    fontSize: 12,
    color:    Colors.textSecondary,
  },
  lowStockQty: {
    fontSize:   12,
    fontWeight: '600',
    color:      Colors.crimson,
    marginLeft: 8,
  },
  lowStockMore: {
    fontSize:   11,
    color:      Colors.textMuted,
    marginTop:  4,
  },
});
