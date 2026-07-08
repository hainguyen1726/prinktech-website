import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const BASE_URL = 'https://prinktech.netslive.com';
const SITE_NAME = 'PrinK Tech - Xưởng In UV DTF Nổi 3D';
const TITLE = 'PrinK Tech | In UV DTF Nổi 3D & Tem Decal Cao Cấp - Giao Toàn Quốc';
const DESCRIPTION =
  'Xưởng in UV DTF PrinK Tech chuyên in tem dán nổi 3D, decal UV DTF dập nổi phủ bóng gương, bám dính siêu chắc trên ly cốc, bình giữ nhiệt, mũ bảo hiểm, đồ da. Nhận in lẻ & in sỉ số lượng lớn. Giao hàng toàn quốc.';
const OG_IMAGE = `${BASE_URL}/logo-prink-tech-1.png`;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: `%s | PrinK Tech`,
  },
  description: DESCRIPTION,
  keywords: [
    'in uv dtf', 'in uv dtf nổi', 'tem dán nổi 3d', 'decal uv dtf', 'tem dán 3d cao cấp',
    'xuong in prink tech', 'in tem dán ly cốc', 'in tem dán bình giữ nhiệt',
    'in tem dán mũ bảo hiểm', 'in tem dán đồ da', 'in uv dtf giao hàng toàn quốc',
    'dịch vụ in tem dán', 'gmkt viet nam', 'in ấn chất lượng cao',
  ],
  authors: [{ name: 'PrinK Tech - GMKT Việt Nam', url: BASE_URL }],
  creator: 'PrinK Tech',
  publisher: 'GMKT Việt Nam',
  category: 'printing',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: BASE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'PrinK Tech - In UV DTF Nổi 3D & Tem Decal Cao Cấp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '', // Điền Google Search Console verification token nếu có
  },
};

// JSON-LD Schema
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
  servesCuisine: undefined,
  sameAs: [
    'https://zalo.me/0822968412',
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

import BottomNav from '@/components/BottomNav';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="canonical" href={BASE_URL} />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="geo.region" content="VN" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
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
      </head>
      <body className="min-h-screen flex flex-col relative overflow-x-hidden antialiased pb-16 md:pb-0">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
