-- Thêm cột drive_folder_id cho v2_customers nếu chưa có
ALTER TABLE printing.v2_customers 
ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(255);

-- Khởi tạo Bảng Kho Mẫu Thiết Kế Khách Hàng
CREATE TABLE IF NOT EXISTS printing.v2_customer_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES printing.v2_customers(id) ON DELETE CASCADE,
    design_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    drive_file_id VARCHAR(255),
    drive_file_url TEXT NOT NULL,
    preview_image_url TEXT,
    product_type VARCHAR(100) DEFAULT 'tem',
    use_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo Index tăng tốc truy vấn theo customer_id
CREATE INDEX IF NOT EXISTS idx_v2_designs_customer ON printing.v2_customer_designs(customer_id);

-- Phân quyền cho tất cả role kết nối
GRANT ALL ON TABLE printing.v2_customer_designs TO postgres, service_role, anon, authenticated;
