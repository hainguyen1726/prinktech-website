-- =============================================================
-- Migration: Hệ thống quản lý khách hàng & đơn hàng PrinK Tech
-- Date: 2026-07-13
-- Schema: printing
-- =============================================================

-- 1. Bảng KHÁCH HÀNG
-- =============================================================
CREATE TABLE IF NOT EXISTS printing.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT UNIQUE,            -- VD: KH-0001 (tự sinh qua trigger)
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('website','manual','zalo','facebook','other')),
  customer_type TEXT DEFAULT 'retail'
    CHECK (customer_type IN ('retail','wholesale','agent')),
  notes TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  total_orders INT DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sinh customer_code tự động KH-0001, KH-0002,...
CREATE SEQUENCE IF NOT EXISTS printing.customers_code_seq START 1;

CREATE OR REPLACE FUNCTION printing.set_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_code IS NULL THEN
    NEW.customer_code := 'KH-' || LPAD(nextval('printing.customers_code_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_customer_code ON printing.customers;
CREATE TRIGGER trg_set_customer_code
  BEFORE INSERT ON printing.customers
  FOR EACH ROW EXECUTE FUNCTION printing.set_customer_code();

-- Auto update updated_at
CREATE OR REPLACE FUNCTION printing.update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON printing.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON printing.customers
  FOR EACH ROW EXECUTE FUNCTION printing.update_customers_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_customers_phone ON printing.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON printing.customers USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_customers_source ON printing.customers(source);
CREATE INDEX IF NOT EXISTS idx_customers_type ON printing.customers(customer_type);

-- =============================================================
-- 2. Bảng ĐƠN HÀNG gắn với khách hàng
-- =============================================================
CREATE TABLE IF NOT EXISTS printing.customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,    -- VD: PT-260713-4521
  customer_id UUID REFERENCES printing.customers(id) ON DELETE SET NULL,

  -- Sản phẩm & dàn trang
  sticker_type TEXT DEFAULT 'uv_dtf_noi'
    CHECK (sticker_type IN ('uv_dtf_noi','uv_dtf_thuong','decal','other')),
  quantity_items INTEGER,               -- Tổng số tem/sticker
  quantity_meters NUMERIC,             -- Số mét in
  items JSONB DEFAULT '[]',            -- Chi tiết từng mẫu tem
  nesting_notes TEXT,                  -- Ghi chú dàn trang & kỹ thuật

  -- Links đính kèm tài liệu
  design_link TEXT,                    -- Link thư mục Drive thiết kế
  nesting_image_url TEXT,              -- Link ảnh dàn trang in thực tế
  preview_image_url TEXT,              -- Link ảnh preview sản phẩm
  quote_excel_url TEXT,                -- Link file Excel báo giá
  quote_pdf_url TEXT,                  -- Link file PDF báo giá
  label_link TEXT,                     -- Link label dán hộp hàng

  -- Giá tiền
  subtotal NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  unit_price_per_meter NUMERIC,        -- Đơn giá/mét

  -- Giao hàng
  shipping_method TEXT DEFAULT 'cod'
    CHECK (shipping_method IN ('cod','prepaid','pickup')),
  shipping_carrier TEXT,               -- 'ghn' | 'ghtk' | 'j&t' | 'vnpost' | 'other'
  tracking_code TEXT,
  shipping_address TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Trạng thái
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','designing','printing','packing','shipped','delivered','cancelled')),
  payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partial','paid','refunded')),

  -- Nguồn & ghi chú
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('website','manual','zalo','facebook','other')),
  notes TEXT,
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto update updated_at
CREATE OR REPLACE FUNCTION printing.update_customer_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_orders_updated_at ON printing.customer_orders;
CREATE TRIGGER trg_customer_orders_updated_at
  BEFORE UPDATE ON printing.customer_orders
  FOR EACH ROW EXECUTE FUNCTION printing.update_customer_orders_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_id ON printing.customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON printing.customer_orders(status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_created_at ON printing.customer_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_orders_order_number ON printing.customer_orders(order_number);

-- =============================================================
-- 3. Bảng LỊCH SỬ THAY ĐỔI đơn hàng
-- =============================================================
CREATE TABLE IF NOT EXISTS printing.order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES printing.customer_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'created','status_changed','payment_updated','shipping_updated',
      'note_added','link_updated','item_updated','customer_updated'
    )),
  field_changed TEXT,                  -- Tên field thay đổi
  old_value TEXT,                      -- Giá trị cũ (text serialized)
  new_value TEXT,                      -- Giá trị mới
  description TEXT NOT NULL,           -- Mô tả ngắn
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON printing.order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON printing.order_history(created_at DESC);

-- =============================================================
-- 4. Trigger: Tự động ghi lịch sử khi update customer_orders
-- =============================================================
CREATE OR REPLACE FUNCTION printing.log_order_history()
RETURNS TRIGGER AS $$
DECLARE
  v_desc TEXT;
BEGIN
  -- Theo dõi thay đổi status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO printing.order_history(order_id, event_type, field_changed, old_value, new_value, description)
    VALUES(NEW.id, 'status_changed', 'status', OLD.status, NEW.status,
           'Trạng thái đơn thay đổi từ "' || COALESCE(OLD.status,'?') || '" → "' || NEW.status || '"');
  END IF;

  -- Theo dõi thay đổi payment_status
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO printing.order_history(order_id, event_type, field_changed, old_value, new_value, description)
    VALUES(NEW.id, 'payment_updated', 'payment_status', OLD.payment_status, NEW.payment_status,
           'Thanh toán: "' || COALESCE(OLD.payment_status,'?') || '" → "' || NEW.payment_status || '"');
  END IF;

  -- Theo dõi thay đổi tracking_code
  IF OLD.tracking_code IS DISTINCT FROM NEW.tracking_code THEN
    INSERT INTO printing.order_history(order_id, event_type, field_changed, old_value, new_value, description)
    VALUES(NEW.id, 'shipping_updated', 'tracking_code', OLD.tracking_code, NEW.tracking_code,
           'Cập nhật mã vận đơn: ' || COALESCE(NEW.tracking_code,'[đã xóa]'));
  END IF;

  -- Theo dõi thay đổi design_link
  IF OLD.design_link IS DISTINCT FROM NEW.design_link AND NEW.design_link IS NOT NULL THEN
    INSERT INTO printing.order_history(order_id, event_type, field_changed, old_value, new_value, description)
    VALUES(NEW.id, 'link_updated', 'design_link', OLD.design_link, NEW.design_link,
           'Cập nhật link thư mục Drive thiết kế');
  END IF;

  -- Theo dõi thay đổi notes
  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    INSERT INTO printing.order_history(order_id, event_type, field_changed, old_value, new_value, description)
    VALUES(NEW.id, 'note_added', 'notes', OLD.notes, NEW.notes,
           'Cập nhật ghi chú đơn hàng');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_order_history ON printing.customer_orders;
CREATE TRIGGER trg_log_order_history
  AFTER UPDATE ON printing.customer_orders
  FOR EACH ROW EXECUTE FUNCTION printing.log_order_history();

-- =============================================================
-- 5. Function: Cập nhật thống kê khách hàng sau khi insert/update đơn
-- =============================================================
CREATE OR REPLACE FUNCTION printing.update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL THEN
    UPDATE printing.customers
    SET
      total_orders = total_orders + 1,
      total_spent = total_spent + COALESCE(NEW.total, 0),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.customer_id IS NOT NULL THEN
    -- Cập nhật lại tổng chính xác
    UPDATE printing.customers c
    SET
      total_orders = (SELECT COUNT(*) FROM printing.customer_orders WHERE customer_id = c.id),
      total_spent = (SELECT COALESCE(SUM(total),0) FROM printing.customer_orders WHERE customer_id = c.id),
      updated_at = NOW()
    WHERE c.id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_customer_stats ON printing.customer_orders;
CREATE TRIGGER trg_update_customer_stats
  AFTER INSERT OR UPDATE OF total ON printing.customer_orders
  FOR EACH ROW EXECUTE FUNCTION printing.update_customer_stats();

-- =============================================================
-- 6. RLS Policies
-- =============================================================
ALTER TABLE printing.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE printing.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE printing.order_history ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_customers" ON printing.customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_customer_orders" ON printing.customer_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_order_history" ON printing.order_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- DONE
-- =============================================================
