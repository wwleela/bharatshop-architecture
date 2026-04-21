// services/GeminiService.ts — BharatShop OS 2026
// ─────────────────────────────────────────────────────────────────────────────
// FIXES IN THIS FILE
// ──────────────────
// BUG-2  Gemini Edge Function 404 / URL construction error
//        Root cause A: EXPO_PUBLIC_SUPABASE_URL may have or lack a trailing
//        slash — naive string concatenation produced double-slash or no-slash URLs.
//        Root cause B: The Edge Function `scan-bill` may not be deployed yet.
//        Fix: normalise the URL with a helper. Return null gracefully on 404 so
//        the caller shows the manual-entry form instead of crashing.
//
// Architecture: never calls Gemini directly (ADR-006).
//   Client → Supabase Edge Function → Gemini Vision API → structured JSON → Client
//   This keeps the Gemini API key server-side and isolates latency (800–2000ms)
//   from the critical POS path.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '@/services/SupabaseService';
import { ScanResult, ScannedProduct } from '@/types';
import Constants from 'expo-constants';

// ── URL normalisation ────────────────────────────────────────────────────────
// Strips trailing slash from base URL, then appends the function path.
// Handles both:
//   "https://xyz.supabase.co"   → "https://xyz.supabase.co/functions/v1/scan-bill"
//   "https://xyz.supabase.co/"  → "https://xyz.supabase.co/functions/v1/scan-bill"

function buildEdgeFunctionUrl(supabaseUrl: string, functionName: string): string {
  const base = supabaseUrl.replace(/\/+$/, ''); // strip trailing slash(es)
  return `${base}/functions/v1/${functionName}`;
}

const SUPABASE_URL = (
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL as string | undefined
) ?? '';

const EDGE_FUNCTION_URL = buildEdgeFunctionUrl(SUPABASE_URL, 'scan-bill');

// ─────────────────────────────────────────────────────────────────────────────

export async function scanBillImage(
  base64Image: string,
  mimeType:    'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<ScannedProduct[] | null> {

  if (!SUPABASE_URL) {
    console.warn('[GeminiService] EXPO_PUBLIC_SUPABASE_URL not set — cannot scan');
    return null;
  }

  // Auth header — Edge Function requires a valid JWT
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn('[GeminiService] No active session — cannot scan');
    return null;
  }

  // 12-second timeout: 10s Gemini budget + 2s network margin
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ image: base64Image, mimeType }),
    });

    clearTimeout(timeout);

    // ── BUG-2 FIX: graceful 404 handling ────────────────────────────────────
    // 404 means the Edge Function is not yet deployed.
    // Return null → caller shows manual-entry form. App does not crash.
    if (response.status === 404) {
      console.warn(
        '[GeminiService] scan-bill Edge Function not deployed yet.\n' +
        '  To fix: run `supabase functions deploy scan-bill` or deploy via Supabase Dashboard.\n' +
        '  Falling back to manual entry.',
      );
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error');
      console.error('[GeminiService] Edge Function error:', response.status, errorText);
      return null;
    }

    const result: ScanResult = await response.json();

    if (result.error) {
      console.warn('[GeminiService] Scan returned error:', result.error);
    }

    // Discard low-confidence items with zero price (almost certainly parse errors)
    const reliable = (result.products ?? []).filter(
      p => !(p.confidence === 'low' && p.cost_price === 0),
    );

    return reliable.length > 0 ? reliable : null;

  } catch (err) {
    clearTimeout(timeout);

    if ((err as Error).name === 'AbortError') {
      console.error('[GeminiService] Request timed out after 12 s — showing manual entry');
    } else {
      console.error('[GeminiService] Unexpected error:', err);
    }
    return null;
  }
}
