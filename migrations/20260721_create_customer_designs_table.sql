-- Migration: Tạo bảng printing.customer_designs (Kho mẫu thiết kế khách hàng)
-- Ngày: 2026-07-21

CREATE TABLE IF NOT EXISTS printing.customer_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES printing.partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_label TEXT,
  sticker_type TEXT DEFAULT 'dtf_sheet',
  file_url TEXT,
  preview_url TEXT,
  unit_price NUMERIC DEFAULT 0,
  print_count INT DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho tra cứu nhanh theo partner_id và tên mẫu
CREATE INDEX IF NOT EXISTS idx_customer_designs_partner_id ON printing.customer_designs(partner_id);
CREATE INDEX IF NOT EXISTS idx_customer_designs_name ON printing.customer_designs(name);

-- Thêm quyền truy cập cho RLS
ALTER TABLE printing.customer_designs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to printing.customer_designs" ON printing.customer_designs;
CREATE POLICY "Allow all access to printing.customer_designs" 
  ON printing.customer_designs FOR ALL USING (true);
