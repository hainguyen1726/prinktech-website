-- Migration: Tao bang Activity Logs va Lich su don gia doi tac
-- Schema: printing
-- Ngay: 2026-07-16

-- 1. Bang luu lich su thay doi don gia cua tung doi tac theo thoi ky
CREATE TABLE IF NOT EXISTS printing.partner_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES printing.partners(id) ON DELETE CASCADE,
  sticker_type TEXT NOT NULL CHECK (sticker_type IN ('dtf_roll','dtf_piece')),
  old_price NUMERIC(12,2),
  new_price NUMERIC(12,2) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bang luu log toan bo giao dich, thao tac admin, don hang...
CREATE TABLE IF NOT EXISTS printing.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,          -- 'website-admin-id', 'website-admin-thanh', 'website-marketing-id'
  user_name TEXT NOT NULL,        -- 'Website Admin', 'Thanh', ...
  action TEXT NOT NULL,           -- 'create_order', 'update_status', 'delete_order', 'change_price', 'login', 'create_expense'
  target_type TEXT NOT NULL,      -- 'order', 'customer_order', 'partner', 'expense', 'price'
  target_id TEXT,                 -- Id cua doi tuong
  description TEXT NOT NULL,      -- Mo ta chi tiet log bang tieng Viet
  details JSONB,                  -- Chi tiet thong so ky thuat neu can
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index query nhanh
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON printing.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON printing.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON printing.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_partner_price_history_partner ON printing.partner_price_history(partner_id);

-- RLS
ALTER TABLE printing.partner_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE printing.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access partner_price"
  ON printing.partner_price_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access activity_logs"
  ON printing.activity_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);
