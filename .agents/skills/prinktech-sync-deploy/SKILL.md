---
name: prinktech-sync-deploy
description: Hướng dẫn đồng bộ mã nguồn Git/SSH và deploy dự án Prinktech Website trên VPS dành cho AI Agent.
---

# Hướng dẫn Đồng bộ & Deploy cho AI Agent (Hermes/Claude)

Tài liệu này hướng dẫn cách AI Agent (như Hermes Agent trên VPS) đồng bộ mã nguồn qua Git/SSH và deploy dự án Prinktech Website, đồng thời phòng tránh các lỗi hạ tầng đã gặp.

## 📌 Thông tin hạ tầng & Kết nối
- **IP VPS**: `180.93.146.26` (User: `root`)
- **Đường dẫn thư mục dự án trên VPS**: `/srv/website-prinktech`
- **Docker Container Name**: `prinktech-website` (Chạy Next.js ở cổng `3019` bên ngoài, cổng `3000` bên trong container)
- **GitHub Repository**: `hainguyen1726/prinktech-website`
- **Giao thức đồng bộ**: Git qua SSH (`git@github.com:hainguyen1726/prinktech-website.git`)

---

## 🔒 Quy tắc bắt buộc đối với AI Agent (Quy tắc Dual-Edit)

Để tránh xung đột code (conflict) trực tiếp trên nhánh chính `master` khi sửa từ nhiều nơi, AI Agent phải tuân thủ nghiêm ngặt quy trình dưới đây:

### 1. Quy tắc hoạt động của Hermes (Trên VPS)

Khi Hermes (hoặc bất kỳ AI nào chạy trực tiếp trên VPS) bắt đầu thực hiện chỉnh sửa:

1. **Đồng bộ code master:**
   ```bash
   cd /srv/website-prinktech
   git checkout master
   git pull origin master
   ```

2. **Tạo nhánh phát triển riêng (Nhánh an toàn):** Luôn tạo nhánh riêng để làm việc thay vì sửa trực tiếp trên `master`:
   ```bash
   git checkout -b dev/hermes-$(date +%Y%m%d-%H%M)
   ```

3. **Thực hiện chỉnh sửa và build thử nghiệm trên VPS:**
   Sau khi chỉnh sửa xong, chạy script deploy để rebuild container Docker kiểm tra xem có lỗi compile Next.js/TypeScript không:
   ```bash
   bash deploy-vps-git.sh
   ```
   *Lưu ý: Bắt buộc phải chạy script deploy để rebuild container thì Next.js mới compile code mới (lệnh restart thông thường không có tác dụng).*

4. **Commit & Push lên nhánh riêng:**
   ```bash
   git add .
   git commit -m "hermes: [mô tả ngắn gọn thay đổi]"
   git push origin dev/hermes-$(date +%Y%m%d-%H%M)
   ```

---

### 2. Quy tắc hoạt động của Antigravity (Dưới Local)

Khi Antigravity (hoặc bất kỳ AI nào dưới máy Local) muốn gộp code của VPS và deploy chính thức:

1. **Kéo code của Hermes về Local:**
   ```bash
   git fetch origin
   git merge origin/dev/hermes-[tên-nhánh-của-hermes]
   ```

2. **Push lên master của GitHub:**
   ```bash
   git push origin master
   ```

3. **Cập nhật lại VPS về master chuẩn:**
   ```bash
   ssh vps "cd /srv/website-prinktech && git checkout master && git pull origin master && bash deploy-vps-git.sh"
   ```

---

## ⚙️ Tránh lỗi SSL Handshake Supabase (`DEPTH_ZERO_SELF_SIGNED_CERT`)

Bài học kinh nghiệm từ dự án `TKMG-AMZ`:
- Khi Next.js chạy ở server-side kết nối tới Supabase, **bắt buộc** sử dụng URL public (`SUPABASE_URL` hoặc `NEXT_PUBLIC_SUPABASE_URL`) trỏ tới domain chính thức (ví dụ: `https://api-supabase.netslive.com`).
- **KHÔNG** sử dụng URL nội bộ container (loopback / HTTP) có chứng chỉ tự ký (self-signed cert) như `http://supabase-kong:8000` vì Node.js phía server-side sẽ từ chối kết nối và ném lỗi `fetch failed` hoặc `DEPTH_ZERO_SELF_SIGNED_CERT`.

---

## 🛠️ Các Script Hỗ trợ Sẵn có

- **`deploy-via-git.ps1` (Local)**: Chạy từ local PowerShell để push code local lên GitHub và SSH kích hoạt deploy trên VPS.
- **`deploy-vps-git.sh` (VPS)**: Chạy trên VPS để tự động pull code, chạy container Node:20 cài dependency, build production Next.js, restart container chính và reload Caddy.
