-- Migration: Tạo bảng orders cho hệ thống đặt hàng PrinK Tech
-- Schema: printing

CREATE TABLE IF NOT EXISTS printing.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,

  -- Thông tin khách hàng
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_email TEXT,
  customer_note TEXT,

  -- Các sản phẩm trong đơn (mảng JSON)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Cấu trúc mỗi item:
  -- {
  --   product_type: 'cuon' | 'a4' | 'a3' | 'tem-nho' | 'tem-tb' | 'tem-lon',
  --   product_label: string,
  --   size_label: string,
  --   quantity: number,       -- số mét hoặc số tờ hoặc số chiếc
  --   unit: 'mét' | 'tờ' | 'chiếc',
  --   unit_price: number,
  --   subtotal: number,
  --   image_url: string | null,
  --   design_url: string | null,
  --   note: string | null
  -- }

  -- Tổng tiền
  subtotal NUMERIC(12,0) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(12,0) NOT NULL DEFAULT 0,
  discount NUMERIC(12,0) NOT NULL DEFAULT 0,
  total NUMERIC(12,0) NOT NULL DEFAULT 0,
  free_shipping BOOLEAN NOT NULL DEFAULT FALSE,

  -- Trạng thái đơn hàng
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','printing','shipped','delivered','cancelled')),

  -- Thanh toán
  payment_method TEXT NOT NULL DEFAULT 'cod'
    CHECK (payment_method IN ('cod','transfer')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid')),

  -- Link file thiết kế chung (ngoài từng item)
  design_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_status ON printing.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON printing.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON printing.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON printing.orders(order_number);

-- Auto update updated_at
CREATE OR REPLACE FUNCTION printing.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON printing.orders
  FOR EACH ROW EXECUTE FUNCTION printing.update_orders_updated_at();

-- RLS: Cho phép đọc/ghi từ anon (khách đặt hàng)
ALTER TABLE printing.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert orders"
  ON printing.orders FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select own order by phone"
  ON printing.orders FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow service_role full access"
  ON printing.orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);
