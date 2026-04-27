// types/index.ts — BharatShop OS 2026
// Single source of truth for all shared types.
// Every service, hook, and component imports from here.

// ── Product types ────────────────────────────────────────────

export type ProductCategory =
  | 'dairy'
  | 'snacks'
  | 'beverages'
  | 'staples'
  | 'personal'
  | 'other';

export interface Product {
  id:                  string;
  user_id:             string;
  name:                string;
  name_hi?:            string;       // Hindi name (optional)
  stock:               number;
  cost_price:          number;
  sell_price:          number;
  category:            ProductCategory;
  unit:                string;       // 'piece' | 'kg' | 'litre' | 'packet'
  low_stock_threshold: number;
  image_url?:          string;
  created_at:          string;
  updated_at:          string;
}

// Product returned from Gemini bill scan (pre-insert)
export interface ScannedProduct {
  name:       string;
  quantity:   number;
  cost_price: number;
  total:      number;
  category:   ProductCategory;
  confidence: 'high' | 'medium' | 'low';
  gst_rate?:  number;
  tax_breakdown?: {
    cgst: number;
    sgst: number;
    igst?: number;
  };
}

// ── Sale types ───────────────────────────────────────────────

export interface SaleItem {
  product_id: string;
  name:       string;
  qty:        number;
  sell_price: number;
}

export interface Sale {
  id:             string;
  user_id:        string;
  items:          SaleItem[];
  total:          number;
  payment_method: 'upi' | 'cash';
  upi_ref?:       string;
  notes?:         string;
  timestamp:      string;
}

// ── Cart types ───────────────────────────────────────────────

export interface CartItem {
  product: Product;
  qty:     number;
}

export type CartAction =
  | { type: 'ADD_ITEM';    product: Product }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'SET_QTY';     productId: string; qty: number }
  | { type: 'CLEAR_CART' };

export interface CartState {
  items: CartItem[];
}

// ── UPI types ────────────────────────────────────────────────

export interface UPIParams {
  vpa:           string;   // e.g. "shopkeeper@upi"
  name:          string;   // Payee display name
  amount:        number;   // INR
  description:   string;   // Transaction note
  transactionId: string;   // Unique ID for reconciliation
}

// ── Briefing / weather types ─────────────────────────────────

export interface WeatherData {
  temperature:  number;
  precipitation: number;
  condition:    'hot' | 'cold' | 'monsoon' | 'mild';
  description:  string;
}

export interface FestivalEntry {
  name:           string;   // English name
  nameHi:         string;   // Hindi name
  date:           string;   // MM-DD format (approximate)
  type:           'major' | 'regional' | 'national';
  demandSignals:  string[]; // product categories or keywords to highlight
  stockAlert:     string;   // brief stock-up advice
  notes?:         string;
}

export interface DailyBriefing {
  weather:          WeatherData;
  festivalToday:    FestivalEntry | null;
  upcomingFestival: FestivalEntry | null;
  demandBoosts:     string[];
  demandReduces:    string[];
  lowStockProducts: Product[];
  todaySalesTotal:  number;
  fetchedAt:        string;  // ISO timestamp for cache TTL check
}

// ── Gemini Edge Function response ───────────────────────────

export interface ScanResult {
  products: ScannedProduct[];
  raw?:     string;
  error?:   string;
}

// ── Auth ─────────────────────────────────────────────────────

export interface AuthContextValue {
  session:          import('@supabase/supabase-js').Session | null;
  loading:          boolean;
  signOut:          () => Promise<void>;
}
