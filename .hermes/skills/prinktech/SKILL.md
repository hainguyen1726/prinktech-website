---
name: prinktech
category: project-specific
tags: [nextjs, supabase, vps-deploy, dual-edit, prinktech]
description: |
  Skill chuyên biệt cho dự án Website PrinK Tech (xưởng in UV DTF).
  Hỗ trợ dual-edit: sửa code từ Local Windows + VPS Linux, sync 2 chiều, deploy Docker.
  Bao gồm GitHub workflow, rsync sync, và các script deploy/prinktech.
---

# 🖨️ PrinK Tech Website — Skill Chuyên Biệt

Dự án website xưởng in UV DTF PrinK Tech (`prinktech.netslive.com`).
Next.js 16 + Supabase (schema `printing`) + Docker trên VPS `180.93.146.26:3019`.

## 📁 Cấu trúc dự án

```
D:\16. Code\32-website-prinktech\
├── src/
│   ├── app/               # App Router (pages, api routes, admin)
│   │   ├── admin/         # /admin/website, /admin/viet-bai, /admin/don-hang
│   │   ├── api/           # REST API endpoints
│   │   ├── mau-1/2/3/     # 3 themes fullscreen
│   │   └── ...
│   ├── components/        # PricingCalculator, OrderForm, Gallery...
│   └── lib/               # supabaseClient, pricing, adminAuth...
├── public/                # logos, images, robots.txt
├── migrations/            # SQL migration files
├── deploy-local-to-vps.ps1   # Windows deploy script (PowerShell)
├── deploy-vps-unified.sh     # VPS deploy script (bash)
├── docker-compose.yml        # Container node:20 + shared network
└── .env*                  # Supabase keys (KHÔNG commit)
```

## 🔄 Dual-Edit Strategy (Local ↔ VPS)

### Mô hình khuyến nghị

```
Local Windows (D:\16. Code\32-website-prinktech)
        ↕  rsync / git push
VPS Linux (/srv/website-prinktech)
        ↕  docker rebuild
Production (prinktech.netslive.com:3019)
```

### 1. Setup GitHub (Đã hoàn tất ✅)

**Repository**: https://github.com/hainguyen1726/prinktech-website  
**Remote**: `origin` → `https://github.com/hainguyen1726/prinktech-website.git`  
**Branch**: `master` (đã push lần đầu)

```bash
# Kiểm tra remote
git remote -v
# origin  https://github.com/hainguyen1726/prinktech-website.git (fetch/push)

# Push code mới
git add .
git commit -m "feat: mô tả thay đổi"
git push origin master
```

**Tạo repo lần đầu** (đã thực hiện qua `gh`):
```bash
gh repo create prinktech-website --public --source=. --remote=origin --push
```

### 2. Sync 2 chiều (Local ↔ VPS)

**Từ Local → VPS (sau khi sửa code):**
```powershell
# PowerShell (Windows)
.\sync-to-vps.ps1
```

**Từ VPS → Local (sau khi sửa trên VPS):**
```bash
# SSH vào VPS
ssh root@180.93.146.26
cd /srv/website-prinktech
# Sau đó rsync ngược về local (xem script sync-from-vps.sh)
```

### 3. Deploy Production

**Deploy từ Local (khuyến nghị):**
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-local-to-vps.ps1
```

Script sẽ:
1. Nén source (loại `node_modules`, `.next`, `.git`, `.env`)
2. Upload `website-prinktech.tar.gz` lên VPS
3. Trên VPS: giải nén → backup `.env` → rebuild Docker container `prinktech-website`
4. Reload Caddy reverse proxy

**Xem logs:**
```bash
ssh root@180.93.146.26 "docker compose -f /srv/website-prinktech/docker-compose.yml logs web --tail=80 -f"
```

### 4. Scripts cần tạo

Tạo các file script sau trong thư mục gốc dự án:

- `sync-to-vps.ps1` — Rsync Local → VPS (không qua tar)
- `sync-from-vps.sh` — Rsync VPS → Local
- `deploy-git.sh` — Deploy qua Git (nếu muốn)

## 🛠️ Lệnh phát triển

### Local
```bash
npm run dev              # http://localhost:3000
npm run build            # Production build
npx tsc --noEmit         # TypeScript check
npm run lint             # ESLint
```

### VPS (SSH)
```bash
# Vào container
docker exec -it prinktech-website bash

# Xem logs realtime
docker compose -f /srv/website-prinktech/docker-compose.yml logs -f web

# Restart container
docker compose -f /srv/website-prinktech/docker-compose.yml restart web
```

## 🔐 Environment & Secrets

- **Supabase**: Dùng chung `https://api-supabase.netslive.com` (schema `printing`)
- **Keys**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **VPS IP**: `180.93.146.26`
- **Port**: `3019` (mapped từ container `3000`)
- **Network**: `my_shared_network` (external, dùng chung với Caddy)

**Lưu ý**: Không commit `.env*` files. Giữ bản backup trong `/srv/website-prinktech/.env.backup` trên VPS.

## 📋 Best Practices

1. **Luôn sync trước khi deploy** — Đảm bảo VPS có code mới nhất
2. **Test local trước** — `npm run build` phải pass không lỗi
3. **Backup .env** — Script deploy tự động backup `.env` → `.env.backup`
4. **Git commit rõ ràng** — Dùng commit message có prefix: `feat:`, `fix:`, `refactor:`
5. **Admin routes** — Bảo vệ bằng `/api/auth/login` (cookie-based)

## 🆘 Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| Container không start | `docker logs prinktech-website` + check `.env` |
| 502 Bad Gateway | Caddy chưa reload hoặc port 3019 conflict |
| Code cũ sau deploy | Chạy lại `deploy-local-to-vps.ps1` hoặc check volume mount |
| Supabase lỗi 401 | Kiểm tra `NEXT_PUBLIC_SUPABASE_*` trong docker-compose |
| Build fail trên VPS | Chạy `npm run build` local trước khi deploy |

---

**Tác giả skill**: Hermes Agent (Nous Research)  
**Cập nhật**: 2026-07-08  
**Dự án**: prinktech-website (Next.js UV DTF printing website)
