import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Theme';

interface Props {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}

export default function Toggle({ label, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#3A3A3C', true: Colors.emerald }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#EAE8E2',
    fontWeight: '500',
  },
});
