-- ============================================================================
-- SCRIPT MIGRATION DATABASE V2 FOR PRIN K TECH & XƯỞNG IN
-- Tác giả: Antigravity AI Agent
-- Ngày tạo: 22/07/2026
-- Mục tiêu: Tạo hệ thống bảng v2 chuẩn hóa, không ảnh hưởng bảng cũ (Parallel Staging)
-- ============================================================================

-- 1. TẠO BẢNG v2_customers (Khách hàng tập trung)
CREATE TABLE IF NOT EXISTS printing.v2_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  customer_type VARCHAR(50) DEFAULT 'retail', -- 'retail', 'wholesale', 'agency', 'partner'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tra cứu theo số điện thoại khách hàng
CREATE INDEX IF NOT EXISTS idx_v2_customers_phone ON printing.v2_customers(phone);

-- 2. TẠO BẢNG v2_orders (Đơn hàng đa kênh chuẩn hóa)
CREATE TABLE IF NOT EXISTS printing.v2_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code VARCHAR(50) UNIQUE NOT NULL,       -- PK-20260722-1234 hoặc ORD-20260722-1234
  channel VARCHAR(50) NOT NULL DEFAULT 'website', -- 'website', 'sale_online', 'workshop_b2b'
  customer_id UUID REFERENCES printing.v2_customers(id) ON DELETE SET NULL,
  
  -- Thông tin giao hàng tại thời điểm đặt
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_address TEXT,
  customer_email VARCHAR(255),
  customer_note TEXT,
  
  -- Tiền tệ & Giá vốn
  subtotal DECIMAL(15,2) DEFAULT 0,
  shipping_fee DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  has_vat BOOLEAN DEFAULT FALSE,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Quản lý giá vốn xưởng in
  actual_meters DECIMAL(10,3) DEFAULT 0,
  cost_amount DECIMAL(15,2) DEFAULT 0,
  packaging_fee DECIMAL(15,2) DEFAULT 0,
  
  -- Trạng thái
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  payment_method VARCHAR(50) DEFAULT 'cod',
  
  -- Link liên kết & Vận chuyển (Tách cột riêng biệt)
  design_url TEXT,
  quote_excel_url TEXT,
  quote_pdf_url TEXT,
  shipping_carrier VARCHAR(100),
  tracking_number VARCHAR(100),
  
  -- VAT Info (nếu khách yêu cầu)
  request_vat BOOLEAN DEFAULT FALSE,
  vat_company_name VARCHAR(255),
  vat_tax_code VARCHAR(100),
  vat_company_address TEXT,
  vat_email VARCHAR(255),
  
  -- Metadata & Tags
  internal_note TEXT,
  tags TEXT[],
  original_legacy_id VARCHAR(100), -- ID gốc để đối chiếu khi cần
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tối ưu tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_v2_orders_channel ON printing.v2_orders(channel);
CREATE INDEX IF NOT EXISTS idx_v2_orders_status ON printing.v2_orders(status);
CREATE INDEX IF NOT EXISTS idx_v2_orders_created_at ON printing.v2_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_orders_phone ON printing.v2_orders(customer_phone);

-- 3. TẠO BẢNG v2_order_items (Chi tiết từng sản phẩm trong đơn)
CREATE TABLE IF NOT EXISTS printing.v2_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES printing.v2_orders(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(100),
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'cái',
  unit_price DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  preview_image_url TEXT,
  design_file_url TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho items
CREATE INDEX IF NOT EXISTS idx_v2_order_items_order_id ON printing.v2_order_items(order_id);


-- ============================================================================
-- SCRIPT MIGRATION ETL: CHUYỂN DỮ LIỆU TỪ BẢNG CỦ SANG V2 (TỰ ĐỘNG LỌC VÀ CHUẨN HÓA)
-- ============================================================================

-- A. CHUYỂN DỮ LIỆU KHÁCH HÀNG TỪ PARTNERS CỦA XƯỞNG
INSERT INTO printing.v2_customers (id, name, phone, email, address, customer_type, created_at)
SELECT 
  id,
  COALESCE(name, 'Khách vãng lai'),
  COALESCE(phone, ''),
  email,
  address,
  CASE WHEN partner_type = 'standard' THEN 'retail' ELSE 'partner' END,
  COALESCE(created_at, NOW())
FROM printing.partners
ON CONFLICT (id) DO NOTHING;

-- B. CHUYỂN DỮ LIỆU TỪ RETAIL_ORDERS (ĐƠN WEBSITE) SANG V2_ORDERS
DO $$
DECLARE
  r RECORD;
  c_id UUID;
  new_order_id UUID;
  item_json JSONB;
BEGIN
  FOR r IN SELECT * FROM printing.retail_orders LOOP
    -- Tìm hoặc tạo customer theo SĐT
    IF r.customer_phone IS NOT NULL AND TRIM(r.customer_phone) != '' THEN
      SELECT id INTO c_id FROM printing.v2_customers WHERE phone = TRIM(r.customer_phone) LIMIT 1;
      IF c_id IS NULL THEN
        c_id := gen_random_uuid();
        INSERT INTO printing.v2_customers (id, name, phone, email, address, customer_type, created_at)
        VALUES (c_id, COALESCE(r.customer_name, 'Khách lẻ Web'), TRIM(r.customer_phone), r.customer_email, r.customer_address, 'retail', r.created_at);
      END IF;
    ELSE
      c_id := NULL;
    END IF;

    -- Thêm vào v2_orders
    new_order_id := gen_random_uuid();
    INSERT INTO printing.v2_orders (
      id, order_code, channel, customer_id, customer_name, customer_phone, customer_address, customer_email, customer_note,
      subtotal, shipping_fee, discount, has_vat, vat_amount, total_amount, actual_meters, cost_amount,
      status, payment_status, payment_method, design_url, shipping_carrier, tracking_number,
      request_vat, vat_company_name, vat_tax_code, vat_company_address, vat_email,
      original_legacy_id, created_at, updated_at
    ) VALUES (
      new_order_id,
      r.order_number,
      COALESCE(r.source, 'website'),
      c_id,
      COALESCE(r.customer_name, 'Khách lẻ'),
      COALESCE(r.customer_phone, ''),
      r.customer_address,
      r.customer_email,
      r.customer_note,
      COALESCE(r.subtotal, 0),
      COALESCE(r.shipping_fee, 0),
      COALESCE(r.discount, 0),
      COALESCE(r.request_vat, FALSE),
      CASE WHEN r.request_vat THEN ROUND(COALESCE(r.subtotal, 0) * 0.08) ELSE 0 END,
      COALESCE(r.total, 0),
      COALESCE(r.converted_length, 0),
      COALESCE(r.cost_amount, 0),
      COALESCE(r.status, 'pending'),
      COALESCE(r.payment_status, 'unpaid'),
      COALESCE(r.payment_method, 'cod'),
      r.design_url,
      r.shipping_carrier,
      r.tracking_number,
      COALESCE(r.request_vat, FALSE),
      r.vat_company_name,
      r.vat_tax_code,
      r.vat_company_address,
      r.vat_email,
      r.id::text,
      r.created_at,
      COALESCE(r.created_at, NOW())
    ) ON CONFLICT (order_code) DO NOTHING;

    -- Thêm items từ JSON
    IF r.items IS NOT NULL AND jsonb_typeof(r.items::jsonb) = 'array' THEN
      FOR item_json IN SELECT * FROM jsonb_array_elements(r.items::jsonb) LOOP
        INSERT INTO printing.v2_order_items (
          order_id, product_name, product_type, quantity, unit, unit_price, subtotal, preview_image_url, design_file_url, note, created_at
        ) VALUES (
          new_order_id,
          COALESCE(item_json->>'product_label', item_json->>'product_type', 'In tem UV DTF'),
          item_json->>'product_type',
          COALESCE((item_json->>'quantity')::decimal, 1),
          COALESCE(item_json->>'unit', 'cái'),
          COALESCE((item_json->>'unit_price')::decimal, 0),
          COALESCE((item_json->>'subtotal')::decimal, 0),
          item_json->>'image_url',
          item_json->>'design_url',
          item_json->>'note',
          r.created_at
        );
      END LOOP;
    END IF;
  END FOR;
END $$;


-- C. CHUYỂN DỮ LIỆU TỪ ORDERS CỦA XƯỞNG SANG V2_ORDERS
DO $$
DECLARE
  o RECORD;
  p_name TEXT;
  p_phone TEXT;
  p_address TEXT;
  p_email TEXT;
  is_prinktech BOOLEAN;
  is_standard BOOLEAN;
  calc_channel VARCHAR(50);
  excel_link TEXT;
  pdf_link TEXT;
  carrier_txt TEXT;
  tracking_txt TEXT;
  has_vat_tag BOOLEAN;
  new_order_id UUID;
BEGIN
  FOR o IN SELECT o_tbl.*, p.name AS p_name, p.phone AS p_phone, p.address AS p_address, p.email AS p_email, p.partner_type 
           FROM printing.orders o_tbl 
           LEFT JOIN printing.partners p ON o_tbl.partner_id = p.id LOOP
    
    -- Kiểm tra nhãn tag
    is_prinktech := (o.tags IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(o.tags) t WHERE LOWER(t) LIKE '%prinktech%'));
    is_standard := (o.partner_type = 'standard');
    
    -- Xác định channel
    IF UPPER(COALESCE(o.p_name, '')) LIKE '%AN NGUYÊN TECH%' 
       OR UPPER(COALESCE(o.p_name, '')) LIKE '%IN TEST%' 
       OR UPPER(COALESCE(o.p_name, '')) LIKE '%HAO PHÍ%' 
       OR UPPER(COALESCE(o.p_name, '')) LIKE '%NGUYỄN MINH HẢI%' 
       OR o.partner_type IN ('agent_level_1', 'agent_level_2', 'partner') THEN
      calc_channel := 'workshop_b2b';
    ELSE
      calc_channel := 'sale_online';
    END IF;

    -- Bóc tách regex link từ note
    excel_link := (regexp_matches(o.note, '- Excel Báo giá:\s*(https?://[^\s\n]+)'))[1];
    pdf_link := (regexp_matches(o.note, '- PDF Báo giá:\s*(https?://[^\s\n]+)'))[1];
    carrier_txt := (regexp_matches(o.note, '- Đơn vị vận chuyển:\s*([^\n\r]+)'))[1];
    tracking_txt := (regexp_matches(o.note, '- Mã vận đơn:\s*([^\n\r]+)'))[1];

    has_vat_tag := (o.tags IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(o.tags) t WHERE LOWER(t) LIKE '%vat%'));

    new_order_id := gen_random_uuid();
    INSERT INTO printing.v2_orders (
      id, order_code, channel, customer_id, customer_name, customer_phone, customer_address, customer_email, customer_note,
      subtotal, shipping_fee, discount, has_vat, vat_amount, total_amount, actual_meters, cost_amount,
      status, payment_status, payment_method, design_url, quote_excel_url, quote_pdf_url, shipping_carrier, tracking_number,
      tags, original_legacy_id, created_at, updated_at
    ) VALUES (
      new_order_id,
      o.order_code,
      calc_channel,
      o.partner_id,
      COALESCE(o.p_name, 'Khách lẻ'),
      COALESCE(o.p_phone, ''),
      o.p_address,
      o.p_email,
      o.note,
      COALESCE(o.total_amount, 0),
      COALESCE(o.shipping_cost, 0),
      COALESCE(o.discount_amount, 0),
      has_vat_tag,
      CASE WHEN has_vat_tag THEN ROUND(COALESCE(o.total_amount, 0) * 0.08) ELSE 0 END,
      COALESCE(o.total_amount, 0) + COALESCE(o.shipping_cost, 0) - COALESCE(o.discount_amount, 0),
      COALESCE(o.quantity_actual, o.quantity_expected, 0),
      COALESCE(o.quantity_actual, o.quantity_expected, 0) * 150000,
      COALESCE(o.status, 'processing'),
      COALESCE(o.payment_status, 'unpaid'),
      'cod',
      o.design_link,
      excel_link,
      pdf_link,
      carrier_txt,
      tracking_txt,
      o.tags,
      o.id::text,
      o.created_at,
      COALESCE(o.created_at, NOW())
    ) ON CONFLICT (order_code) DO NOTHING;

    -- Thêm item mặc định nếu không có
    INSERT INTO printing.v2_order_items (
      order_id, product_name, product_type, quantity, unit, unit_price, subtotal, preview_image_url, design_file_url, created_at
    ) VALUES (
      new_order_id,
      CASE WHEN o.sticker_type = 'dtf_roll' THEN 'In tem UV DTF cuộn' ELSE 'In tem UV DTF cái/tờ' END,
      o.sticker_type,
      COALESCE(o.quantity_expected, 1),
      CASE WHEN o.sticker_type = 'dtf_roll' THEN 'mét' ELSE 'cái' END,
      COALESCE(o.unit_price, 0),
      COALESCE(o.total_amount, 0),
      o.preview_image,
      o.design_link,
      o.created_at
    );

  END FOR;
END $$;

-- Thông báo hoàn tất migration v2
SELECT 'Khởi tạo và ETL nạp dữ liệu bảng v2 thành công!' AS status;
