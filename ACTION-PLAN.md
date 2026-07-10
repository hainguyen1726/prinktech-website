# Kế Hoạch Hành Động Khắc Phục Lỗi SEO (Action Plan)

Dưới đây là các hành động cụ thể để khắc phục toàn bộ các lỗi SEO đã phát hiện trong [FULL-AUDIT-REPORT.md](file:///D:/16.%20Code/32-website-prinktech/FULL-AUDIT-REPORT.md). Các nhiệm vụ được sắp xếp theo mức độ ưu tiên giảm dần.

---

## 🔴 ƯU TIÊN 1: Khắc phục Client-Side Rendering dữ liệu tại Trang chủ

### Vấn đề:
Trang chủ `/` tải bài viết, sản phẩm, giá cả qua client-side `fetch` trong `useEffect` khiến bot tìm kiếm không đọc được nội dung tĩnh.

### Giải pháp khắc phục:
Chuyển đổi luồng tải dữ liệu sang phía Server (Server-Side Fetching) trong Server Component `src/app/page.tsx`, sau đó truyền dữ liệu thô này làm props khởi tạo cho Client Component `<WebsiteContent />`.

#### Bước 1.1: Cập nhật file [src/app/page.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/page.tsx)
Thay đổi nội dung file trang chủ để thực hiện fetch dữ liệu động trực tiếp từ Supabase trên server:
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import WebsiteContent from '@/components/WebsiteContent';

// Định cấu hình revalidate (ví dụ: cập nhật cache sau mỗi 1 giờ)
export const revalidate = 3600; 

export default async function Home() {
  let initialProducts = [];
  let initialPosts = [];
  let initialVideos = [];
  let initialPriceItems = [];

  try {
    const [prodRes, postRes, videoRes, priceRes] = await Promise.all([
      supabaseAdmin.from('web_products').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('web_posts').select('*').eq('status', 'published').order('created_at', { ascending: false }),
      supabaseAdmin.from('web_videos').select('*').eq('is_visible', true).order('display_order', { ascending: true }),
      supabaseAdmin.from('web_price_items').select('*').order('sort_order', { ascending: true })
    ]);

    initialProducts = prodRes.data || [];
    initialPosts = postRes.data || [];
    initialVideos = videoRes.data || [];
    initialPriceItems = priceRes.data || [];
  } catch (err) {
    console.error('Lỗi SSR data trang chủ:', err);
  }

  return (
    <WebsiteContent 
      initialTheme="elegant" 
      initialProducts={initialProducts}
      initialPosts={initialPosts}
      initialVideos={initialVideos}
      initialPriceItems={initialPriceItems}
    />
  );
}
```

#### Bước 1.2: Cập nhật file [src/components/WebsiteContent.tsx](file:///D:/16.%20Code/32-website-prinktech/src/components/WebsiteContent.tsx)
Nhận props và gán làm state mặc định để hỗ trợ SEO và tương thích ngược với Admin Dashboard cập nhật trực tiếp:
```diff
interface WebsiteContentProps {
  initialTheme: 'tech' | 'creative' | 'elegant';
  hideSwitcher?: boolean;
+  initialProducts?: Product[];
+  initialPosts?: Post[];
+  initialVideos?: Video[];
+  initialPriceItems?: PriceItem[];
}

export default function WebsiteContent({ 
  initialTheme, 
  hideSwitcher = false,
+  initialProducts = [],
+  initialPosts = [],
+  initialVideos = [],
+  initialPriceItems = []
}: WebsiteContentProps) {
  ...
-  const [products, setProducts] = useState<Product[]>([]);
-  const [posts, setPosts] = useState<Post[]>([]);
-  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
-  const [videos, setVideos] = useState<Video[]>([]);
-  const [loading, setLoading] = useState(true);
+  const [products, setProducts] = useState<Product[]>(initialProducts);
+  const [posts, setPosts] = useState<Post[]>(initialPosts);
+  const [priceItems, setPriceItems] = useState<PriceItem[]>(initialPriceItems);
+  const [videos, setVideos] = useState<Video[]>(initialVideos);
+  const [loading, setLoading] = useState(initialProducts.length === 0);
```

---

## 🔴 ƯU TIÊN 2: Bổ sung các trang tĩnh bị thiếu vào Sitemap

### Vấn đề:
File sitemap thiếu các trang tĩnh quan trọng: `/san-pham`, `/thu-vien-anh`, `/bao-gia`, `/tra-cuu`, `/dat-hang`.

### Giải pháp khắc phục:
Cập nhật file [src/app/sitemap.ts](file:///D:/16.%20Code/32-website-prinktech/src/app/sitemap.ts) để thêm các trang này vào mảng `staticPages`:
```typescript
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/san-pham`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/thu-vien-anh`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/bao-gia`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tra-cuu`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/dat-hang`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
```

---

## 🔴 ƯU TIÊN 3: Cấu hình bổ sung HTTP Security Headers

### Vấn đề:
Thiếu các Header bảo mật bảo vệ trang và hỗ trợ SEO đánh giá tin cậy.

### Giải pháp khắc phục:
Thêm các Security Headers vào cấu hình của Next.js thông qua file [next.config.ts](file:///D:/16.%20Code/32-website-prinktech/next.config.ts) (hoặc `next.config.js` nếu đổi tên):
```typescript
import type { NextConfig } from 'next';

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

---

## ⚠️ ƯU TIÊN 4: Sửa lỗi Schema bị ô nhiễm trên trang con

### Vấn đề:
Schema LocalBusiness và WebSite nhúng vào layout dùng chung làm ảnh hưởng đến các trang con.

### Giải pháp khắc phục:
#### Bước 4.1: Xóa các thẻ Script Schema khỏi file [src/app/layout.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/layout.tsx)
Xóa dòng khai báo `localBusinessSchema`, `websiteSchema` và các thẻ `<Script>` nhúng chúng ở dòng 141-150.

#### Bước 4.2: Tạo một component Client/Server chuyên biệt hoặc nhúng trực tiếp vào [src/app/page.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/page.tsx)
Đưa các schema này vào file `src/app/page.tsx` để chúng chỉ hiển thị duy nhất trên trang chủ:
```typescript
import Script from 'next/script';

// Trong trang Home(), thêm phần render Schema:
return (
  <>
    <Script
      id="schema-local-business"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
    />
    <Script
      id="schema-website"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
    />
    <WebsiteContent ... />
  </>
);
```

---

## ⚠️ ƯU TIÊN 5: Sửa lỗi trùng lặp Canonical & Chuyển đổi Google Fonts sang Next Font

### Khắc phục trùng lặp Canonical:
Trong file [src/app/layout.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/layout.tsx), xóa thẻ canonical thủ công:
- Xóa dòng 132: `<link rel="canonical" href={BASE_URL} />`
*(Vì Next.js Metadata API ở dòng 29-31 đã tự sinh thẻ canonical chuẩn)*.

### Tối ưu hóa Fonts:
Thay thế việc gọi API Google Fonts bằng `next/font/google` trong [layout.tsx](file:///D:/16.%20Code/32-website-prinktech/src/app/layout.tsx):
```typescript
import { Inter, Outfit, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });

// Trong thẻ <body>, gán class:
<body className={`${inter.variable} ${outfit.variable} ${playfair.variable} min-h-screen flex flex-col relative overflow-x-hidden antialiased pb-16 md:pb-0`}>
```

---

## ℹ️ ƯU TIÊN 6: Thêm chỉ số AI Search Index (`llms.txt`)

### Giải pháp khắc phục:
Tạo file [llms.txt](file:///D:/16.%20Code/32-website-prinktech/public/llms.txt) đặt trong thư mục `public/` của dự án để AI crawler dễ thu thập thông tin dịch vụ của xưởng in:
```markdown
# PrinK Tech - Xưởng In UV DTF Nổi 3D & Tem Decal Cao Cấp

> Xưởng in ấn tem nhãn dập nổi 3D bóng gương công nghệ cao, giao hàng toàn quốc.

## Các trang chính
- [Trang chủ](https://prinktech.netslive.com/): Giới thiệu công nghệ in UV DTF và bảng preview 3 layout thiết kế.
- [Sản phẩm](https://prinktech.netslive.com/san-pham): Danh sách tem dán, decal cuộn, tem dập nổi.
- [Tính giá](https://prinktech.netslive.com/bao-gia): Công cụ tính giá tự động theo kích thước và số lượng.
- [Đặt hàng](https://prinktech.netslive.com/dat-hang): Cổng đặt hàng trực tuyến và tải file thiết kế.
- [Tra cứu](https://prinktech.netslive.com/tra-cuu): Tra cứu hành trình đơn hàng theo số điện thoại.
```
