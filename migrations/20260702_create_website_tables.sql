-- Migration: Tạo các bảng cho website PrinK Tech (Schema: printing)
-- Thời gian: 02/07/2026

CREATE SCHEMA IF NOT EXISTS printing;

-- 1. Bảng lưu trữ bài viết/tin tức (web_posts)
CREATE TABLE IF NOT EXISTS printing.web_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT,
    content TEXT,
    cover_image TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author TEXT DEFAULT 'PrinK Tech',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng lưu trữ sản phẩm (web_products)
CREATE TABLE IF NOT EXISTS printing.web_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC DEFAULT 0,
    image_url TEXT,
    category TEXT CHECK (category IN ('standard', 'embossed', 'others')), -- standard: UV DTF thường, embossed: UV DTF nổi, others: Khác
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng cấu hình giá in động cho calculator (web_price_items)
CREATE TABLE IF NOT EXISTS printing.web_price_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_name TEXT NOT NULL, -- e.g. 'UV DTF Thường', 'UV DTF Nổi 3D'
    unit TEXT NOT NULL, -- e.g. 'A3', 'Mét tới'
    price_sheet JSONB NOT NULL, -- mảng chứa các khoảng số lượng và đơn giá, ví dụ: [{"min": 1, "max": 5, "price": 80000}, ...]
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng tiếp nhận yêu cầu báo giá từ khách hàng (web_quote_requests)
CREATE TABLE IF NOT EXISTS printing.web_quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    material_type TEXT,
    quantity NUMERIC,
    dimensions TEXT, -- e.g. 'A3', 'Mét tới'
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phân quyền cho authenticator (Supabase API role)
GRANT ALL PRIVILEGES ON TABLE printing.web_posts TO authenticator;
GRANT ALL PRIVILEGES ON TABLE printing.web_products TO authenticator;
GRANT ALL PRIVILEGES ON TABLE printing.web_price_items TO authenticator;
GRANT ALL PRIVILEGES ON TABLE printing.web_quote_requests TO authenticator;

-- Chèn dữ liệu ban đầu mẫu (Seed Data)

-- Bảng giá
INSERT INTO printing.web_price_items (material_name, unit, price_sheet, sort_order) VALUES
('In theo mét dài (Khổ 60cm)', 'mét', '[{"min": 1, "max": 1, "price": 400000}, {"min": 2, "max": 5, "price": 320000}, {"min": 6, "max": 15, "price": 260000}, {"min": 16, "max": 50, "price": 210000}, {"min": 51, "max": 100, "price": 180000}, {"min": 101, "max": 99999, "price": 150000}]'::jsonb, 1),
('In tờ A4 (20×28cm)', 'tờ', '[{"min": 1, "max": 4, "price": 80000}, {"min": 5, "max": 49, "price": 45000}, {"min": 50, "max": 99999, "price": 28000}]'::jsonb, 2),
('In tờ A3 (29×40cm)', 'tờ', '[{"min": 1, "max": 4, "price": 150000}, {"min": 5, "max": 49, "price": 85000}, {"min": 50, "max": 99999, "price": 55000}]'::jsonb, 3),
('Tem nhỏ (dưới 3×3cm) – Cắt bế sẵn', 'chiếc', '[{"min": 100, "max": 499, "price": 2200}, {"min": 500, "max": 999, "price": 1400}, {"min": 1000, "max": 4999, "price": 800}, {"min": 5000, "max": 9999, "price": 500}, {"min": 10000, "max": 99999, "price": 300}]'::jsonb, 4),
('Tem trung bình (4×4–5×5cm) – Cắt bế sẵn', 'chiếc', '[{"min": 100, "max": 499, "price": 3800}, {"min": 500, "max": 999, "price": 2500}, {"min": 1000, "max": 99999, "price": 1500}]'::jsonb, 5),
('Tem lớn (6×6–8×8cm) – Cắt bế sẵn', 'chiếc', '[{"min": 100, "max": 499, "price": 6500}, {"min": 500, "max": 999, "price": 4200}, {"min": 1000, "max": 99999, "price": 2800}]'::jsonb, 6)
ON CONFLICT DO NOTHING;

-- Sản phẩm mẫu
INSERT INTO printing.web_products (name, slug, description, price, category, is_featured) VALUES
('Tem UV DTF Thường - Độ sắc nét cao', 'tem-uv-dtf-thuong-sac-net', 'Tem in UV DTF tiêu chuẩn với độ sắc nét vượt trội, độ bám dính cực kỳ cao trên mọi bề mặt cứng như cốc, bình giữ nhiệt, kính, nhựa. Thích hợp in logo nhãn hàng sỉ số lượng lớn.', 45000, 'standard', true),
('Tem UV DTF Nổi 3D ánh bóng hiệu ứng gương', 'tem-uv-dtf-noi-3d-bong', 'Tem in UV DTF nổi với lớp phủ bóng dày tạo hiệu ứng 3D nổi bật, sang trọng khi chạm vào. Thích hợp dán các sản phẩm cao cấp, quà tặng doanh nghiệp.', 85000, 'embossed', true),
('Tem decal dán bình giữ nhiệt UV DTF nổi', 'tem-decal-binh-giu-nhiet-uv-dtf-noi', 'Decal chuyên dụng dán bình giữ nhiệt kim loại. Lớp keo siêu bám dính, chống xước, chống nước, có thể rửa bằng máy rửa bát không lo bong tróc.', 80000, 'embossed', false),
('Logo tem dán mũ bảo hiểm UV DTF', 'logo-tem-dan-mu-bao-hiem-uv-dtf', 'Tem dán logo nón bảo hiểm co giãn ôm khít bề mặt cong của nón. Độ bền màu ngoài trời lên tới 3 năm dưới mọi thời tiết khắc nghiệt.', 35000, 'standard', false)
ON CONFLICT DO NOTHING;

-- Bài viết mẫu
INSERT INTO printing.web_posts (title, slug, summary, content, cover_image, status) VALUES
('Hướng dẫn dán tem UV DTF đúng cách giúp tem siêu bền', 'huong-dan-dan-tem-uv-dtf-dung-cach', 'Việc dán tem UV DTF tuy đơn giản nhưng cần thực hiện đúng quy trình để đảm bảo keo dính bám chặt 100% vào bề mặt sản phẩm. Dưới đây là 4 bước chuẩn từ kỹ sư xưởng PrinK Tech.', 'Để tem in UV DTF đạt độ bền tối đa và bám dính tốt nhất, bạn cần thực hiện theo các bước sau đây:\n\n### Bước 1: Làm sạch bề mặt dán\n- Sử dụng khăn sạch ẩm hoặc cồn để lau sạch bụi bẩn, dầu mỡ bám trên bề mặt vật cứng (ly, cốc, chai lọ, nón bảo hiểm...).\n- Chờ bề mặt khô hoàn toàn trước khi tiến hành dán.\n\n### Bước 2: Bóc lớp màng đế bảo vệ keo (Màng phía dưới)\n- Lật ngược tấm tem, bóc từ từ lớp đế nhựa dày phía sau để lộ lớp keo dính và các chi tiết in.\n- Lưu ý không chạm tay trực tiếp vào bề mặt keo để tránh giảm độ dính.\n\n### Bước 3: Dán tem và vuốt đều\n- Đặt tem vào vị trí cần dán chuẩn xác (tránh bóc ra dán lại vì sẽ làm hỏng lớp keo).\n- Sử dụng ngón tay hoặc miếng gạt nhựa để vuốt mạnh và đều từ giữa ra các mép tem nhằm loại bỏ bong bóng khí và giúp keo bám chặt.\n\n### Bước 4: Bóc màng định vị (Màng chuyển phía trên)\n- Chờ khoảng 1 - 2 phút để keo ổn định.\n- Từ từ bóc lớp màng nilon trong suốt phía trên theo góc 180 độ (sát với bề mặt sản phẩm).\n- Nếu có chi tiết nhỏ nào chưa bám, hãy đặt màng lại và miết mạnh thêm một lần nữa.\n\nChúc bạn thực hiện thành công!', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=60', 'published'),
('So sánh in UV DTF nổi 3D và in UV phẳng thường', 'so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang', 'In UV DTF nổi và in phẳng thông thường khác nhau như thế nào? Khi nào doanh nghiệp nên chọn in nổi 3D? Hãy cùng PrinK Tech phân tích ưu nhược điểm của từng công nghệ.', 'Công nghệ in ấn ngày càng phát triển, mang lại nhiều lựa chọn trang trí sản phẩm đa dạng cho doanh nghiệp. Trong đó, in UV DTF nổi 3D và in phẳng thường là hai giải pháp phổ biến nhất. Dưới đây là phân tích chi tiết:\n\n### 1. In UV phẳng thường\n- **Định nghĩa:** Mực in được phun trực tiếp lên vật liệu phẳng rồi sấy khô bằng đèn tia cực tím.\n- **Ưu điểm:** Giá thành rẻ hơn, sản xuất nhanh đối với vật phẩm dạng tấm phẳng phẳng tuyệt đối.\n- **Hạn chế:** Chỉ in được vật liệu phẳng, không in được các chai lọ tròn hay vật liệu lồi lõm cong phức tạp.\n\n### 2. In UV DTF Nổi 3D\n- **Định nghĩa:** Mực in và keo được in lên một màng chuyển (màng A), phủ bóng nổi nhiều lớp tạo hiệu ứng 3D dày, sau đó ép lớp màng định vị (màng B). Người sử dụng chỉ cần bóc ra và dán lên sản phẩm bất kỳ.\n- **Ưu điểm:** \n  - Dán được trên mọi vật liệu cong, tròn, góc cạnh.\n  - Hiệu ứng nổi 3D sờ được bằng tay cực kỳ bắt mắt và cao cấp.\n  - Kháng nước, chống trầy xước vượt trội.\n- **Hạn chế:** Giá thành cao hơn in phẳng thường một chút do chi phí vật tư màng phim chuyển đổi.\n\n### Khuyên dùng từ PrinK Tech:\nNếu sản phẩm của bạn là các ly cốc hình tròn, bình giữ nhiệt, quà tặng hình thù phức tạp hoặc cần tăng nhận diện thương hiệu cao cấp, hãy chọn **In UV DTF Nổi 3D** để tạo sự khác biệt vượt trội.', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=60', 'published')
ON CONFLICT DO NOTHING;
