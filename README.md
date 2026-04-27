# BharatShop OS 2026

### *AI-Powered Mobile POS for India's 12M+ Kirana Stores*

> **"Photograph a bill. Inventory updates itself."**

[![Solution Challenge 2026](https://img.shields.io/badge/Google-Solution%20Challenge%202026-4285F4?logo=google)](https://developers.google.com/community/gdsc-solution-challenge)
[![Live MVP](https://img.shields.io/badge/MVP-Live%20on%20Firebase-FF6F00?logo=firebase)](https://bharatshop-wwl.web.app)
[![Gemini 2.5 Flash](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-8B5CF6?logo=google)](https://ai.google.dev)
[![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-000000?logo=expo)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20%2B%20PostGIS-3ECF8E?logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-89.9%25-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![MIT License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🔗 Links

| Resource | URL |
|---|---|
| **Live MVP** | https://bharatshop-wwl.web.app |
| **GitHub** | https://github.com/wwleela/bharatshop-architecture |
| **Developer Profile** | https://g.dev/wwleela |
| **Demo Video** | *(recording in progress — link will be added before submission)* |

---

## The Problem

India has **12 million Kirana stores** — small family-run grocery shops that feed 1.4 billion people.

Every single one manages inventory on paper.

A Kirana owner spends **2+ hours every day** writing down what arrived from suppliers. That's **730 hours a year** — just writing. Stockouts go undetected. Supplier bills pile up. No affordable AI tool exists for their reality.

---

## The Solution

**BharatShop OS ends this with one photograph.**

Gemini 2.5 Flash reads the supplier bill — printed, handwritten, Telugu, Hindi or English — and updates stock in real time. Zero typing. Zero training required.

### Validated live result

```json
{
  "items": [{ "name": "Redbull", "quantity": 48, "unit_price": 120, "total_price": 5760 }],
  "grand_total": 5760,
  "confidence": "high",
  "latency_ms": 8516
}
```

**HIGH confidence on a real handwritten Kirana bill. 8.5 seconds.**

---

## SDG Alignment

| SDG | How BharatShop contributes |
|---|---|
| **SDG 8** — Decent Work & Economic Growth | 60–100% earnings uplift for digitised Kirana stores |
| **SDG 9** — Industry, Innovation & Infrastructure | AI-native infrastructure for 12M informal retailers |
| **SDG 10** — Reduced Inequalities | Zero-commission model keeps profits with the owner |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BHARATSHOP OS 2026                       │
├──────────────────┬──────────────────────┬───────────────────┤
│  CLIENT          │  AI LAYER            │  DATA LAYER       │
│                  │                      │                   │
│  React Native    │  Gemini 2.5 Flash    │  Supabase         │
│  Expo SDK 54     │  · Bill scan OCR     │  PostgreSQL 15    │
│  NativeWind v4   │  · Daily briefing    │  PostGIS 3.4      │
│  expo-router     │  · Telugu/Hindi/EN   │  Row Level Sec.   │
│                  │                      │  Realtime WS      │
│  DEPLOYMENT      │  PAYMENTS            │                   │
│  Firebase        │  NPCI UPI deeplinks  │  JSONB + GIN idx  │
│  Hosting         │  Zero commission     │  <42ms search     │
│  (Google Cloud)  │  All UPI apps        │                   │
└──────────────────┴──────────────────────┴───────────────────┘
```

### Google AI Integration ✅ (Mandatory Requirement)

**Touchpoint 1 — Bill Scan** (`services/GeminiService.ts`)
- Gemini 2.5 Flash processes bill image natively — no OCR pipeline
- Reads printed, handwritten, Telugu, Hindi and English bills
- Returns structured JSON: items, qty, unit_price, supplier, date
- Confidence scoring: high / medium / low
- Image compression: 3.2MB → 85KB (97.3% reduction) before API call

**Touchpoint 2 — Daily Briefing** (`services/BriefingService.ts`)
- Aggregates 24-hour inventory + weather + Indian festival calendar
- Gemini generates 3-sentence insight in owner's local language
- Example: *"Parle-G స్టాక్ తక్కువగా ఉంది — కేవలం 3 పాకెట్లు మిగిలాయి"*

### Cloud Deployment ✅ (Mandatory Requirement)

Live on **Firebase Hosting** (Google Cloud):
→ **https://bharatshop-wwl.web.app**

---

## Technical Highlights

### PostGIS Geo-Discovery — 87% Noise Reduction
```sql
SELECT id, name,
  ST_Distance(location, ST_MakePoint($1,$2)::geography) AS distance_m
FROM stores
WHERE ST_DWithin(location, ST_MakePoint($1,$2)::geography, 500)
ORDER BY distance_m ASC;
-- Catchment: 0.785 km² vs 6.0 km² PIN-code. Latency: 38ms vs 450ms.
```

### UPI — Zero Commission
```typescript
const upiLink = `upi://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR&mc=5411`;
// mc=5411 = MCC for grocery stores
// Works with GPay, PhonePe, Paytm, BHIM — no gateway agreement needed
```

### Image Compression Pipeline
```typescript
// expo-image-manipulator: 97.3% reduction before Gemini API call
const result = await manipulateAsync(uri,
  [{ resize: { width: 1024 } }],
  { compress: 0.7, format: SaveFormat.JPEG }
);
// Output: ~85KB regardless of input device
```

---

## Running Locally

```bash
# 1. Clone
git clone https://github.com/wwleela/bharatshop-architecture
cd bharatshop-architecture

# 2. Install
npm install

# 3. Environment variables
cp .env.example .env
# Add EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
# Add EXPO_PUBLIC_GEMINI_API_KEY (get free key from aistudio.google.com)

# 4. Start
npx expo start

# 5. Open on phone
# Scan QR code with Expo Go
```

---

## Project Structure

```
bharatshop-architecture/
├── app/
│   ├── (auth)/              # Login / Register
│   └── (tabs)/
│       ├── index.tsx        # Daily Briefing (Home)
│       ├── inventory.tsx    # Product catalogue
│       ├── sell.tsx         # 3-tap POS + UPI
│       └── scanner.tsx      # AI Bill Scanner ← core USP
├── services/
│   ├── GeminiService.ts     # Gemini 2.5 Flash integration
│   ├── BriefingService.ts   # Daily briefing generation
│   ├── SupabaseService.ts   # DB + Realtime
│   └── UPIService.ts        # NPCI deeplink generator
├── supabase/
│   ├── schema.sql           # Full DB schema + RLS policies
│   └── functions/scan-bill/ # Gemini Edge Function
├── public/                  # Firebase Hosting (MVP page)
│   └── index.html           # bharatshop-wwl.web.app
├── firebase.json
└── README.md
```

---

## Roadmap

| Feature | Description |
|---|---|
| **ONDC Integration** | Connect to India's Open Network for Digital Commerce — Google Cloud is ONDC's infra partner |
| **GST Filing** | Auto-generate GSTR-1 from scanned bill data — every scan is already a tax record |
| **Voice Input** | Google Speech-to-Text: *"Parle-G padi packets add cheyu"* in Telugu |
| **Demand Forecasting** | Gemini analyses 90-day patterns to predict reorders before stockouts |
| **Cloud Run API** | Migrate Gemini proxy to Google Cloud Run for full serverless scale |

---

## Why Google

Gemini 2.5 Flash is the **only model** that reads handwritten multilingual Kirana bills natively at this cost. Firebase Hosting satisfies the mandatory cloud deployment requirement at ₹0. At 1,000 stores, total infra cost is ₹200–500/month vs ₹50,000+ for traditional POS infrastructure.

**Google Cloud + Gemini is not a technology choice. It is the only cost structure that makes BharatShop viable for 12M stores earning ₹8,000–25,000/month.**

---

## About

Built by **Coach Leela Madhav** — founder of Urban Gliding Hyderabad (UGH), a skating community based in Hyderabad, India.

Submitted to **Google Solution Challenge 2026**.

Developer profile: **https://g.dev/wwleela**

## Troubleshooting

If you encounter issues during development:

```bash
# Cache issues
npx expo start -c

# Port conflicts
npx expo start --port 8082

# Metro bundler stuck
rm -rf node_modules/.cache
npx expo start
```

---

*MIT License © 2026 BharatShop OS*
