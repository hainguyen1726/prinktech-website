-- Migration: Tao bang Sale Online cho Dashboard Kinh Doanh
-- Schema: marketing
-- Ngay: 2026-07-16

-- Bang 1: Doanh thu (sale_revenues)
CREATE TABLE IF NOT EXISTS marketing.sale_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'website'
    CHECK (channel IN ('website','shopee','facebook','tiktok','youtube','other')),
  amount_excl_vat NUMERIC(14,0) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,0) NOT NULL DEFAULT 0,
  shipping_fee_collected NUMERIC(14,0) NOT NULL DEFAULT 0,
  has_vat BOOLEAN NOT NULL DEFAULT FALSE,
  has_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  order_count INT NOT NULL DEFAULT 1,
  order_ref TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bang 2: Chi phi (sale_expenses)
CREATE TABLE IF NOT EXISTS marketing.sale_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'facebook'
    CHECK (channel IN ('website','shopee','facebook','tiktok','youtube','other','all')),
  category TEXT NOT NULL DEFAULT 'ads'
    CHECK (category IN ('shipping','ads','cost','platform_fee','other')),
  amount NUMERIC(14,0) NOT NULL DEFAULT 0,
  description TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index de query nhanh
CREATE INDEX IF NOT EXISTS idx_sale_revenues_date ON marketing.sale_revenues(date DESC);
CREATE INDEX IF NOT EXISTS idx_sale_revenues_channel ON marketing.sale_revenues(channel);
CREATE INDEX IF NOT EXISTS idx_sale_expenses_date ON marketing.sale_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_sale_expenses_channel ON marketing.sale_expenses(channel);
CREATE INDEX IF NOT EXISTS idx_sale_expenses_category ON marketing.sale_expenses(category);

-- RLS
ALTER TABLE marketing.sale_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.sale_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access revenues"
  ON marketing.sale_revenues FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access expenses"
  ON marketing.sale_expenses FOR ALL TO service_role
  USING (true) WITH CHECK (true);
