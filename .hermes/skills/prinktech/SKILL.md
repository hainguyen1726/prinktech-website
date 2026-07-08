---
name: prinktech
category: project-specific
tags: [nextjs, supabase, vps-deploy, dual-edit, prinktech, ssh-sync]
description: |
  Skill chuyên biệt cho dự án Website PrinK Tech (xưởng in UV DTF).
  Hỗ trợ dual-edit: sửa code từ Local Windows + VPS Linux, sync 2 chiều qua Git SSH, deploy Docker.
  Bao gồm GitHub workflow, rsync sync, và các script deploy/prinktech.
version: 1.1.0
author: Hermes + Prinktech Team
license: MIT
platforms: [windows, linux]
metadata:
  hermes:
    tags: [prinktech, nextjs, supabase, dual-edit, deploy]
    related_skills: [hermes-agent-skill-authoring, plan, systematic-debugging]
---

# 🖨️ PrinK Tech Website — Skill Chuyên Biệt

Dự án website xưởng in UV DTF PrinK Tech (`prinktech.netslive.com`).
Next.js 16 + Supabase (schema `printing`) + Docker trên VPS `180.93.146.26:3019`.

## 📁 Cấu trúc dự án

```
D:\16. Code\32-website-prinktech\
├── src/
│   ├── app/                  # App Router (pages, api routes, admin)
│   │   ├── admin/            # /admin/website, /admin/viet-bai, /admin/don-hang
│   │   ├── api/              # REST API endpoints
│   │   ├── mau-1/2/3/        # 3 themes fullscreen
│   │   └── ...
│   ├── components/           # PricingCalculator, OrderForm, Gallery...
│   └── lib/                  # supabaseClient, pricing, adminAuth...
├── public/                   # logos, images, robots.txt
├── migrations/               # SQL migration files
├── deploy-via-git.ps1        # Local deploy & push script (PowerShell)
├── deploy-vps-git.sh         # VPS deploy & pull script (bash)
├── docker-compose.yml        # Container node:20 + shared network
└── .env*                     # Supabase keys (KHÔNG commit)
```

---

## 🔄 Dual-Edit Strategy (Local ↔ VPS) - Giải pháp chính

### Mô hình hoạt động

```
Local Windows (D:\16. Code\32-website-prinktech)
        ↕  git push / pull (SSH)
GitHub (hainguyen1726/prinktech-website)
        ↕  git pull / push (SSH)
VPS Linux (/srv/website-prinktech)
        ↕  docker rebuild (deploy-vps-git.sh)
Production (prinktech.netslive.com:3019)
```

---

## 🔒 Quy tắc bắt buộc đối với AI Agent (Antigravity & Hermes)

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

## ⚙️ Cấu hình hạ tầng & Kết nối Supabase

- **Supabase**: Dùng chung `https://api-supabase.netslive.com` (schema `printing`)
- **Tránh lỗi SSL Handshake (`DEPTH_ZERO_SELF_SIGNED_CERT`)**:
  - Khi Next.js chạy ở server-side kết nối tới Supabase, **bắt buộc** sử dụng URL public (`SUPABASE_URL` hoặc `NEXT_PUBLIC_SUPABASE_URL`) trỏ tới domain chính thức (ví dụ: `https://api-supabase.netslive.com`).
  - **KHÔNG** sử dụng URL nội bộ container (loopback / HTTP) có chứng chỉ tự ký (self-signed cert) như `http://supabase-kong:8000` vì Node.js phía server-side sẽ từ chối kết nối và ném lỗi `fetch failed` hoặc `DEPTH_ZERO_SELF_SIGNED_CERT`.

---

## 🛠️ Các Lệnh Thường Dùng (Copy-Paste)

### Local Development
```bash
npm run dev              # http://localhost:3000
npm run build            # Production build
npx tsc --noEmit         # TypeScript check
npm run lint             # ESLint
```

### VPS (SSH)
```bash
# Xem logs container web realtime
docker compose -f /srv/website-prinktech/docker-compose.yml logs -f web

# Rebuild container sau khi sửa code/pull code mới (Bắt buộc)
bash deploy-vps-git.sh

# Vào container
docker exec -it prinktech-website bash
```

---

## 📋 Best Practices & Tránh Lỗi

1. **Luôn pull trước khi sửa** — Tránh xung đột code.
2. **Không commit `.env*` files** — Luôn exclude file cấu hình khi sync.
3. **Đẩy code từ Local** — Dùng lệnh PowerShell `.\deploy-via-git.ps1 -CommitMsg "Mô tả"` để deploy tự động từ xa.

---

**Tác giả skill**: Hermes Agent + Antigravity  
**Cập nhật**: 2026-07-08  
**Dự án**: prinktech-website (Next.js UV DTF printing website)
