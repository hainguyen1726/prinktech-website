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
- **Quy tắc**: Mỗi bài viết mới được đăng lên phải tuân thủ đầy đủ checklist:
  - Độ dài nội dung đạt từ 800 - 1200 từ, headings phân cấp logic H1->H3.
  - Tối ưu hóa ảnh minh họa (nén định dạng `.webp` dưới 100KB, alt mô tả chứa từ khóa đích tự nhiên).
  - Sử dụng kỹ năng **[antigravity-google-flow-imagegen](file:///C:/Users/Admin/.gemini/config/skills/antigravity-google-flow-imagegen/SKILL.md)** để sinh ảnh mockup/sản phẩm bằng AI khi thiếu ảnh thực tế.
  - Thiết lập ít nhất 1-2 liên kết nội bộ (Internal Links) từ bài viết blog trỏ về các trang Landing Page dịch vụ chính.
  - Gửi yêu cầu lập chỉ mục lên Google Search Console và chia sẻ bài viết lên các mạng xã hội để tăng tốc độ index và kéo traffic ban đầu.
