// app/+not-found.tsx — BharatShop OS 2026
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, TouchTargets, Radius } from '@/constants/Theme';

export default function NotFoundScreen() {
  return (
    <View style={{
      flex: 1, backgroundColor: Colors.background,
      alignItems: 'center', justifyContent: 'center', padding: 28,
    }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🧭</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 }}>
        Page not found
      </Text>
      <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
        This screen doesn't exist in BharatShop OS.
      </Text>
      <TouchableOpacity
        onPress={() => router.replace('/(tabs)')}
        style={{
          backgroundColor: Colors.amber, borderRadius: Radius.lg,
          paddingHorizontal: 28, height: TouchTargets.standard,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ color: Colors.textInverse, fontWeight: '700', fontSize: 15 }}>
          Go to Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}
