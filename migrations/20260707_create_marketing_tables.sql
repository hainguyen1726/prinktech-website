-- Migration: Tạo schema và các bảng phục vụ Dashboard Marketing & Social CRM
-- Thời gian: 07/07/2026

-- Tạo schema marketing độc lập
CREATE SCHEMA IF NOT EXISTS marketing;

-- 1. Bảng lưu trữ chiến dịch quảng cáo (marketing.campaigns)
CREATE TABLE IF NOT EXISTS marketing.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'shopee', 'tiktok', 'google')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    budget NUMERIC DEFAULT 0,
    budget_type TEXT DEFAULT 'daily' CHECK (budget_type IN ('daily', 'lifetime')),
    start_date DATE,
    end_date DATE,
    fb_campaign_id TEXT UNIQUE, -- ID chiến dịch trên Facebook để đồng bộ API
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng lưu trữ số liệu báo cáo hàng ngày (marketing.daily_reports)
CREATE TABLE IF NOT EXISTS marketing.daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES marketing.campaigns(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    spend NUMERIC DEFAULT 0, -- Số tiền chi tiêu (VNĐ)
    impressions INTEGER DEFAULT 0, -- Lượt hiển thị
    clicks INTEGER DEFAULT 0, -- Lượt nhấp chuột
    conversations INTEGER DEFAULT 0, -- Số tin nhắn mới bắt đầu
    purchases INTEGER DEFAULT 0, -- Số đơn hàng chốt được
    revenue NUMERIC DEFAULT 0, -- Doanh thu mang lại (VNĐ)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (campaign_id, report_date)
);

-- 3. Bảng lưu trữ cuộc hội thoại & bình luận Facebook (marketing.fb_conversations)
CREATE TABLE IF NOT EXISTS marketing.fb_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fb_conversation_id TEXT UNIQUE NOT NULL, -- ID hội thoại của FB (Inbox) hoặc ID bình luận (Comment)
    type TEXT NOT NULL CHECK (type IN ('inbox', 'comment')),
    customer_name TEXT NOT NULL,
    customer_fb_id TEXT,
    last_message TEXT,
    has_phone BOOLEAN DEFAULT false,
    phone_number TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'ignored')),
    fb_post_id TEXT, -- ID bài đăng nếu là comment
    fb_post_title TEXT, -- Nội dung bài post để hiển thị dễ hiểu
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng lưu trữ lịch sử tin nhắn chi tiết trong cuộc trò chuyện (marketing.fb_messages)
CREATE TABLE IF NOT EXISTS marketing.fb_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES marketing.fb_conversations(id) ON DELETE CASCADE,
    fb_message_id TEXT UNIQUE NOT NULL,
    sender_name TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    message_text TEXT,
    created_time TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 5. Bảng cấu hình API Tokens và Cài đặt Marketing (marketing.settings)
CREATE TABLE IF NOT EXISTS marketing.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cấp quyền truy cập schema cho authenticator role
GRANT USAGE ON SCHEMA marketing TO authenticator;

-- Cấp toàn quyền trên các bảng cho authenticator role (dùng cho API Supabase Auth/Client)
GRANT ALL PRIVILEGES ON TABLE marketing.campaigns TO authenticator;
GRANT ALL PRIVILEGES ON TABLE marketing.daily_reports TO authenticator;
GRANT ALL PRIVILEGES ON TABLE marketing.fb_conversations TO authenticator;
GRANT ALL PRIVILEGES ON TABLE marketing.fb_messages TO authenticator;
GRANT ALL PRIVILEGES ON TABLE marketing.settings TO authenticator;
