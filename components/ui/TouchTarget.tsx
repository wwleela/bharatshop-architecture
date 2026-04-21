// components/ui/TouchTarget.tsx — BharatShop OS 2026
// Wraps any pressable element in a container that guarantees minimum touch area.
// WCAG 2.1 AA requires 44×44pt minimum. We use 48×48pt throughout.

import { TouchableOpacity, TouchableOpacityProps, View, StyleSheet } from 'react-native';
import { TouchTargets } from '@/constants/Theme';

interface TouchTargetProps extends TouchableOpacityProps {
  size?: number;
}

export function TouchTarget({
  size = TouchTargets.minimum,
  style,
  children,
  ...rest
}: TouchTargetProps) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        { minWidth: size, minHeight: size },
        style,
      ]}
      activeOpacity={0.72}
      {...rest}
    >
      <View style={styles.inner}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems:     'center',
    justifyContent: 'center',
  },
});
