// app/settings.tsx — BharatShop OS 2026
// Store config: UPI VPA, store name, store location (GPS or manual)
// Location powers weather trends on Insights tab

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import Svg, { Path, Circle } from 'react-native-svg';

// ── Design tokens ─────────────────────────────────────────────
const T = {
  bg:         '#F7F7F5',
  surface:    '#FFFFFF',
  border:     '#EBEBEB',
  text:       '#111111',
  textSec:    '#555555',
  textMuted:  '#999999',
  saffron:    '#E8771A',
  saffronBg:  '#FEF3E8',
  green:      '#1A7A4A',
  greenBg:    '#E8F5EE',
  red:        '#C0392B',
};

// ── Storage keys — imported by POS + Insights ─────────────────
export const STORE_CONFIG_KEYS = {
  upiVpa:    'store_upi_vpa',
  storeName: 'store_name',
  lat:       'store_lat',
  lng:       'store_lng',
  city:      'store_city',
} as const;

export async function getStoreConfig() {
  const [upiVpa, storeName, lat, lng, city] = await Promise.all([
    AsyncStorage.getItem(STORE_CONFIG_KEYS.upiVpa),
    AsyncStorage.getItem(STORE_CONFIG_KEYS.storeName),
    AsyncStorage.getItem(STORE_CONFIG_KEYS.lat),
    AsyncStorage.getItem(STORE_CONFIG_KEYS.lng),
    AsyncStorage.getItem(STORE_CONFIG_KEYS.city),
  ]);
  return {
    upiVpa:    upiVpa    ?? 'yourname@upi',
    storeName: storeName ?? 'My Kirana Store',
    lat:       lat       ? parseFloat(lat) : null,
    lng:       lng       ? parseFloat(lng) : null,
    city:      city      ?? null,
  };
}

// ── Location pin SVG icon ─────────────────────────────────────
function PinIcon({ color = '#E8771A' }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={color} />
      <Circle cx={12} cy={9} r={2.5} fill="#FFFFFF" />
    </Svg>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function SettingsScreen() {
  const { signOut, session } = useAuth();
  const [upiVpa,       setUpiVpa]       = useState('');
  const [storeName,    setStoreName]    = useState('');
  const [city,         setCity]         = useState('');
  const [lat,          setLat]          = useState<number | null>(null);
  const [lng,          setLng]          = useState<number | null>(null);
  const [locating,     setLocating]     = useState(false);
  const [saved,        setSaved]        = useState(false);

  useEffect(() => {
    getStoreConfig().then(cfg => {
      setUpiVpa(cfg.upiVpa);
      setStoreName(cfg.storeName);
      setCity(cfg.city ?? '');
      setLat(cfg.lat);
      setLng(cfg.lng);
    });
  }, []);

  // ── GPS location detect ───────────────────────────────────
  async function detectLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location permission denied',
          'Please enable location in Settings, or type your city name manually below.',
        );
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      setLat(latitude);
      setLng(longitude);

      // Reverse geocode to get city name
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const detectedCity = place?.city ?? place?.district ?? place?.region ?? 'Unknown';
      setCity(detectedCity);
    } catch (e) {
      Alert.alert('Location error', 'Could not detect location. Please enter your city manually.');
    } finally {
      setLocating(false);
    }
  }

  // ── Save all config ───────────────────────────────────────
  async function save() {
    if (!upiVpa.includes('@')) {
      Alert.alert('Invalid UPI ID', 'UPI ID must contain @. Example: yourname@upi');
      return;
    }
    const ops: Promise<void>[] = [
      AsyncStorage.setItem(STORE_CONFIG_KEYS.upiVpa,    upiVpa.trim()),
      AsyncStorage.setItem(STORE_CONFIG_KEYS.storeName, storeName.trim()),
      AsyncStorage.setItem(STORE_CONFIG_KEYS.city,      city.trim()),
    ];
    if (lat !== null) ops.push(AsyncStorage.setItem(STORE_CONFIG_KEYS.lat, String(lat)));
    if (lng !== null) ops.push(AsyncStorage.setItem(STORE_CONFIG_KEYS.lng, String(lng)));
    await Promise.all(ops);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await signOut();
        router.replace('/login');
      }},
    ]);
  }

  const locationSet = lat !== null && lng !== null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 48 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: T.surface, borderWidth: 0.5, borderColor: T.border,
              alignItems: 'center', justifyContent: 'center', marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 18, color: T.saffron, lineHeight: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: T.text }}>Store Settings</Text>
        </View>

        {/* ── Store name ── */}
        <Text style={styles.sectionLabel}>STORE DETAILS</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Store Name</Text>
          <TextInput
            value={storeName}
            onChangeText={setStoreName}
            placeholder="My Kirana Store"
            placeholderTextColor={T.textMuted}
            style={styles.input}
          />
          <Text style={styles.hint}>Shown on receipts and payment screens</Text>

          <View style={{ height: 0.5, backgroundColor: T.border, marginVertical: 16 }} />

          {/* ── UPI VPA ── */}
          <Text style={styles.label}>UPI ID (VPA)</Text>
          <TextInput
            value={upiVpa}
            onChangeText={setUpiVpa}
            placeholder="yourname@upi"
            placeholderTextColor={T.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.hint}>
            Customers pay to this UPI ID. Find it in PhonePe / GPay / Paytm.
          </Text>
        </View>

        {/* ── Store Location ── */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>STORE LOCATION</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            Used for local weather-based product trend suggestions (e.g. cold drinks on hot days).
            Powers the location-aware intelligence on your Insights screen.
          </Text>

          {/* GPS detect button */}
          <TouchableOpacity
            onPress={detectLocation}
            disabled={locating}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, marginTop: 14,
              backgroundColor: locationSet ? T.greenBg : T.saffronBg,
              borderWidth: 0.5,
              borderColor: locationSet ? '#B8E4CC' : '#F5C99A',
              borderRadius: 12, height: 46,
            }}
          >
            {locating
              ? <ActivityIndicator size="small" color={T.saffron} />
              : <PinIcon color={locationSet ? T.green : T.saffron} />
            }
            <Text style={{
              fontSize: 14, fontWeight: '600',
              color: locationSet ? T.green : T.saffron,
            }}>
              {locating
                ? 'Detecting location…'
                : locationSet
                  ? `Location set · ${city}`
                  : 'Detect my store location'}
            </Text>
          </TouchableOpacity>

          {/* Coords display */}
          {locationSet && (
            <View style={{
              marginTop: 10, padding: 10,
              backgroundColor: T.bg, borderRadius: 8,
              borderWidth: 0.5, borderColor: T.border,
            }}>
              <Text style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace' }}>
                lat {lat?.toFixed(4)}  ·  lng {lng?.toFixed(4)}
              </Text>
            </View>
          )}

          <View style={{ height: 0.5, backgroundColor: T.border, marginVertical: 16 }} />

          {/* Manual city fallback */}
          <Text style={styles.label}>City (manual entry)</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Hyderabad"
            placeholderTextColor={T.textMuted}
            style={styles.input}
          />
          <Text style={styles.hint}>
            Type your city if GPS is unavailable. Used for trend suggestions.
          </Text>
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          onPress={save}
          style={{
            backgroundColor: saved ? T.green : T.saffron,
            borderRadius: 14, height: 54,
            alignItems: 'center', justifyContent: 'center', marginTop: 20,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
            {saved ? '✓  Saved!' : 'Save Settings'}
          </Text>
        </TouchableOpacity>

        {/* ── Account ── */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ACCOUNT</Text>
        <View style={styles.card}>
          <Text style={{ fontSize: 14, color: T.textSec, marginBottom: 14 }}>
            Signed in as:{' '}
            <Text style={{ color: T.text, fontWeight: '500' }}>
              {session?.user?.email ?? session?.user?.phone ?? '—'}
            </Text>
          </Text>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={{ fontSize: 14, color: T.red, fontWeight: '600' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version + future roadmap note */}
        <View style={{
          marginTop: 20, padding: 14,
          backgroundColor: T.surface, borderRadius: 12,
          borderWidth: 0.5, borderColor: T.border,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: T.textMuted, letterSpacing: 0.6, marginBottom: 8 }}>
            COMING SOON
          </Text>
          <Text style={{ fontSize: 12, color: T.textMuted, lineHeight: 18 }}>
            · Customer discovery map (PostGIS 500m geofencing){'\n'}
            · Voice UI in Hindi / Telugu{'\n'}
            · Offline-first mode with sync{'\n'}
            · Handwritten bill OCR
          </Text>
        </View>

        <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 20 }}>
          BharatShop OS · v0.1.0-mvp
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  sectionLabel: {
    fontSize: 11, fontWeight: '600' as const,
    color: '#999999', letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 16,
    borderWidth: 0.5, borderColor: '#EBEBEB',
  },
  label: {
    fontSize: 13, fontWeight: '600' as const,
    color: '#555555', marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F7F5',
    borderRadius: 10, borderWidth: 0.5,
    borderColor: '#EBEBEB',
    paddingHorizontal: 14, height: 48,
    color: '#111111', fontSize: 15,
  },
  hint: {
    fontSize: 12, color: '#999999',
    marginTop: 6, lineHeight: 18,
  },
};
