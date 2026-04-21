// components/ui/AlertBadge.tsx — BharatShop OS 2026
// Amber badge for warnings (low stock, upcoming festival)
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/Theme';

interface AlertBadgeProps {
  label: string;
}

export function AlertBadge({ label }: AlertBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${Colors.amber}22`,
    borderWidth:     0.5,
    borderColor:     Colors.amber,
    borderRadius:    Radius.pill,
    paddingHorizontal: 10,
    paddingVertical:    3,
    alignSelf:         'flex-start',
  },
  text: {
    fontSize:   11,
    fontWeight: '700',
    color:      Colors.amber,
    letterSpacing: 0.4,
  },
});
