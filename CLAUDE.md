# Hướng dẫn Phát triển Dự án Website Xưởng in UV DTF PrinK Tech

Tài liệu này cung cấp các lệnh phát triển, cấu trúc dự án và quy định kỹ thuật cho Website của xưởng in UV DTF PrinK Tech (tên miền `prinktech.netslive.com`).

---

## 🛠️ Lệnh Phát triển & Vận hành

### Phát triển cục bộ
* Chạy dev server: `npm run dev`
* Kiểm tra lỗi TypeScript: `npx tsc --noEmit`
* Build ứng dụng sản xuất (Production Build): `npm run build`

### Triển khai hệ thống (Deploy)
* Đóng gói mã nguồn và tự động triển khai lên VPS cổng `3019`:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\deploy-local-to-vps.ps1
  ```
  *Script này sẽ nén source code, upload lên VPS (`180.93.146.26`), run build trong container node, rebuild container Docker `prinktech-website` ở cổng 3019 và reload Caddy.*

* Xem logs của container trên VPS:
  ```bash
  ssh root@180.93.146.26 "docker compose -f /srv/website-prinktech/docker-compose.yml logs web --tail=50"
  ```

---

## 🏗️ Kiến trúc & Quy định kỹ thuật chính

### 1. Cơ sở dữ liệu (Supabase)
* Dự án dùng chung cơ sở dữ liệu Supabase `https://api-supabase.netslive.com` và schema **`printing`** của xưởng in.
* Các bảng chính phục vụ website công cộng:
  * `printing.web_posts`: Lưu trữ bài viết, cẩm nang dán tem nhãn.
  * `printing.web_products`: Trưng bày sản phẩm (UV DTF thường & nổi).
  * `printing.web_price_items`: Cấu hình khoảng số lượng & đơn giá để công cụ calculator tính giá tự động động.
  * `printing.web_quote_requests`: Lưu trữ thông tin khách hàng vãng lai gửi yêu cầu báo giá từ web.
  * `printing.web_videos`: Thư viện video quá trình in ấn và chất lượng tem dán thực tế (YouTube, Reels, TikTok).

### 2. Giao diện Website (3 Mẫu thiết kế)
* Trang chủ `/` tích hợp sẵn thanh Style Previewer phía trên giúp khách hàng chuyển đổi trực tiếp giữa 3 mẫu thiết kế:
  * **Mẫu 1: Modern & Tech** (Nền tối, Neon xanh/lá, viền neon sắc sảo, phong cách kỹ thuật số sỉ).
  * **Mẫu 2: Creative & Vibrant** (Màu sáng tươi, gradient chuyển màu, phông bo tròn Outfit, thân thiện với in lẻ trang trí).
  * **Mẫu 3: Clean & Elegant** (Nền kem sáng, chữ serif Playfair Display sang trọng, tối giản, tập trung in nổi cao cấp).
* Các trang mẫu hiển thị độc lập không có thanh previewer bar:
  * `/mau-1`: Mẫu 1 fullscreen
  * `/mau-2`: Mẫu 2 fullscreen
  * `/mau-3`: Mẫu 3 fullscreen
* Các style được cấu hình động thông qua CSS variables trong `src/app/globals.css` bằng cách gán class `.theme-creative` hoặc `.theme-elegant` cho `<body>`.

### 3. Cổng quản trị Backend (Admin Portal)
* Trang đăng nhập quản trị nằm ở `/login`. Xác thực qua cookie `printing_auth_token` chứa `userId:timestamp` thông qua Supabase Auth.
* Trang quản trị nội bộ nằm ở `/admin/website` cho phép CRUD:
  * Quản lý viết bài cẩm nang (Side Drawer Panel).
  * Quản lý sản phẩm in và giá khởi điểm.
  * Cấu hình bảng giá theo số lượng cho bộ calculator ngoài trang chủ.
  * Quản lý kho thư viện video thực tế (Thêm/Sửa/Xóa link YouTube, Reels, TikTok).
  * Xem, đổi trạng thái và xử lý yêu cầu báo giá của khách hàng.
* Trang viết bài chuẩn SEO chuyên sâu độc lập tại `/admin/viet-bai` hỗ trợ WYSIWYG editor, tính điểm SEO, phân tích mật độ từ khóa, checklist và Google SERP preview trực quan.
