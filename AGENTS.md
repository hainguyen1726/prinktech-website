<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Quy định SEO & Cấu trúc kỹ thuật bắt buộc tuân thủ

Dự án này đã được Audit SEO hoàn chỉnh vào ngày 10/07/2026. Các AI Agent khi tham gia phát triển dự án bắt buộc phải tuân thủ nghiêm ngặt các tiêu chuẩn cấu trúc sau đây để tránh làm suy giảm điểm SEO của website:

## 1. Kiến trúc Tải dữ liệu & Rendering trang chủ
- **Bắt buộc**: Trang chủ `/` ([src/app/page.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/page.tsx)) phải là **Server Component**. 
- Dữ liệu sản phẩm, bài viết cẩm nang và video thực tế phải được fetch trực tiếp từ Supabase trên server (sử dụng `supabaseAdmin` song song qua `Promise.all`) và truyền xuống client component dưới dạng props khởi tạo.
- **Tuyệt đối không**: Sử dụng client-side `fetch` thuần trong `useEffect` để tải các dữ liệu tĩnh cốt lõi trên trang chủ, vì nó sẽ gây rỗng HTML thô trả về từ server, khiến bot tìm kiếm không index được nội dung.

## 2. Quản lý Dữ liệu cấu trúc (Schema JSON-LD)
- **Quy tắc**: Các schema chung của trang chủ gồm `LocalBusiness` và `WebSite` phải được nhúng riêng biệt tại trang chủ [page.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/page.tsx).
- **Tuyệt đối không**: Nhúng Schema `LocalBusiness` hay `WebSite` vào layout dùng chung [layout.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/layout.tsx), tránh việc các trang con bị ô nhiễm thông tin Schema của trang chủ. Các trang con chỉ được chứa Schema đặc thù (như `Product` hay `Article`).

## 3. Quản lý Thẻ Canonical & Fonts
- Thẻ canonical phải được quản lý tập trung và tự động bởi Next.js Metadata API thông qua thuộc tính `alternates.canonical`. Không khai báo cứng thẻ `<link rel="canonical" href="..." />` trong `<head>` của [layout.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/layout.tsx).
- Tất cả các font chữ sử dụng trong dự án (Inter, Outfit, Playfair Display) phải được nạp thông qua module `next/font/google` trong layout để Next.js tự động self-host. Không sử dụng link CDN Google Fonts trực tiếp trong HTML đầu file.

## 4. Quản lý Sơ đồ trang web (Sitemap.ts)
- Khi phát triển thêm bất kỳ trang tĩnh public mới nào (ví dụ trang khuyến mãi, bảng giá mới, v.v.), lập trình viên / AI Agent bắt buộc phải khai báo URL tĩnh đó vào mảng `staticPages` trong file [sitemap.ts](file:///D:/16.%20Code/32-website-prinktech/src/app/sitemap.ts).

## 5. HTTP Security Headers
- Giữ nguyên và bảo đảm các HTTP Security Headers (Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) được cấu hình chuẩn trong file [next.config.ts](file:///D:/16.%20Code/32-website-prinktech/next.config.ts).

## 6. Tuân thủ Kế hoạch SEO hàng ngày (Daily SEO Execution Plan)
- **Bắt buộc**: Khi thực hiện viết nội dung mới, tối ưu hóa on-page, hoặc đi link cho website Prink Tech, AI Agent bắt buộc phải đối chiếu và thực thi theo đúng lộ trình công việc hàng ngày trong [daily_seo_execution_plan.md](file:///d:/16.%20Code/32-website-prinktech/daily_seo_execution_plan.md).
- **Tần suất & Khung giờ**: Đăng **3 bài viết chuẩn SEO/ngày** vào các thời điểm:
  - **Sáng (8h00)**: Bài viết tập trung từ khóa hạt giống/giao dịch.
  - **Trưa (12h00)**: Bài viết tập trung từ khóa thông tin/so sánh/tư vấn (bài viết mới bổ sung).
  - **Chiều/Tối (18h00)**: Bài viết chia sẻ ý tưởng/thương hiệu.
- **Quy tắc**: Mỗi bài viết mới được đăng lên phải tuân thủ đầy đủ checklist:
  - Độ dài nội dung đạt từ 800 - 1200 từ, headings phân cấp logic H1->H3.
  - Tối ưu hóa ảnh minh họa (nén định dạng `.webp` dưới 100KB, alt mô tả chứa từ khóa đích tự nhiên).
  - **Định dạng ảnh bắt buộc `.webp`**: Mọi file ảnh tải lên thư mục `/public/images/` của dự án và mọi đường dẫn `image_url` lưu vào các bảng Supabase (`web_posts`, `web_products`, ...) **bắt buộc phải có đuôi `.webp`**. Tuyệt đối không đặt đuôi `.png` hay `.jpg` cho ảnh mới tạo hoặc upload, trừ khi file gốc từ nguồn bên ngoài không cho phép chuyển đổi.
  - Gửi yêu cầu lập chỉ mục lên Google Search Console và chia sẻ bài viết lên các mạng xã hội để tăng tốc độ index và kéo traffic ban đầu.

## 7. Quy tắc Thay Đổi Cấu Hình Tệp Bind Mount Docker & Deploy Caddyfile (Chống đứt mount & lỗi 502/404)
1. **Tuyệt đối không dùng `sed -i` trên Caddyfile trực tiếp**:
   `sed -i` thay đổi inode trên host -> đứt bind mount Docker -> Caddy container đọc file cũ trong bộ nhớ -> gây ra lỗi 502 Bad Gateway.
   Luôn sử dụng cơ chế ghi đè luồng (Stream Overwrite):
   `cat /tmp/caddy_swap.tmp > /home/n8n/Caddyfile && rm -f /tmp/caddy_swap.tmp`
   Và ghi đè trực tiếp vào container:
   `docker exec -i n8n-caddy-1 sh -c 'cat > /etc/caddy/Caddyfile' < /home/n8n/Caddyfile`
2. **Sử dụng Regex linh hoạt trong Script Deploy**:
   Không dùng regex chuỗi cứng. Dùng regex linh hoạt: `r'(prinktech\.netslive\.com\s*\{[^}]*reverse_proxy\s+)[^\s\n\}]+'` để thay thế target proxy một cách chính xác bất kể giá trị cũ là IP host hay container name.
3. **Ưu tiên Container Name trong `my_shared_network`**:
   Container `prinktech-website-blue` và `prinktech-website-green` kết nối qua mạng external `my_shared_network`. Caddy reverse proxy trỏ trực tiếp tới `<container-name>:3000`.
4. **Cảnh báo Deploy đa dự án trên VPS**:
   Tất cả các dự án trên VPS dùng chung file `/home/n8n/Caddyfile`. Khi thực hiện deploy, chỉ cập nhật duy nhất block domain `prinktech.netslive.com` và tuyệt đối không làm ảnh hưởng đến block của các dự án khác (`chat.netslive.com`, `mmo.netslive.com`, ...).

## 8. Quy tắc Ưu tiên Triển khai (Deploy) qua Git & GitHub (BẮT BUỘC TRỪ KHI CÓ YÊU CẦU BẰNG VĂN BẢN)
1. **Ưu tiên Bắt buộc qua Git Push**:
   - Tất cả các hoạt động Deploy / Cập nhật mã nguồn lên VPS **bắt buộc phải thực hiện theo luồng Git Commit & Push lên GitHub (`.\deploy-via-git.ps1`)** để đảm bảo quản lý phiên bản (Version Control) và có thể rollback chính xác từng Git Commit Hash.
   - **Tuyệt đối không**: Sử dụng phương pháp upload file nén thủ công (`deploy-local-to-vps.ps1` cũ), trừ khi người dùng đưa ra yêu cầu bằng văn bản cụ thể trong đoạn chat.
2. **Quy trình Thực thi Deploy Chuẩn**:
   - Bước 1: Commit mã nguồn bằng Conventional Commit (`git commit -m "..."`).
   - Bước 2: Push code lên GitHub master (`git push origin master`).
   - Bước 3: Kích hoạt script Zero-Downtime Blue-Green trên VPS (`deploy-vps-git.sh`).
