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

> [!IMPORTANT]
> **BẮT BUỘC THỰC HIỆN ĐẦU TIÊN TRONG MỌI PHIÊN LÀM VIỆC (SESSION)**:
> Trước khi thực hiện bất kỳ thao tác đọc hoặc chỉnh sửa code nào, **bắt buộc** phải chạy lệnh `git status` và `git pull origin master` để đồng bộ hoàn toàn mã nguồn mới nhất từ GitHub về Dev Workspace, tránh tuyệt đối tình trạng code đè lên nhau.

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

5. **Chạy kiểm tra & Tự sửa lỗi bắt buộc (Pre-push check):**
   Sau khi sửa code xong, bạn bắt buộc phải chạy script kiểm tra và tự động sửa lỗi tại Dev Workspace:
   ```bash
   bash check-and-fix.sh
   ```
   - Script này sẽ tự động sửa các lỗi format nhỏ (`eslint --fix`), sau đó chạy kiểm tra kiểu TypeScript (`tsc --noEmit`) và chạy build Next.js.
   - **Bắt buộc**: Quá trình kiểm tra phải VƯỢT QUA 100%. Nếu phát hiện lỗi (như lỗi TypeScript hay build), bạn phải đọc kĩ log lỗi, tự động sửa code lỗi và chạy lại kiểm tra cho đến khi thành công. **Cấm tuyệt đối việc đẩy code lỗi lên GitHub**.

6. **Commit và đẩy lên GitHub (sau khi kiểm tra thành công):**
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

## ⚠️ 3. Bài học kinh nghiệm & Phòng tránh lỗi biên dịch (Đặc biệt quan trọng)

> [!WARNING]
> **LUẬT BIÊN DỊCH NEXT.JS (KHÔNG DÙNG THẺ `<a>` CHO TRANG NỘI BỘ)**:
> - **Lỗi đã xảy ra**: Sử dụng thẻ `<a>` để điều hướng đến các trang nội bộ (ví dụ: `<a href="/">` hoặc `<a href="/bao-gia">`) sẽ khiến Next.js ném lỗi nghiêm trọng trong bước chạy Linter (`no-html-link-for-pages`) và làm sập toàn bộ tiến trình Build Production.
> - **Khắc phục**: Luôn luôn sử dụng `<Link href="...">` từ `next/link` cho mọi liên kết nội bộ trong website. Thẻ `<a>` chỉ dùng cho liên kết ngoài (ví dụ: sang facebook, youtube hoặc domain bên ngoài).

> [!NOTE]
> **CƠ CHẾ DEPLOY TỰ ĐỘNG & BẢO VỆ THƯ MỤC `.git`**:
> - Thư mục chạy thực tế `/srv/website-prinktech` trên VPS hiện đã được khởi tạo thành một Git Repository hoàn chỉnh để kéo code từ nhánh `master` thông qua `deploy-vps-git.sh`.
> - Script dọn dẹp hệ thống `deploy-vps-unified.sh` đã được thiết lập loại trừ thư mục `.git` (`! -name ".git"`) để tránh tình trạng xóa nhầm Repo Git của VPS khi triển khai từ local PC.
> - GitHub Action đã được cấu hình tự động SSH vào VPS và chạy toàn bộ script `deploy-vps-git.sh` (chứ không chỉ restart container) mỗi khi có push mới lên `master`.

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
