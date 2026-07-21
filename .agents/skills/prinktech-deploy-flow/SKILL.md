---
name: prinktech-deploy-flow
description: Hướng dẫn đồng bộ mã nguồn dự án Prinktech Website và deploy Docker container giữa Local, GitHub và Hermes Agent trên VPS. Quy tắc Sandbox phân tách Production và Dev Workspace.
---

# 🚀 Prinktech Website Deployment & Synchronization Protocol (Sandbox Mode)

> [!IMPORTANT]
> **BẮT BUỘC THỰC HIỆN ĐẦU TIÊN TRONG MỌI PHIÊN LÀM VIỆC (SESSION)**: 
> AI Agent (Antigravity ở Local hoặc Hermes trên VPS) trước khi thực hiện bất kỳ thao tác đọc hoặc chỉnh sửa code nào, **bắt buộc** phải chạy lệnh `git status` và `git pull` để kiểm tra và đồng bộ hoàn toàn mã nguồn giữa Local, VPS và GitHub, tránh tuyệt đối xung đột và lệch code (Code Drift).

Tài liệu này định nghĩa quy trình làm việc và giao thức đồng bộ mã nguồn giữa Local (PC), GitHub, và Hermes Agent trên VPS nhằm đảm bảo an toàn tuyệt đối cho môi trường chạy thực tế của người dùng, phân tách rõ ràng vai trò Production và Dev Workspace.

---

## 🏗️ 1. Mô hình Sandbox cô lập trên VPS

Để tránh tuyệt đối tình trạng downtime hoặc hỏng hóc hệ thống đang chạy, VPS Production được phân chia làm hai môi trường riêng biệt:

1. **Production (Môi trường chạy thực tế - Zero-Downtime Blue-Green):**
   - **Đường dẫn thư mục**: `/srv/website-prinktech/`
   - **Cơ chế hoạt động**: Ứng dụng chạy song song hai container `prinktech-website-blue` (cổng host 3019) và `prinktech-website-green` (cổng host 3021). Cả hai đều gán mạng external `my_shared_network`. Caddy reverse proxy trỏ theo container name `:3000` (`prinktech-website-blue:3000` hoặc `prinktech-website-green:3000`). Khi deploy, hệ thống tự động build Docker image khép kín từ Dockerfile, khởi chạy container rảnh, kiểm tra sức khỏe và swap proxy trên Caddy bằng Python Regex linh hoạt & inode-safe stream overwrite, sau đó mới tắt container cũ.
   - **Quy tắc**: Đây là môi trường chạy web chính thức cho người dùng. AI Agent không tự ý can thiệp hoặc sửa code trực tiếp tại đây TRỪ KHI được người dùng yêu cầu hoặc cấp quyền trực tiếp. Môi trường này nhận code sạch từ nhánh chính master đã được kiểm duyệt và deploy.

2. **Dev Workspace (Môi trường phát triển của Hermes):**
   - **Đường dẫn thư mục**: `/home/hermes/workspaces/website-prinktech/`
   - **Quy tắc**: Đây là nơi Hermes Agent làm việc độc lập để viết code, cài dependencies và build test trước khi đẩy lên GitHub.

---

## 🛡️ 2. Quy trình làm việc bắt buộc đối với AI Agent

### A. Quy trình cho Hermes (VPS - Môi trường Dev)

Khi Hermes Agent nhận nhiệm vụ sửa code hoặc phát triển tính năng mới trên VPS:

1. **Truy cập Dev Workspace:**
   ```bash
   cd /home/hermes/workspaces/website-prinktech
   ```

2. **Cập nhật mã nguồn mới nhất từ nhánh master:**
   ```bash
   git checkout master
   git pull origin master
   ```

3. **Tạo nhánh phụ an toàn (nhánh tính năng):** Luôn tạo nhánh mới (ví dụ: `dev/hermes-feature-A`):
   ```bash
   git checkout -b dev/hermes-feature-A
   ```

4. **Chạy kiểm tra & Tự sửa lỗi bắt buộc (Pre-push check):**
   Sau khi sửa code xong, bắt buộc phải chạy script kiểm tra và tự động sửa lỗi tại Dev Workspace:
   ```bash
   bash check-and-fix.sh
   ```
   - Script này sẽ tự động sửa các lỗi format nhỏ (`eslint --fix`), sau đó chạy kiểm tra kiểu TypeScript (`tsc --noEmit`) và chạy build Next.js.
   - **Bắt buộc**: Quá trình kiểm tra phải VƯỢT QUA 100%. Nếu phát hiện lỗi (như lỗi TypeScript hay build), Hermes phải đọc kĩ log lỗi, tự động sửa code lỗi và chạy lại kiểm tra cho đến khi thành công. **Cấm tuyệt đối việc đẩy code lỗi lên GitHub**.

5. **Đẩy code lên GitHub (sau khi kiểm tra thành công):**
   ```bash
   git add .
   git commit -m "hermes: [mô tả ngắn gọn thay đổi]"
   git push origin dev/hermes-feature-A
   ```

---

### B. Quy trình cho Antigravity (Local PC) & Deploy Production

Khi bạn hoặc Antigravity ở Local muốn gộp code và triển khai lên web chạy thực tế (Production):

1. **Đồng bộ code từ GitHub:** Kéo code mới nhất và nạp nhánh phụ của Hermes về máy Local:
   ```bash
   git fetch origin
   git merge origin/dev/hermes-feature-A
   ```

2. **Kiểm duyệt & Xử lý xung đột (Conflict):** Xem xét thay đổi, giải quyết xung đột trực tiếp và chạy thử nghiệm tại Local.

3. **Deploy lên Production:** Push nhánh chính `master` đã gộp lên GitHub và chạy script để VPS Production tự động cập nhật:
   ```powershell
   # Chạy từ local PowerShell
   .\deploy-via-git.ps1 -CommitMsg "deploy: merge feature A from hermes"
   ```
   *Lệnh này sẽ kích hoạt script `deploy-vps-git.sh` trên VPS để pull code master sạch về `/srv/website-prinktech/` và rebuild Docker container.*

---

## ⚙️ Cấu hình hạ tầng & Kết nối Supabase

### Tránh lỗi SSL handshake (`DEPTH_ZERO_SELF_SIGNED_CERT`)

Khi Next.js chạy phía server-side thực hiện truy vấn:

- **Server-side query:** Bắt buộc sử dụng URL public `SUPABASE_URL` hoặc `NEXT_PUBLIC_SUPABASE_URL` (https://api-supabase.netslive.com) — KHÔNG dùng URL local của container để tránh lỗi reject SSL.
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

---

## ⚠️ Lưu ý quan trọng

1. **KHÔNG bao giờ** commit `.env`, `.env.local`, credentials vào Git.
2. **CẤM KỴ & NGOẠI LỆ**: AI Agent (như Hermes) không tự ý pull/build trực tiếp trên thư mục Production `/srv/website-prinktech/` nhằm tránh downtime, **TRỪ KHI** có sự chỉ định hoặc yêu cầu trực tiếp từ người dùng.
3. **BẮT BUỘC** chạy `npm run build` tại Dev Workspace trước khi push.
