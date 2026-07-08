-- Migration: Tạo bảng web_videos lưu trữ video YouTube, Reels, TikTok (Schema: printing)
-- Thời gian: 02/07/2026

CREATE TABLE IF NOT EXISTS printing.web_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'reels', 'tiktok')),
    video_url TEXT NOT NULL,
    cover_image TEXT,
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phân quyền cho authenticator
GRANT ALL PRIVILEGES ON TABLE printing.web_videos TO authenticator;

-- Chèn dữ liệu mẫu (Seed Data)
INSERT INTO printing.web_videos (title, description, platform, video_url, cover_image, display_order, is_visible) VALUES
('Quá trình gia công tem UV DTF nổi 3D thực tế tại xưởng', 'Chi tiết các bước in phun màu, phủ keo nổi bóng gương sắc nét và sấy khô bằng đèn UV LED.', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=80', 1, true),
('Hướng dẫn dán tem nhãn UV DTF lên cốc thủy tinh siêu chắc', 'Các lưu ý quan trọng khi vệ sinh bề mặt và vuốt phẳng màng định vị để tem bám bền vĩnh viễn.', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80', 2, true),
('Thử thách cọ rửa tem UV DTF nổi 3D bằng máy rửa bát', 'Đánh giá độ bền bỉ vượt trội của tem in nổi thương hiệu PrinK Tech sau hàng chục chu kỳ tẩy rửa.', 'reels', 'https://www.facebook.com/reel/123456789012345', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80', 3, true),
('Showcase các mẫu tem dán trang trí bình giữ nhiệt cực chất', 'Khám phá bộ sưu tập tem in UV DTF độc đáo dành riêng cho dân thể thao và quà tặng doanh nghiệp.', 'tiktok', 'https://www.tiktok.com/@prinktech/video/1234567890123456789', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80', 4, true)
ON CONFLICT DO NOTHING;
