/**
 * BharatShop OS — GeminiService.ts
 * DEMO MODE: Direct Gemini API — no backend required
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';

// ── PASTE YOUR KEY HERE ─────────────────────────────────────────────
const GEMINI_KEY = (require('expo-constants').default.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY as string) || '';
// ───────────────────────────────────────────────────────────────────

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const PROMPT = `You are an inventory parser for a Kirana grocery store in India.
Extract all items from this supplier bill image.
Return ONLY valid JSON, no other text:
{
  "supplier": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit": "pcs",
      "unit_price": 0,
      "total_price": 0
    }
  ],
  "grand_total": 0,
  "confidence": "high"
}`;

export interface ScannedItem {
  name: string;
  brand: string | null;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number;
  mrp: number | null;
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

function err(msg: string): ScanResult {
  return {
    success: false, error: msg, items: [],
    confidence: 'low', extraction_notes: msg,
    supplier: null, invoice_date: null, invoice_number: null,
    detected_language: 'unknown', subtotal: null,
    tax_amount: null, grand_total: null,
    currency: 'INR', latency_ms: 0,
  };
}

async function toBase64(uri: string): Promise<string> {
  try {
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: SaveFormat.JPEG }
    );
    const response = await fetch(compressed.uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data URI prefix if present
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e: any) {
    throw new Error('Image compression failed: ' + e.message);
  }
}

async function callGemini(base64: string): Promise<ScanResult> {
  const start = Date.now();

  // Strip prefix if present
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { text: PROMPT },
        { inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
  };

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json();
    return err(`Gemini error ${res.status}: ${errData?.error?.message || 'unknown'}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!raw) return err('Gemini returned empty response');

  // Clean and parse JSON
  const cleaned = raw
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      ...parsed,
      success: true,
      invoice_number: parsed.invoice_number || null,
      detected_language: parsed.detected_language || 'English',
      subtotal: parsed.subtotal || null,
      tax_amount: parsed.tax_amount || null,
      currency: 'INR',
      extraction_notes: parsed.extraction_notes || '',
      latency_ms: Date.now() - start,
    };
  } catch {
    return err('Could not parse Gemini response: ' + cleaned.substring(0, 100));
  }
}

// ── PUBLIC EXPORTS ──────────────────────────────────────────────────

export async function scanBill(imageUri: string): Promise<ScanResult> {
  try {
    const base64 = await toBase64(imageUri);
    return await callGemini(base64);
  } catch (e: any) {
    return err(e.message || 'Unknown error');
  }
}

export async function scanBillBase64(base64: string): Promise<ScanResult> {
  try {
    return await callGemini(base64);
  } catch (e: any) {
    return err(e.message || 'Unknown error');
  }
}

export async function getDailyBriefing(params: {
  inventory: Record<string, any>;
  weather?: string;
  festival?: string;
  language?: 'English' | 'Telugu' | 'Hindi';
}): Promise<BriefingResult> {
  const start = Date.now();
  try {
    const lang = params.language || 'English';
    const prompt = `You are a friendly advisor for a Kirana store in India.
Write a 3-sentence morning briefing based on this inventory: ${JSON.stringify(params.inventory)}.
Weather: ${params.weather || 'normal'}. Festival: ${params.festival || 'none'}.
${lang !== 'English' ? `Respond in ${lang}.` : 'Respond in clear English.'}
Return ONLY the briefing text, nothing else.`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
      }),
    });

    const data = await res.json();
    const briefing = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || 'Good morning! Check your stock levels today.';

    return { success: true, briefing, language: lang, latency_ms: Date.now() - start };
  } catch (e: any) {
    return { success: false, briefing: 'Good morning! Check your stock levels today.', language: 'English', latency_ms: Date.now() - start };
  }
}
