---
name: prinktech
category: project-specific
tags: [nextjs, supabase, vps-deploy, dual-edit, prinktech, ssh-sync]
description: |
  Skill chuyên biệt cho dự án Website PrinK Tech (xưởng in UV DTF).
  Hỗ trợ dual-edit Sandbox: sửa code tại Dev Workspace, sync 2 chiều qua Git SSH, và deploy Production.
version: 1.2.0
author: Hermes + Prinktech Team
license: MIT
platforms: [windows, linux]
metadata:
  hermes:
    tags: [prinktech, nextjs, supabase, dual-edit, deploy]
    related_skills: [hermes-agent-skill-authoring, plan, systematic-debugging]
---

# 🖨️ PrinK Tech Website — Skill Chuyên Biệt (Hermes Sandbox Mode)

Dự án website xưởng in UV DTF PrinK Tech (`prinktech.netslive.com`).

---

## 🏗️ 1. Môi trường phát triển & Cấu trúc thư mục

Để bảo vệ hệ thống Production đang chạy khỏi downtime, AI Agent **bắt buộc** phải phân biệt rõ 2 thư mục trên VPS:

1. **Production (Web chạy chính thức - Cổng 3019):**
   - **Đường dẫn**: `/srv/website-prinktech/`
   - **Quy tắc**: Đây là thư mục bất biến chạy thực tế cho người dùng. **CẤM KỴ: AI Agent không được chỉnh sửa hoặc pull trực tiếp tại đây**.

2. **Dev Workspace (Nơi làm việc của Hermes):**
   - **Đường dẫn**: `/home/hermes/workspaces/website-prinktech/`
   - **Quy tắc**: Đây là nơi bạn (Hermes Agent) thực hiện viết code, cài thư viện và build test.

---

## 🔒 2. Quy tắc hoạt động bắt buộc đối với Hermes Agent

Khi bạn nhận nhiệm vụ sửa code hoặc phát triển tính năng trên VPS:

1. **Di chuyển vào đúng Dev Workspace:**
   ```bash
   cd /home/hermes/workspaces/website-prinktech
   ```

2. **Cập nhật mã nguồn mới nhất:**
   ```bash
   git checkout master
   git pull origin master
   ```

3. **Tạo nhánh phát triển riêng:**
   ```bash
   git checkout -b dev/hermes-$(date +%Y%m%d-%H%M)
   ```

4. **Tiến hành chỉnh sửa code.**
   *Lưu ý vị trí các tệp tin sản phẩm*:
   - Trang danh sách sản phẩm: `src/app/san-pham/page.tsx`
   - Trang chi tiết sản phẩm: `src/app/san-pham/[slug]/page.tsx`
   - Component tính giá: `src/components/PricingCalculator.tsx`

5. **Build thử nghiệm cục bộ (Bắt buộc):** Chạy lệnh build Next.js ngay trên host tại Dev Workspace để kiểm tra lỗi biên dịch TypeScript/Lint:
   ```bash
   npm run build
   ```
   *Quá trình build Next.js bắt buộc phải Compile thành công 100% trước khi đẩy code.*

6. **Commit và đẩy lên GitHub:**
   ```bash
   git add .
   git commit -m "hermes: [mô tả thay đổi]"
   git push origin dev/hermes-$(date +%Y%m%d-%H%M)
   ```

---

## ⚙️ Tránh lỗi SSL Handshake Supabase (`DEPTH_ZERO_SELF_SIGNED_CERT`)

- Khi gọi truy vấn server-side (API Routes, Server Components) đến Supabase: **Bắt buộc** sử dụng URL public (`SUPABASE_URL` hoặc `NEXT_PUBLIC_SUPABASE_URL` trỏ tới domain `https://api-supabase.netslive.com`).
- **KHÔNG** sử dụng URL nội bộ container (loopback / HTTP) như `http://supabase-kong:8000` vì Node.js phía server-side sẽ reject kết nối.

---

## 🛠️ Các Lệnh Thường Dùng (Copy-Paste)

### Kiểm tra build cục bộ tại Dev Workspace
```bash
cd /home/hermes/workspaces/website-prinktech
npm run build
```

### Xem logs container Production (đọc từ xa)
```bash
docker compose -f /srv/website-prinktech/docker-compose.yml logs -f web
```
