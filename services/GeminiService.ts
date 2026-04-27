/**
 * BharatShop OS — GeminiService.ts
 * Gemini 2.5 Flash · Direct API mode
 *
 * Failure modes converted to strengths:
 *   1. Unit conversion gap → handled entirely in prompt (no DB needed)
 *   2. Offline scans → handled by OfflineQueue (see OfflineQueueService.ts)
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';
import Constants from 'expo-constants';

// ── Config ──────────────────────────────────────────────────────────────────
const GEMINI_KEY = (Constants.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY as string) || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

// ── System prompt — unit conversion handled here, not in code ────────────────
// This is the STRENGTH version of the unit conversion gap.
// Gemini does the unit math. Zero database needed.
const BILL_PROMPT = `You are a precise inventory parser for BharatShop OS — an AI-powered POS app used by Kirana (small grocery) store owners in India.

## Your primary task
Extract every inventory item from the supplier bill image provided.

## Critical: Unit conversion (handle in output, not in code)
Supplier bills often use bulk/carton units. You MUST break these down to retail units:
- "1 Carton Redbull (48 cans)" → output as quantity: 48, unit: "cans"
- "2 Dozen Parle-G 1kg" → output as quantity: 24, unit: "packs"  
- "5 Cases Pepsi 250ml (24 bottles each)" → output as quantity: 120, unit: "bottles"
- "1 Box Maggi (48 packs)" → output as quantity: 48, unit: "packs"
Calculate unit_price = (carton_price / retail_units). Always show retail units.

## Critical Tax Handling
- If bill shows CGST/SGST/IGST, extract BOTH:
  * grossAmount (item price + tax)
  * netAmount (item price before tax)
- If no tax line visible, set taxAmount: 0
- NEVER guess tax percentage - only extract if printed
- Verify: unit_price × quantity should equal total_price (flag mismatch in extraction_notes)

## Required JSON schema
{
  "supplier": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "invoice_number": "string or null",
  "detected_language": "English|Telugu|Hindi|Tamil|Mixed",
  "items": [
    {
      "name": "string",
      "brand": "string or null",
      "quantity": number,
      "unit": "string (retail unit e.g. pcs, packs, bottles, kg)",
      "unit_price": number or null,
      "total_price": number,
      "mrp": number or null,
      "gst_rate": number,
      "tax_breakdown": {
        "cgst": number,
        "sgst": number,
        "igst": number
      },
      "bulk_conversion_note": "string or null"
    }
  ],
  "subtotal": number or null,
  "tax_amount": number or null,
  "tax_rate_percent": number or null,
  "grand_total": number or null,
  "currency": "INR",
  "payment_terms": "string or null",
  "confidence": "high|medium|low",
  "extraction_notes": "string"
}`;

// ── Types ────────────────────────────────────────────────────────────────────
export interface ScannedItem {
  name: string;
  brand: string | null;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number;
  mrp: number | null;
  gst_rate?: number;
  tax_breakdown?: {
    cgst: number;
    sgst: number;
    igst?: number;
  };
  bulk_conversion_note?: string | null;
}

export interface ScanResult {
  success: boolean;
  supplier: string | null;
  invoice_date: string | null;
  invoice_number: string | null;
  detected_language: string;
  items: ScannedItem[];
  subtotal: number | null;
  tax_amount: number | null;
  grand_total: number | null;
  currency: 'INR';
  confidence: 'high' | 'medium' | 'low';
  extraction_notes: string;
  latency_ms: number;
  error?: string;
}

export interface BriefingResult {
  success: boolean;
  briefing: string;
  language: string;
  latency_ms: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function errorResult(msg: string, latency = 0): ScanResult {
  return {
    success: false, error: msg, items: [],
    confidence: 'low', extraction_notes: msg,
    supplier: null, invoice_date: null, invoice_number: null,
    detected_language: 'unknown', subtotal: null,
    tax_amount: null, grand_total: null,
    currency: 'INR', latency_ms: latency,
  };
}

function parseGeminiJson(text: string) {
  const cleaned = text
    .replace(/^```json\s*/gi, '')
    .replace(/^```\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .trim();
  return JSON.parse(cleaned);
}

// ── Image compression: 3.2MB → ~120KB (Higher res for handwritten OCR) ───────
export async function compressToBase64(uri: string, quality = 0.7): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: quality, format: SaveFormat.JPEG }
  );
  const response = await fetch(result.uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string) || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Re-compresses an existing base64 string to a lower quality.
 * Used for "Low Bandwidth Mode" retries.
 */
export async function recompressBase64(base64: string, quality = 0.3): Promise<string> {
  try {
    // 1. Create a blob from base64
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    
    // 2. Use ImageManipulator to compress
    // In Expo, we might need a URI. Blob to URI:
    const uri = URL.createObjectURL(blob);
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // Even smaller for low bandwidth
      { compress: quality, format: SaveFormat.JPEG }
    );
    
    // 3. Back to base64
    const res = await fetch(compressed.uri);
    const finalBlob = await res.json() as any; // fetch blob logic here
    // Re-using our reader logic
    const finalRes = await fetch(compressed.uri);
    const b = await finalRes.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(((reader.result as string) || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(b);
    });
  } catch (err) {
    console.error('[GeminiService] Recompression failed:', err);
    return base64; // Fallback to original
  }
}

// ── Core Gemini call ─────────────────────────────────────────────────────────
async function callGemini(base64: string, signal?: AbortSignal): Promise<ScanResult> {
  const start = Date.now();

  if (!GEMINI_KEY) return errorResult('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env');

  // Strip data URI prefix if present
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: signal as any,
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: BILL_PROMPT },
          { inline_data: { mime_type: 'image/jpeg', data: clean } },
          { text: 'Extract all inventory data from this supplier bill. Remember to convert bulk units to retail units.' },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const err = await res.json() as any;
    return errorResult(`Gemini error ${res.status}: ${err?.error?.message || 'unknown'}`, Date.now() - start);
  }

  const data = await res.json() as any;
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!raw) return errorResult('Gemini returned empty response', Date.now() - start);

  try {
    const parsed = parseGeminiJson(raw);
    return { ...parsed, success: true, latency_ms: Date.now() - start };
  } catch {
    return errorResult('Could not parse Gemini response: ' + raw.substring(0, 80), Date.now() - start);
  }
}

// ── PUBLIC: scanBill (URI input — compresses internally) ─────────────────────
export async function scanBill(imageUri: string): Promise<ScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const base64 = await compressToBase64(imageUri);
    const result = await callGemini(base64, controller.signal);
    clearTimeout(timeout);
    return result;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') return errorResult('Scan timed out. Try again.');
    return errorResult(err.message || 'Unknown error');
  }
}

// ── PUBLIC: scanBillBase64 (raw base64 — scanner.tsx uses this) ──────────────
export async function scanBillBase64(base64: string): Promise<ScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const result = await callGemini(base64, controller.signal);
    clearTimeout(timeout);
    return result;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') return errorResult('Scan timed out. Try again.');
    return errorResult(err.message || 'Unknown error');
  }
}

// ── PUBLIC: getDailyBriefing ──────────────────────────────────────────────────
export async function getDailyBriefing(params: {
  inventory: Record<string, any>;
  weather?: string;
  festival?: string;
  language?: 'English' | 'Telugu' | 'Hindi';
}): Promise<BriefingResult> {
  const start = Date.now();
  const lang = params.language || 'English';

  try {
    if (!GEMINI_KEY) throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');

    const prompt = `You are a trusted business advisor for a small Kirana grocery store in India.
Write a morning briefing (3 sentences max) based on this data:
Inventory: ${JSON.stringify(params.inventory)}
Weather: ${params.weather || 'normal'}
Festival/occasion: ${params.festival || 'none today'}
${lang !== 'English' ? `IMPORTANT: Respond in ${lang} script only.` : 'Respond in clear simple English.'}

Rules:
- Be specific: name actual products and numbers ("Parle-G has only 3 packs left")  
- Flag low stock items prominently
- If a festival is coming, suggest relevant stock to watch
- Warm, practical tone — like advice from a trusted friend
- Maximum 3 sentences. Return ONLY the briefing text.`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
      }),
    });

    const data = await res.json() as any;
    const briefing = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || 'Good morning! Check your stock levels today.';

    return { success: true, briefing, language: lang, latency_ms: Date.now() - start };
  } catch {
    return { success: false, briefing: 'Good morning! Check your stock levels today.', language: lang, latency_ms: Date.now() - start };
  }
}
