import { supabaseAdmin } from '@/lib/supabaseAdmin';
import WebsiteContent from '@/components/WebsiteContent';

const BASE_URL = 'https://prinktech.netslive.com';
const SITE_NAME = 'PrinK Tech - Xưởng In UV DTF Nổi 3D';
const DESCRIPTION =
  'Xưởng in UV DTF PrinK Tech chuyên in tem dán nổi 3D, decal UV DTF dập nổi phủ bóng gương, bám dính siêu chắc trên ly cốc, bình giữ nhiệt, mũ bảo hiểm, đồ da. Nhận in lẻ & in sỉ số lượng lớn. Giao hàng toàn quốc.';
const OG_IMAGE = `${BASE_URL}/logo-prink-tech-1.png`;

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${BASE_URL}/#business`,
  name: 'PrinK Tech - Xưởng In UV DTF Nổi 3D',
  description: DESCRIPTION,
  url: BASE_URL,
  logo: `${BASE_URL}/logo-horizontal.png`,
  image: OG_IMAGE,
  telephone: '+84822968412',
  email: 'info@prinktech.vn',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'VN',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '08:00',
      closes: '18:00',
    },
  ],
  priceRange: '$$',
  sameAs: [
    'https://zalo.me/0822968412',
    'https://www.facebook.com/prinktech',
    'https://www.linkedin.com/company/prinktech',
    'https://twitter.com/prinktech',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  name: SITE_NAME,
  url: BASE_URL,
  description: DESCRIPTION,
  publisher: {
    '@id': `${BASE_URL}/#business`,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/cam-nang?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

// Cấu hình revalidate để Next.js cache dữ liệu động tĩnh (ISR) cập nhật sau mỗi 1 giờ
export const revalidate = 3600;

export default async function Home() {
  let initialProducts = [];
  let initialPosts = [];
  let initialVideos = [];
  let initialPriceItems = [];

  try {
    const [prodRes, postRes, videoRes, priceRes] = await Promise.all([
      supabaseAdmin
        .schema('printing')
        .from('web_products')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .schema('printing')
        .from('web_posts')
        .select('*')
        .eq('status', 'published')
        .lte('created_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .schema('printing')
        .from('web_videos')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true }),
      supabaseAdmin
        .schema('printing')
        .from('web_price_items')
        .select('*')
        .order('sort_order', { ascending: true }),
    ]);

    initialProducts = prodRes.data || [];
    initialPosts = postRes.data || [];
    initialVideos = videoRes.data || [];
    initialPriceItems = priceRes.data || [];
  } catch (err) {
    console.error('Lỗi SSR data trang chủ:', err);
  }

  return (
    <>
      <script
        id="schema-local-business"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        id="schema-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <WebsiteContent
        initialTheme="elegant"
        initialProducts={initialProducts}
        initialPosts={initialPosts}
        initialVideos={initialVideos}
        initialPriceItems={initialPriceItems}
      />
    </>
  );
}
