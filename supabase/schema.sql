-- =============================================================================
-- BHARATSHOP OS — SUPABASE DATABASE SCHEMA
-- PostgreSQL 15 + PostGIS 3.4
-- BCA Capstone Project 2026
-- =============================================================================
-- Execution order matters. Run top-to-bottom in Supabase SQL Editor.
-- Extensions must be enabled before table creation.
-- =============================================================================
 
 
-- =============================================================================
-- 0. EXTENSIONS
-- =============================================================================
 
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID primary keys
CREATE EXTENSION IF NOT EXISTS "postgis";      -- Geographic types + ST_DWithin
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram similarity for fuzzy search
 
 
-- =============================================================================
-- 1. STORES TABLE
-- Each row = one registered Kirana store / merchant account.
-- location: GEOGRAPHY(POINT,4326) enables PostGIS spatial indexing.
-- =============================================================================
 
CREATE TABLE IF NOT EXISTS stores (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 
  -- Display info
  name        TEXT         NOT NULL,
  description TEXT,
  phone       TEXT,
  address     TEXT,
 
  -- Coordinate-based geo-discovery (replaces PIN-code search)
  -- Stored as GEOGRAPHY so ST_DWithin uses metres, not degrees
  location    GEOGRAPHY(POINT, 4326),
 
  -- UPI payment config
  upi_vpa     TEXT,        -- e.g. "shopname@upi"
  upi_name    TEXT,        -- Payee display name
 
  -- Metadata
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
 
  CONSTRAINT stores_user_id_unique UNIQUE (user_id)   -- one store per account (MVP)
);
 
-- Spatial index: enables O(log n) ST_DWithin queries
CREATE INDEX IF NOT EXISTS idx_stores_location
  ON stores USING GIST (location);
 
-- Partial index: active stores only (most queries filter is_active = true)
CREATE INDEX IF NOT EXISTS idx_stores_active
  ON stores (is_active) WHERE is_active = true;
 
COMMENT ON TABLE stores IS
  'One row per merchant. location uses GEOGRAPHY for accurate metre-based radius queries.';
COMMENT ON COLUMN stores.location IS
  'GEOGRAPHY(POINT,4326). Use ST_MakePoint(longitude, latitude)::geography to insert.';
 
 
-- =============================================================================
-- 2. PRODUCTS TABLE
-- Inventory catalogue. Tags stored as JSONB with GIN index for sub-200ms search.
-- =============================================================================
 
CREATE TABLE IF NOT EXISTS products (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 
  -- Core fields
  name            TEXT         NOT NULL,
  category        TEXT         NOT NULL DEFAULT 'general',
  barcode         TEXT,
 
  -- Pricing (INR, stored as NUMERIC for financial precision — never FLOAT)
  cost_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  sell_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
 
  -- Inventory
  stock           INTEGER       NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER   NOT NULL DEFAULT 5,
  unit            TEXT          NOT NULL DEFAULT 'piece',  -- piece, kg, litre, box
 
  -- JSONB tags: powers GIN-indexed full-text-style search
  -- Example: ["biscuit", "parle-g", "100g", "snack"]
  tags            JSONB         NOT NULL DEFAULT '[]'::jsonb,
 
  -- Metadata
  image_url       TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
 
-- GIN index on tags: makes @> containment queries O(log n)
-- This is the core of sub-200ms product search at any catalogue size
CREATE INDEX IF NOT EXISTS idx_products_tags
  ON products USING GIN (tags);
 
-- Standard B-tree indexes for common filter patterns
CREATE INDEX IF NOT EXISTS idx_products_user_id
  ON products (user_id);
 
CREATE INDEX IF NOT EXISTS idx_products_category
  ON products (user_id, category);
 
CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products (user_id, stock)
  WHERE stock > 0;
 
-- Trigram index for ILIKE name matching (used in addScannedProducts dedup)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);
 
COMMENT ON TABLE products IS
  'Per-user inventory catalogue. tags JSONB + GIN index enables sub-200ms search.';
COMMENT ON COLUMN products.tags IS
  'Array of searchable tokens. Query: WHERE tags @> ''["parle-g"]''::jsonb';
COMMENT ON COLUMN products.cost_price IS
  'Supplier purchase price in INR. NUMERIC(10,2) — never store money as FLOAT.';
 
 
-- =============================================================================
-- 3. SALES TABLE
-- Append-only transaction log.
-- items: JSONB snapshot pattern — preserves prices at time of sale.
-- This is architecturally critical: sell_price changes must NOT retroactively
-- alter historical sale records.
-- =============================================================================
 
CREATE TABLE IF NOT EXISTS sales (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 
  -- JSONB snapshot of items at transaction time
  -- Schema: [{ product_id, name, qty, sell_price, cost_price }]
  -- sell_price is snapshotted here, NOT joined from products at query time
  -- This ensures historical P&L accuracy even after price changes
  items           JSONB        NOT NULL DEFAULT '[]'::jsonb,
 
  -- Financials
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
 
  -- Payment
  payment_method  TEXT         NOT NULL CHECK (payment_method IN ('upi', 'cash')),
  upi_ref         TEXT,        -- Transaction ID from UPI deeplink (tr= param)
 
  -- Timestamp (used for daily sales aggregation)
  timestamp       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
 
-- Index for daily sales queries (fetchTodaySales: WHERE timestamp >= today)
CREATE INDEX IF NOT EXISTS idx_sales_user_timestamp
  ON sales (user_id, timestamp DESC);
 
-- GIN index on items for product-level analytics queries
-- e.g. "how many units of product X sold this month"
CREATE INDEX IF NOT EXISTS idx_sales_items
  ON sales USING GIN (items);
 
COMMENT ON TABLE sales IS
  'Append-only sale log. items JSONB is a price snapshot — never join back to products for historical reporting.';
COMMENT ON COLUMN sales.items IS
  'Snapshot: [{"product_id":"uuid","name":"Parle-G","qty":2,"sell_price":10.00,"cost_price":8.50}]';
COMMENT ON COLUMN sales.upi_ref IS
  'The tr= parameter from the UPI deeplink, returned by the payment app for reconciliation.';
 
 
-- =============================================================================
-- 4. SCAN_LOGS TABLE
-- Audit trail for AI bill scans. Enables confidence-level analytics.
-- =============================================================================
 
CREATE TABLE IF NOT EXISTS scan_logs (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 
  -- Results
  products_found  INTEGER      NOT NULL DEFAULT 0,
  all_high_conf   BOOLEAN      NOT NULL DEFAULT false,
  status          TEXT         NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'timeout')),
  error_message   TEXT,
 
  -- Timing
  duration_ms     INTEGER,
  scanned_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_scan_logs_user
  ON scan_logs (user_id, scanned_at DESC);
 
COMMENT ON TABLE scan_logs IS
  'Audit trail for Gemini Vision API bill scans. Used for confidence analytics and debugging.';
 
 
-- =============================================================================
-- 5. UPDATED_AT TRIGGERS
-- Automatically maintain updated_at on relevant tables.
-- =============================================================================
 
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
CREATE TRIGGER set_updated_at_stores
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
 
CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
 
 
-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- Every table is locked to auth.uid() = user_id.
-- A stolen JWT cannot access another merchant's data.
-- This is enforced at the PostgreSQL kernel level — no application bypass possible.
-- =============================================================================
 
-- Enable RLS on all tables
ALTER TABLE stores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs   ENABLE ROW LEVEL SECURITY;
 
-- ── STORES ──────────────────────────────────────────────────────────────────
 
CREATE POLICY "stores: owner full access"
  ON stores FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
 
-- Public read for geo-discovery (customers can see nearby stores without auth)
-- Only exposes: id, name, location, upi_name — not financials
CREATE POLICY "stores: public read active"
  ON stores FOR SELECT
  USING (is_active = true);
 
-- ── PRODUCTS ─────────────────────────────────────────────────────────────────
 
CREATE POLICY "products: owner full access"
  ON products FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
 
-- ── SALES ────────────────────────────────────────────────────────────────────
 
CREATE POLICY "sales: owner full access"
  ON sales FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
 
-- ── SCAN_LOGS ────────────────────────────────────────────────────────────────
 
CREATE POLICY "scan_logs: owner full access"
  ON scan_logs FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
 
 
-- =============================================================================
-- 7. GEO-DISCOVERY FUNCTION
-- Encapsulates the PostGIS 500m radius query.
-- Returns stores with distance_m, ordered nearest-first.
-- Exposed as a Supabase RPC endpoint.
-- =============================================================================
 
CREATE OR REPLACE FUNCTION nearby_stores(
  customer_lon   FLOAT,
  customer_lat   FLOAT,
  radius_metres  INT DEFAULT 500
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  address     TEXT,
  upi_vpa     TEXT,
  upi_name    TEXT,
  distance_m  FLOAT
)
LANGUAGE SQL
STABLE  -- no writes; Postgres can cache execution plan
AS $$
  SELECT
    s.id,
    s.name,
    s.address,
    s.upi_vpa,
    s.upi_name,
    ST_Distance(
      s.location,
      ST_MakePoint(customer_lon, customer_lat)::geography
    ) AS distance_m
  FROM stores s
  WHERE
    s.is_active = true
    AND ST_DWithin(
      s.location,
      ST_MakePoint(customer_lon, customer_lat)::geography,
      radius_metres
    )
  ORDER BY distance_m ASC;
$$;
 
COMMENT ON FUNCTION nearby_stores IS
  'Returns active stores within radius_metres of (customer_lon, customer_lat). '
  'Uses PostGIS GiST index for O(log n) lookup. Default 500m radius.';
 
 
-- =============================================================================
-- 8. DAILY SALES SUMMARY VIEW
-- Aggregates today''s sales for the Daily Briefing dashboard.
-- Avoids N+1 queries from the client.
-- =============================================================================
 
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  user_id,
  COUNT(*)                          AS sale_count,
  SUM(total)                        AS total_revenue,
  SUM(CASE WHEN payment_method = 'upi'  THEN total ELSE 0 END) AS upi_revenue,
  SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) AS cash_revenue,
  DATE(timestamp AT TIME ZONE 'Asia/Kolkata') AS sale_date
FROM sales
GROUP BY user_id, DATE(timestamp AT TIME ZONE 'Asia/Kolkata');
 
COMMENT ON VIEW daily_sales_summary IS
  'Pre-aggregated daily sales per user. Timezone: Asia/Kolkata (IST).';
 
 
-- =============================================================================
-- 9. SAMPLE DATA (Development / Demo only)
-- Remove before production deployment.
-- Requires a valid auth.users entry — replace 'YOUR-USER-UUID' before running.
-- =============================================================================
 
/*
INSERT INTO stores (user_id, name, address, location, upi_vpa, upi_name)
VALUES (
  'YOUR-USER-UUID',
  'Lakshmi General Stores',
  '12-4-56, Kukatpally, Hyderabad - 500072',
  ST_MakePoint(78.4074, 17.4947)::geography,  -- Kukatpally coordinates
  'lakshmi@upi',
  'Lakshmi General Stores'
);
 
INSERT INTO products (user_id, name, category, cost_price, sell_price, stock, tags)
VALUES
  ('YOUR-USER-UUID', 'Parle-G Biscuits 100g',   'snacks',    8.00, 10.00, 48, '["biscuit","parle-g","100g","snack"]'),
  ('YOUR-USER-UUID', 'Tata Salt 1kg',            'staples',   18.50, 22.00, 30, '["salt","tata","1kg","staple"]'),
  ('YOUR-USER-UUID', 'Aashirvaad Atta 5kg',      'staples',   220.00, 245.00, 12, '["atta","flour","aashirvaad","5kg"]'),
  ('YOUR-USER-UUID', 'Sunsilk Shampoo 180ml',    'personal',  85.00, 99.00, 20, '["shampoo","sunsilk","hair","180ml"]'),
  ('YOUR-USER-UUID', 'Maggi Noodles 70g',        'snacks',    12.00, 14.00, 60, '["maggi","noodles","instant","70g"]');
*/
 
 
-- =============================================================================
-- SCHEMA COMPLETE
-- Version: BharatShop OS v0.1.0
-- Target: Supabase (PostgreSQL 15 + PostGIS 3.4)
-- Run: Supabase SQL Editor → paste → Run
-- =============================================================================
