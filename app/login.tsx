// app/login.tsx — BharatShop OS 2026
// Email + Password login. Works with Supabase Auth out-of-the-box.
// No Twilio / phone OTP setup required — examiner-friendly.
// Demo account: demo@bharatshop.in / Demo@2026

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/services/SupabaseService';
import { Colors, TouchTargets } from '@/constants/Theme';

export default function LoginScreen() {
  const [email,   setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading] = useState(false);
  const [mode,     setMode]   = useState<'login' | 'signup'>('login');

  async function handleAuth() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@') || password.length < 6) {
      Alert.alert('Invalid Input', 'Enter a valid email and a password (min 6 characters).');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email:    trimmedEmail,
        password: password,
      });
      setLoading(false);
      if (error) {
        Alert.alert('Login Failed', error.message);
      } else {
        router.replace('/(tabs)');
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email:    trimmedEmail,
        password: password,
      });
      setLoading(false);
      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else {
        Alert.alert(
          'Account Created ✅',
          'Check your email for a confirmation link, then log in.',
        );
        setMode('login');
      }
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>

        {/* Brand */}
        <Text style={{ fontSize: 32, fontWeight: '700', color: Colors.amber, marginBottom: 6 }}>
          BharatShop OS
        </Text>
        <Text style={{ fontSize: 15, color: Colors.textSecondary, marginBottom: 48 }}>
          Snap a bill. Update inventory. Done.
        </Text>

        {/* Email */}
        <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>
          Email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="demo@bharatshop.in"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={{
            backgroundColor: Colors.surface,
            borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
            paddingHorizontal: 16, height: TouchTargets.standard,
            color: Colors.textPrimary, fontSize: 16, marginBottom: 16,
          }}
        />

        {/* Password */}
        <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>
          Password
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          autoComplete="password"
          style={{
            backgroundColor: Colors.surface,
            borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
            paddingHorizontal: 16, height: TouchTargets.standard,
            color: Colors.textPrimary, fontSize: 16, marginBottom: 28,
          }}
        />

        {/* Primary button */}
        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          style={{
            height: TouchTargets.standard,
            backgroundColor: Colors.amber,
            borderRadius: 10,
            alignItems: 'center', justifyContent: 'center',
            opacity: loading ? 0.7 : 1, marginBottom: 16,
          }}
        >
          {loading
            ? <ActivityIndicator color={Colors.textInverse} />
            : <Text style={{ color: Colors.textInverse, fontSize: 16, fontWeight: '700' }}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
          }
        </TouchableOpacity>

        {/* Toggle mode */}
        <TouchableOpacity
          onPress={() => setMode(m => m === 'login' ? 'signup' : 'login')}
          style={{ alignItems: 'center', padding: 10 }}
        >
          <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        {/* Demo hint */}
        <View style={{
          marginTop: 32, padding: 12,
          backgroundColor: `${Colors.amber}11`,
          borderRadius: 10, borderWidth: 0.5, borderColor: `${Colors.amber}44`,
        }}>
          <Text style={{ fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
            Demo: <Text style={{ color: Colors.amber, fontWeight: '600' }}>demo@bharatshop.in</Text>
            {'\n'}Password: <Text style={{ color: Colors.amber, fontWeight: '600' }}>Demo@2026</Text>
          </Text>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}
