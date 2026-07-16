-- Migration: Fix constraint status của bảng printing.orders
-- Thêm các trạng thái còn thiếu: pending_file, processing, delivered
-- Ngày: 2026-07-16

-- Bước 1: Xóa constraint cũ (thử nhiều tên có thể xảy ra)
DO $$
DECLARE
  c_name TEXT;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'printing.orders'::regclass
    AND contype = 'c'
    AND conname ILIKE '%status%';
  IF c_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE printing.orders DROP CONSTRAINT ' || quote_ident(c_name);
  END IF;
END $$;

-- Bước 2: Tạo lại constraint với đầy đủ tất cả các trạng thái
ALTER TABLE printing.orders
ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'pending_file',
  'pending',
  'processing',
  'confirmed',
  'printing',
  'shipped',
  'delivered',
  'cancelled'
));

-- Bước 3: Đảm bảo các cột timestamp tồn tại
ALTER TABLE printing.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE printing.orders ADD COLUMN IF NOT EXISTS shipped_at    TIMESTAMPTZ;
ALTER TABLE printing.orders ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ;
