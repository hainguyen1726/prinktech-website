---
name: prinktech-sync-deploy
description: Hướng dẫn đồng bộ mã nguồn Git/SSH và deploy dự án Prinktech Website trên VPS dành cho AI Agent.
---

# Hướng dẫn Đồng bộ & Deploy cho AI Agent (Hermes/Claude)

Tài liệu này hướng dẫn cách AI Agent (như Hermes Agent trên VPS) đồng bộ mã nguồn qua Git/SSH và deploy dự án Prinktech Website.

## 📌 Thông tin hạ tầng & Kết nối
- **IP VPS**: `180.93.146.26` (User: `root`)
- **Đường dẫn thư mục dự án trên VPS**: `/srv/website-prinktech`
- **Docker Container Name**: `prinktech-website` (Chạy Next.js ở cổng `3019` bên ngoài, cổng `3000` bên trong container)
- **GitHub Repository**: `hainguyen1726/prinktech-website`
- **Giao thức đồng bộ**: Git qua SSH (`git@github.com:hainguyen1726/prinktech-website.git`)

---

## 🔒 Quy tắc bắt buộc đối với AI Agent (Quy tắc Dual-Edit)

Khi AI Agent thực hiện chỉnh sửa mã nguồn (đặc biệt là Hermes Agent chạy trên VPS), **bắt buộc** phải tuân theo quy trình 3 bước sau để tránh xung đột code (conflict):

### Bước 1: Đồng bộ code trước khi sửa
Trước khi sửa bất kỳ file nào, AI Agent phải kiểm tra và cập nhật mã nguồn mới nhất từ GitHub về thư mục làm việc:
```bash
git pull origin master
```

### Bước 2: Chỉnh sửa và kiểm tra
Thực hiện các chỉnh sửa theo yêu cầu của người dùng. Hãy chắc chắn không làm ảnh hưởng đến các file môi trường cục bộ `.env` và `.env.local` (các file này đã được liệt kê trong `.gitignore`).

### Bước 3: Deploy chạy thử và Đẩy code lên GitHub
Sau khi hoàn tất chỉnh sửa và xác nhận code không bị lỗi cú pháp:
1. **Biên dịch và chạy thử trên VPS**:
   Chạy script deploy đã được chuẩn bị sẵn trên VPS để build Next.js trong container Docker:
   ```bash
   bash deploy-vps-git.sh
   ```
   *Lưu ý: Nếu script deploy gặp lỗi TypeScript hoặc lỗi build, AI Agent phải sửa hết lỗi trước khi commit.*

2. **Commit và Push lên GitHub**:
   Đẩy các thay đổi lên GitHub để người dùng có thể pull về máy local:
   ```bash
   git add .
   git commit -m "hermes: [mô tả ngắn gọn công việc đã làm]"
   git push origin master
   ```

---

## 🛠️ Các Script Hỗ trợ Sẵn có

AI Agent có thể gọi hoặc tham khảo các script sau:
- **`deploy-via-git.ps1` (Local)**: Chạy từ local PowerShell để push code local lên GitHub và SSH kích hoạt deploy trên VPS.
- **`deploy-vps-git.sh` (VPS)**: Chạy trực tiếp trên VPS để tự động pull code từ GitHub, chạy container Node:20 cài dependency, build production Next.js, restart container chính và reload Caddy.
