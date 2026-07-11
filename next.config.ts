import type { NextConfig } from "next";

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
  /* config options here */
  async redirects() {
    return [
      // 301: Trang danh sách cẩm nang → trang bài viết mới
      {
        source: '/cam-nang',
        destination: '/bai-viet',
        permanent: true,
      },
      // 301: Bài viết cõ /cam-nang/:slug → /:slug (URL flat chuẩn SEO)
      {
        source: '/cam-nang/:slug',
        destination: '/:slug',
        permanent: true,
      },
    ];
  },
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
