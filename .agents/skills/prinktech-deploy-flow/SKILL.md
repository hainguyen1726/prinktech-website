---
name: prinktech-deploy-flow
description: Hướng dẫn đồng bộ mã nguồn dự án Prinktech Website và deploy Docker container giữa Local, GitHub và Hermes Agent trên VPS. Bao gồm workflow Antigravity (Local) và Hermes (VPS).
version: 1.0.0
author: Antigravity + Prinktech Team
license: MIT
platforms: [windows, linux]
metadata:
  hermes:
    tags: [prinktech, nextjs, supabase, dual-edit, deploy]
    related_skills: [plan, systematic-debugging]
---

# 🚀 Prinktech Website Deployment & Synchronization Protocol

Tài liệu này định nghĩa quy trình làm việc và giao thức đồng bộ mã nguồn giữa Local (PC), GitHub, và Hermes Agent trên VPS nhằm đảm bảo không xảy ra xung đột code (conflict) hay lỗi cấu hình hạ tầng cho dự án Prinktech Website.

---

## 🏗️ Kiến trúc Dual-Edit

```
Local (Windows)  <──── Git/GitHub ────>  VPS Production (Linux)
  (Antigravity)      (Pull / Push)            (Hermes / VPS)
```

- **Hạ tầng VPS:**
  - IP: `180.93.146.26`
  - Thư mục chạy dự án: `/srv/website-prinktech/`
  - Cơ chế build: Next.js chạy qua Docker compose (image node:20), mount volume mã nguồn trực tiếp từ host, build bên ngoài container bằng docker run.
  - Docker Compose: `docker-compose.yml` (web container)
  - Caddy reverse proxy trên host chuyển hướng traffic tới container port `3019`.

---

## 🔒 Quy tắc bắt buộc đối với AI Agent (Antigravity & Hermes)

### 1. Quy tắc hoạt động của Hermes (Trên VPS)

Khi Hermes (hoặc bất kỳ AI nào chạy trực tiếp trên VPS) bắt đầu thực hiện chỉnh sửa:

1. **Kiểm tra và Pull code mới nhất:**
   ```bash
   cd /srv/website-prinktech
   git checkout master
   git pull origin master
   ```

2. **Chia nhánh an toàn:** Luôn tạo hoặc chuyển sang một nhánh phát triển riêng để tránh ghi đè trực tiếp lên nhánh master:
   ```bash
   git checkout -b dev/hermes-$(date +%Y%m%d-%H%M)
   ```

3. **Commit & Push ngay sau khi sửa:**
   ```bash
   git add .
   git commit -m "hermes: [mô tả ngắn gọn thay đổi]"
   git push origin dev/hermes-$(date +%Y%m%d-%H%M)
   ```

4. **Bắt buộc Rebuild & Deploy Container:** Sau khi code được pull hoặc cập nhật trên VPS, **phải** chạy script deploy để Next.js compile lại code mới và reload Caddy (restart thông thường sẽ không có tác dụng compile lại mã nguồn):
   ```bash
   bash deploy-vps-git.sh
   ```

### 2. Quy tắc hoạt động của Antigravity (Dưới Local)

Khi Antigravity (hoặc bất kỳ AI nào chạy dưới máy Local) thực hiện chỉnh sửa và muốn deploy:

1. **Kéo code của Hermes về trước:**
   ```bash
   git fetch origin
   git pull origin master
   ```

2. **Gộp nhánh phát triển (nếu có):** Nếu Hermes sửa trên nhánh `dev/hermes-*`, hãy gộp nhánh đó vào local chính thức:
   ```bash
   git merge origin/dev/hermes-*
   ```

3. **Deploy lên VPS từ xa:** Sau khi commit và push code từ local, chạy script deploy tự động để đẩy code lên GitHub và ra lệnh cho VPS tự động pull & rebuild:
   ```bash
   # Chạy từ local PowerShell
   .\deploy-via-git.ps1 -CommitMsg "deploy: update features"
   ```

---

## ⚙️ Cấu hình hạ tầng & Kết nối Supabase

### Tránh lỗi SSL handshake (`DEPTH_ZERO_SELF_SIGNED_CERT`)

Khi Next.js chạy phía server-side thực hiện truy vấn:

- **Server-side query:** Bắt buộc sử dụng `SUPABASE_URL` (https://api-supabase.netslive.com) — KHÔNG dùng URL local của container có SSL self-signed cert khiến Node.js reject kết nối.
- **Client-side query:** Sử dụng `NEXT_PUBLIC_SUPABASE_URL` (https://api-supabase.netslive.com)

---

## 🛠️ Các lệnh Command hữu ích cho AI Agent

### Rebuild container web trên VPS
```bash
bash deploy-vps-git.sh
```

### Xem logs của container web trên VPS
```bash
docker compose -f /srv/website-prinktech/docker-compose.yml logs --tail 100 -f web
```

### Kiểm tra database connection từ container
```bash
docker exec prinktech-website node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('printing_orders').select('count', {count:'exact', head:true}).then(r => console.log('Orders:', r.count));
"
```

---

## ⚠️ Lưu ý quan trọng

1. **KHÔNG bao giờ** commit `.env`, `.env.local`, credentials vào Git.
2. **BẮT BUỘC** rebuild container bằng `deploy-vps-git.sh` sau khi thay đổi code.
3. **BẮT BUỘC** pull trước khi push để tránh conflict.
4. **KIỂM TRA LẠI** `package-lock.json` sau khi chạy npm install để tránh phân kỳ Git không đáng có trên VPS.

---

## 📋 Verification Checklist khi làm việc với skill này

- [ ] Đọc tài liệu quy trình đồng bộ trước khi chỉnh sửa.
- [ ] Xác định đang edit từ Local hay VPS để chọn đúng nhánh và luồng.
- [ ] Không commit file cấu hình nhạy cảm (.env*).
- [ ] Sau khi deploy: kiểm tra logs và chạy thử website tại https://prinktech.netslive.com.
