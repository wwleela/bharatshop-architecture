// app/_layout.tsx — BharatShop OS 2026
// Root layout: wraps all providers, holds splash screen until auth resolves,
// and redirects unauthenticated users to login.

import '../global.css'; // NativeWind 4 — must be the very first import

import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import LoadingScreen from '@/components/LoadingScreen';

// Hold the splash screen until we know auth state
SplashScreen.preventAutoHideAsync();

// ── Inner layout — needs AuthContext ────────────────────────

function RootLayoutNav() {
  const { session, loading } = useAuth();

  useEffect(() => {
    AsyncStorage.setItem('test_storage', 'working_' + Date.now()).then(() => {
      console.log('✅ AsyncStorage WORKING');
    }).catch(err => {
      console.error('❌ AsyncStorage FAILED:', err);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();
    if (session) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }, [session, loading]);

  if (loading) return <LoadingScreen onFinish={() => {}} />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login"      options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"     options={{ headerShown: false }} />
      <Stack.Screen name="settings"   options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  );
}

// ── Root export ───────────────────────────────────────────────

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </CartProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
