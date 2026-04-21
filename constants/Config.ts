// constants/Config.ts — BharatShop OS 2026
// Centralised config accessors. Reads from expo-constants / process.env.
// SECURITY: This file NEVER exposes GEMINI_API_KEY or SERVICE_ROLE_KEY.
//           Those live ONLY in Supabase Secrets.

import Constants from 'expo-constants';

// ── Supabase (public — anon key is intentionally public) ─────

const extra = Constants.expoConfig?.extra ?? {};

export const Config = {
  supabase: {
    url:     (extra.EXPO_PUBLIC_SUPABASE_URL     as string) ?? '',
    anonKey: (extra.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) ?? '',
  },

  // ── Open-Meteo (free, no API key needed) ────────────────────
  weather: {
    baseUrl:    'https://api.open-meteo.com/v1/forecast',
    // Default: Hyderabad, Telangana
    defaultLat: 17.3850,
    defaultLon: 78.4867,
  },

  // ── Mixpanel (optional — graceful no-op if absent) ──────────
  mixpanel: {
    token: (extra.EXPO_PUBLIC_MIXPANEL_TOKEN as string) ?? '',
  },

  // ── App meta ─────────────────────────────────────────────────
  app: {
    version: '0.1.0-mvp',
    env:     (extra.APP_ENV as string) ?? 'production',
  },
} as const;

// ── Validation (called by verify-env script and root layout) ─

export function validateConfig(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!Config.supabase.url)     missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!Config.supabase.anonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return { ok: missing.length === 0, missing };
}
