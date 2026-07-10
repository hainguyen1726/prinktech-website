# Báo Cáo Đánh Giá SEO Chi Tiết (Full SEO Audit Report)

- **Website Audit**: `https://prinktech.netslive.com/`
- **Mã nguồn dự án**: [32-website-prinktech](file:///D:/16.%20Code/32-website-prinktech)
- **Thời gian đánh giá**: 10/07/2026
- **Điểm SEO Đánh Giá**: **70/100** (Cần cải thiện)
- **Độ tin cậy dữ liệu**: Cao (Kết hợp Audit live-site và Review cấu trúc mã nguồn Next.js)

---

## 📊 Bảng Tổng Hợp Đánh Giá (Scorecard)

| Hạng mục kiểm tra | Trọng số | Điểm số | Trạng thái | Đánh giá nhanh |
| :--- | :---: | :---: | :---: | :--- |
| **SEO On-Page & Metadata** | 20% | 85/100 | ⚠️ Cảnh báo | Thẻ Title/Description tối ưu tốt trên subpages nhưng bị trùng lặp canonical ở trang chủ. |
| **Kiến Trúc & Tải Dữ Liệu (SSR vs CSR)** | 25% | 40/100 | 🔴 Nghiêm trọng | Trang chủ load nội dung động bằng Client-Side fetch (`useEffect`), gây rỗng nội dung khi bot cào HTML thô. |
| **Cấu trúc Sitemap & Robots** | 15% | 60/100 | 🔴 Nghiêm trọng | Sitemap thiếu toàn bộ các trang tĩnh cốt lõi. Robots.txt hoạt động tốt nhưng AI crawler chưa tối ưu hoàn toàn. |
| **Dữ Liệu Cấu Trúc (Schema JSON-LD)** | 15% | 75/100 | ⚠️ Cảnh báo | Nhúng nhầm Schema trang chủ (`LocalBusiness`/`WebSite`) vào Layout chung, làm ô nhiễm schema trang con. |
| **Bảo Mật Kỹ Thuật (Security Headers)** | 10% | 25/100 | 🔴 Nghiêm trọng | Thiếu hầu hết các Header bảo mật quan trọng (HSTS, CSP, X-Frame-Options...). |
| **AI Search Readiness (GEO/AEO)** | 5% | 0/100 | 🔴 Nghiêm trọng | Không có file `llms.txt` để hỗ trợ AI Search Engine (Perplexity, ChatGPT Search...). |
| **Tối Ưu Hiệu Năng (Core Web Vitals)** | 10% | 70/100 | ⚠️ Cảnh báo | Nhúng Google Fonts kiểu truyền thống gây render-blocking. Cần chuyển sang `next/font`. |

---

## 🔍 Chi Tiết Phát Hiện Lỗi & Đánh Giá Lâm Sàng (Detailed Findings)

### 1. Kỹ Thuật & Kiến Trúc Tải Dữ Liệu (Technical & Rendering)
* **🔴 Lỗi Nghiêm Trọng: Client-Side Rendering (CSR) dữ liệu tĩnh động tại Trang chủ**
  * **Bằng chứng**: File [WebsiteContent.tsx](file:///D:/16.%20Code/32-website-prinktech/src/components/WebsiteContent.tsx#L110-L149) sử dụng React `useEffect` để gọi API routes `/api/web/products`, `/api/web/posts`, `/api/web/videos` để lấy dữ liệu sản phẩm, bài viết và video, sau đó lưu vào state và render trên client.
  * **Tác động**: Khi bot tìm kiếm (Google Bot) cào mã nguồn HTML thô trả về từ server, các phần sản phẩm, video, bài viết cẩm nang đều hiển thị Loading Spinner (`lucide-refresh-cw`). Bot không thể index nội dung này nếu không thực thi JavaScript (hoặc thực thi trễ), làm mất 80% cơ hội xếp hạng từ khóa cho trang chủ.
  * **Khắc phục**: Next.js hỗ trợ React Server Components (RSC) mặc định. Cần fetch dữ liệu động trực tiếp ở phía server trong `src/app/page.tsx` và truyền làm props (`initialProducts`, `initialPosts`, `initialVideos`) xuống cho component client `<WebsiteContent />`.

### 2. Sơ Đồ Trang Web & Crawlability (Sitemap & Indexability)
* **🔴 Lỗi Nghiêm Trọng: Sitemap thiếu các trang tĩnh cốt lõi**
  * **Bằng chứng**: File [sitemap.ts](file:///D:/16.%20Code/32-website-prinktech/src/app/sitemap.ts) chỉ định nghĩa trang chủ (`/`), bài viết động (`/cam-nang/[slug]`), sản phẩm động (`/san-pham/[slug]`). Các trang tĩnh quan trọng như `/san-pham`, `/thu-vien-anh`, `/bao-gia`, `/tra-cuu`, `/dat-hang` hoàn toàn không có trong sitemap.
  * **Tác động**: Search engine khó lập chỉ mục đầy đủ các trang dịch vụ cốt lõi, giảm khả năng xuất hiện sitelinks trên SERP Google.
  * **Khắc phục**: Khai báo bổ sung danh sách trang tĩnh này vào mảng `staticPages` của file `sitemap.ts`.

* **⚠️ Cảnh Báo: Quản lý AI crawler chưa đầy đủ trong `robots.txt`**
  * **Bằng chứng**: File [robots.txt](file:///D:/16.%20Code/32-website-prinktech/public/robots.txt) đã chặn và cho phép các bot cơ bản tốt. Tuy nhiên chưa có cấu hình cụ thể cho `ChatGPT-User` và `CCBot`, chúng sẽ thừa hưởng luật từ `User-agent: *`.
  * **Khắc phục**: Thêm các chỉ thị cụ thể để quản lý hoặc hạn chế các AI crawler không cần thiết.

### 3. Dữ Liệu Cấu Trúc (Structured Data - Schema JSON-LD)
* **⚠️ Cảnh Báo: Trùng lặp và phân mảnh Schema trang chủ**
  * **Bằng chứng**: File [layout.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/layout.tsx#L70-L151) nhúng trực tiếp Schema `LocalBusiness` và `WebSite` của trang chủ vào Layout chung.
  * **Tác động**: Mọi trang con như `/san-pham/[slug]` hay `/cam-nang/[slug]` đều bị nhúng đồng thời cả Schema của trang chủ lẫn Schema của chính nó (`Product`, `Article`). Google Bot sẽ bị bối rối khi xác định thực thể chính của trang (Primary Entity).
  * **Khắc phục**: Tách Schema trang chủ ra khỏi layout chung, chỉ render chúng khi ở trang chủ (`/`).

### 4. SEO On-Page & Hiệu Năng (On-Page SEO & Performance)
* **⚠️ Cảnh Báo: Trùng lặp thẻ Canonical**
  * **Bằng chứng**: Trang chủ trả về 2 thẻ canonical: Một thẻ do Next.js Metadata tự sinh ra từ cấu hình alternates canonical, và một thẻ được khai báo cứng thủ công ở dòng 132 của [layout.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/layout.tsx#L132).
  * **Khắc phục**: Xóa thẻ `<link rel="canonical" href={BASE_URL} />` thủ công trong `<head>` của layout.

* **⚠️ Cảnh Báo: Nhúng Google Fonts không tối ưu**
  * **Bằng chứng**: Sử dụng thẻ `<link>` truyền thống gọi API bên ngoài để tải font trong [layout.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/layout.tsx#L137-L140).
  * **Tác động**: Làm block render trang (render-blocking), tăng chỉ số First Contentful Paint (FCP) và có thể gây hiện tượng giật font (CLS).
  * **Khắc phục**: Chuyển đổi sang sử dụng `next/font/google` để Next.js tự động self-host và tối ưu hóa font local.

### 5. Bảo Mật & Kỹ Thuật Hệ Thống (Security & System Headers)
* **🔴 Lỗi Nghiêm Trọng: Thiếu 6 Header bảo mật HTTP cốt lõi**
  * **Bằng chứng**: Điểm số HTTP Security Headers chỉ đạt 25/100. Thiếu HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
  * **Tác động**: Làm giảm độ tin cậy bảo mật của trang web đối với công cụ tìm kiếm, đồng thời dễ bị tấn công Clickjacking, XSS.
  * **Khắc phục**: Cấu hình các header này trong `next.config.ts` hoặc trực tiếp tại file cấu hình Caddy Server của VPS.

### 6. Khả Năng Tìm Kiếm AI (AI Search Readiness - GEO/AEO)
* **🔴 Lỗi Nghiêm Trọng: Thiếu file định chỉ mục AI `llms.txt`**
  * **Bằng chứng**: Không tìm thấy file `https://prinktech.netslive.com/llms.txt`.
  * **Tác động**: Các AI Search Engine (Perplexity, ChatGPT, Gemini) không có tệp chỉ mục máy học để tóm tắt thông tin dịch vụ của xưởng in một cách chính xác.
  * **Khắc phục**: Tạo file `/public/llms.txt` và `/public/llms-full.txt` theo đúng đặc tả của llmstxt.org.

---

## 📅 Kết Luận Đánh Giá
Website **PrinK Tech** được xây dựng trên Next.js App Router rất hiện đại và có cấu trúc trang con (sản phẩm, bài viết) chuẩn chỉ về SEO On-page (SSG tĩnh hóa trang con, dynamic metadata tốt). Tuy nhiên, trang chủ đang mắc lỗi kiến trúc nghiêm trọng khi đẩy việc tải nội dung sang client-side, và hệ thống đang thiếu sitemap hoàn chỉnh cùng các header bảo mật cần thiết.

*Vui lòng tham khảo file [ACTION-PLAN.md](file:///D:/16.%20Code/32-website-prinktech/ACTION-PLAN.md) để tiến hành khắc phục theo lộ trình cụ thể.*
