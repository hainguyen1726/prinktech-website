---
name: prinktech-deploy-flow
description: Hướng dẫn đồng bộ mã nguồn dự án Prinktech Website và deploy Docker container giữa Local, GitHub và Hermes Agent trên VPS. Bao gồm workflow Antigravity (Local) và Hermes (VPS).
---

# 🚀 Prinktech Website Deployment & Synchronization Protocol

Tài liệu này định nghĩa quy trình làm việc và giao thức đồng bộ mã nguồn giữa Local (PC), GitHub, và Hermes Agent trên VPS nhằm đảm bảo không xảy ra xung đột code (conflict) hay lỗi cấu hình hạ tầng cho dự án Prinktech Website.

---

## 🏗️ Kiến trúc Dual-Edit

```
Local (Windows)  <──── Git/GitHub ────>  VPS Production (Linux)
  (Antigravity)      (Pull / Push)            (Hermes / VPS)
```

- **Hạ tầng VPS Production (Nơi chạy web chính thức):**
  - IP: `180.93.146.26` (User: `root`)
  - Thư mục chạy dự án: `/srv/website-prinktech/`
  - Cơ chế build: Next.js chạy qua Docker compose (image node:20), mount volume mã nguồn trực tiếp từ host, build bên ngoài container bằng docker run.
  - Docker Compose: `/srv/website-prinktech/docker-compose.yml` (web container)
  - Caddy reverse proxy trên host chuyển hướng traffic tới container port `3019`.

- **Hermes Agent:**
  - Chạy trên VPS `157.10.198.146` và **kết nối SSH từ xa** sang `/srv/website-prinktech/` trên VPS Production `180.93.146.26` để sửa code và thực hiện deploy.

---

## 🔒 Quy tắc bắt buộc đối với AI Agent (Antigravity & Hermes)

### 1. Quy tắc hoạt động của Hermes (Trên VPS)

Khi Hermes (hoặc bất kỳ AI nào chạy trên VPS Hermes `157.10.198.146`) bắt đầu thực hiện chỉnh sửa:

1. **Kết nối SSH sang VPS Production:**
   ```bash
   ssh root@180.93.146.26
   ```
   *(Hoặc sử dụng alias host `vps` nếu đã cấu hình)*

2. **Kiểm tra và Pull code mới nhất trên VPS Production:**
   ```bash
   cd /srv/website-prinktech
   git checkout master
   git pull origin master
   ```

3. **Chia nhánh an toàn:** Luôn tạo hoặc chuyển sang một nhánh phát triển riêng để tránh ghi đè trực tiếp lên nhánh chính:
   ```bash
   git checkout -b dev/hermes-$(date +%Y%m%d-%H%M)
   ```

4. **Commit & Push ngay sau khi sửa:**
   ```bash
   git add .
   git commit -m "hermes: [mô tả ngắn gọn thay đổi]"
   git push origin dev/hermes-$(date +%Y%m%d-%H%M)
   ```

5. **Bắt buộc Rebuild & Deploy Container:** Sau khi cập nhật code trên VPS Production, **phải** chạy script deploy để Next.js compile lại code mới và reload Caddy (restart thông thường sẽ không có tác dụng compile lại mã nguồn):
   ```bash
   bash deploy-vps-git.sh
   ```

---

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
   ```powershell
   # Chạy từ local PowerShell
   .\deploy-via-git.ps1 -CommitMsg "deploy: update features"
   ```

---

## ⚙️ Cấu hình hạ tầng & Kết nối Supabase

### Tránh lỗi SSL handshake (`DEPTH_ZERO_SELF_SIGNED_CERT`)

Khi Next.js chạy phía server-side thực hiện truy vấn:

- **Server-side query:** Bắt buộc sử dụng URL public `SUPABASE_URL` hoặc `NEXT_PUBLIC_SUPABASE_URL` (https://api-supabase.netslive.com) — KHÔNG dùng URL local của container có SSL self-signed cert khiến Node.js từ chối kết nối.
- **Client-side query:** Sử dụng `NEXT_PUBLIC_SUPABASE_URL` (https://api-supabase.netslive.com)

---

## 🛠️ Các lệnh Command hữu ích cho AI Agent

### Rebuild container web trên VPS Production (thông qua SSH)
```bash
ssh root@180.93.146.26 "cd /srv/website-prinktech && bash deploy-vps-git.sh"
```

### Xem logs của container web trên VPS Production
```bash
ssh root@180.93.146.26 "docker compose -f /srv/website-prinktech/docker-compose.yml logs --tail 100 -f web"
```

### Kiểm tra database connection từ container trên VPS Production
```bash
ssh root@180.93.146.26 "docker exec prinktech-website node -e \"
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('printing_orders').select('count', {count:'exact', head:true}).then(r => console.log('Orders:', r.count));
\""
```

---

## ⚠️ Lưu ý quan trọng

1. **KHÔNG bao giờ** commit `.env`, `.env.local`, credentials vào Git.
2. **BẮT BUỘC** rebuild container bằng `deploy-vps-git.sh` sau khi thay đổi code.
3. **BẮT BUỘC** pull trước khi push để tránh conflict.
4. **KIỂM TRA LẠI** `package-lock.json` sau khi chạy npm install để tránh phân kỳ Git không đáng có trên VPS.

---

## 🔄 Workflow đầy đủ (Antigravity → Hermes)

### Scenario 1: Antigravity (Local) sửa code → Deploy

```bash
# 1. Antigravity làm việc trên Local Windows
cd d:/16. Code/32-website-prinktech
git pull origin master

# 2. Sửa code, commit
git add .
git commit -m "feat: [mô tả]"
git push origin master

# 3. Trigger deploy từ xa
powershell .\deploy-via-git.ps1 -CommitMsg "deploy: update features"
```

### Scenario 2: Hermes (VPS) sửa code → Sync về Local

```bash
# 1. Hermes kết nối từ VPS 157.10.198.146 sang VPS Production 180.93.146.26
ssh root@180.93.146.26
cd /srv/website-prinktech
git checkout master
git pull origin master

# 2. Tạo nhánh riêng để sửa
git checkout -b dev/hermes-$(date +%Y%m%d)
# Sửa code...
git add .
git commit -m "hermes: [mô tả]"
git push origin dev/hermes-*

# 3. Chạy thử nghiệm trên VPS Production
bash deploy-vps-git.sh

# 4. Antigravity (Local) pull về và gộp
git fetch origin
git merge origin/dev/hermes-*
git push origin master

# 5. Đưa VPS Production về master chuẩn
ssh root@180.93.146.26 "cd /srv/website-prinktech && git checkout master && git pull origin master && bash deploy-vps-git.sh"
```

---

## 📋 Trạng thái hiện tại (Cập nhật: 2026-07-09)

- **Branch chính:** `master`
- **Thư mục dự án:** `/srv/website-prinktech`
- **Docker Container:** `prinktech-website` (Port mapping: 3019 -> 3000)
- **Domain:** `https://prinktech.netslive.com`

---

## 📞 Support

- **VPS Production IP:** `180.93.146.26`
- **VPS Hermes IP:** `157.10.198.146`
- **GitHub:** https://github.com/hainguyen1726/prinktech-website
