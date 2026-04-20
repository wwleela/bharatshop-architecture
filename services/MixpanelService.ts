// services/MixpanelService.ts — BharatShop OS 2026
// Lazy-loaded analytics. Graceful no-op if EXPO_PUBLIC_MIXPANEL_TOKEN is absent.
// Expo Go guard: mixpanel-react-native uses native modules unavailable in Expo Go.
// SECURITY: Zero PII in events — no names, phones, or addresses ever sent.

import { Config } from '@/constants/Config';
import Constants from 'expo-constants';

// ── Expo Go detection ─────────────────────────────────────────
// appOwnership === 'expo' means running inside Expo Go (not a standalone build).
// Native modules like Mixpanel are not linked in Expo Go — skip silently.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ── Lazy singleton ────────────────────────────────────────────

let _mixpanel: import('mixpanel-react-native').default | null = null;
let _initialized = false;

async function getMixpanel() {
  if (IS_EXPO_GO)           return null;   // Expo Go — no native modules
  if (!Config.mixpanel.token) return null; // No token → no-op
  if (_initialized)         return _mixpanel;

  try {
    const { default: Mixpanel } = await import('mixpanel-react-native');
    _mixpanel     = new Mixpanel(Config.mixpanel.token, true);
    await _mixpanel.init();
    _initialized = true;
    return _mixpanel;
  } catch (err) {
    console.warn('[MixpanelService] Failed to initialize:', err);
    return null;
  }
}

// ── Typed event catalogue ─────────────────────────────────────

export async function trackBillScanned(productCount: number, allHighConf: boolean): Promise<void> {
  const mp = await getMixpanel();
  mp?.track('bill_scanned', { product_count: productCount, all_high_confidence: allHighConf });
}

export async function trackScanFailed(reason: string): Promise<void> {
  const mp = await getMixpanel();
  mp?.track('scan_failed', { reason });
}

export async function trackManualEntry(productCount: number): Promise<void> {
  const mp = await getMixpanel();
  mp?.track('manual_entry_used', { product_count: productCount });
}

export async function trackSaleCompleted(
  total: number,
  paymentMethod: 'upi' | 'cash',
  itemCount: number,
): Promise<void> {
  const mp = await getMixpanel();
  mp?.track('sale_completed', {
    total_bucket:   Math.round(total / 10) * 10,
    payment_method: paymentMethod,
    item_count:     itemCount,
  });
}

export async function trackSettingsSaved(): Promise<void> {
  const mp = await getMixpanel();
  mp?.track('settings_saved');
}
