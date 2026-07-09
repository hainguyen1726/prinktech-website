import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Script from 'next/script';
import Header from '@/components/Header';
import { Home } from 'lucide-react';

const BASE_URL = 'https://prinktech.netslive.com';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  is_featured: boolean;
  created_at: string;
  updated_at?: string;
}

// Pre-render tất cả slug sản phẩm
export async function generateStaticParams() {
  try {
    const { data: products } = await supabaseAdmin
      .from('web_products')
      .select('slug')
      .not('slug', 'is', null);
    return (products || []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

// Dynamic metadata cho từng sản phẩm
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: product } = await supabaseAdmin
    .from('web_products')
    .select('name, description, image_url, price, created_at')
    .eq('slug', slug)
    .single();

  if (!product) return { title: 'Sản phẩm không tồn tại' };

  const url = `${BASE_URL}/san-pham/${slug}`;
  const image = product.image_url || `${BASE_URL}/logo-prink-tech-1.png`;
  const title = `${product.name} | In UV DTF PrinK Tech`;
  const description =
    product.description ||
    `${product.name} - Tem dán UV DTF chất lượng cao từ PrinK Tech. Bám dính siêu chắc, phủ bóng gương, in nổi 3D sắc nét.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
      siteName: 'PrinK Tech',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'UV DTF Thường',
  embossed: 'UV DTF Nổi 3D',
  others: 'Sản phẩm khác',
};

export default async function SanPhamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: product } = await supabaseAdmin
    .from('web_products')
    .select('*')
    .eq('slug', slug)
    .single<Product>();

  if (!product) notFound();

  const priceFormatted = product.price
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)
    : null;

  const description =
    product.description ||
    `${product.name} - Tem dán UV DTF chất lượng cao từ PrinK Tech. Bám dính siêu chắc, phủ bóng gương, in nổi 3D sắc nét.`;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    image: product.image_url || `${BASE_URL}/logo-prink-tech-1.png`,
    url: `${BASE_URL}/san-pham/${slug}`,
    brand: {
      '@type': 'Brand',
      name: 'PrinK Tech',
    },
    category: CATEGORY_LABELS[product.category] || 'In UV DTF',
    ...(product.price && {
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'VND',
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'PrinK Tech',
          url: BASE_URL,
        },
      },
    }),
  };

  return (
    <>
      <Script
        id="schema-product"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Header điều hướng */}
        <Header />

        <main className="max-w-5xl mx-auto px-4 md:px-6 py-12">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground/50 bg-foreground/5 px-4 py-2.5 rounded-xl border border-card-border/30 w-fit">
            <Link href="/" className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
              <Home size={13} />
              <span>Trang chủ</span>
            </Link>
            <span className="text-foreground/20 font-light">/</span>
            <Link href="/#products" className="hover:text-[var(--accent)] transition-colors">
              Sản phẩm
            </Link>
            <span className="text-foreground/20 font-light">/</span>
            <span className="text-foreground/80 truncate max-w-[240px] md:max-w-xs font-medium" title={product.name}>
              {product.name}
            </span>
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            {/* Hình ảnh sản phẩm */}
            <div className="rounded-2xl overflow-hidden border border-slate-800/60 bg-slate-900/40">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-slate-900/60">
                  <img src="/logo-horizontal.png" alt="PrinK Tech" className="h-20 opacity-30 object-contain" />
                </div>
              )}
            </div>

            {/* Thông tin sản phẩm */}
            <div className="space-y-5">
              {product.category && (
                <span className="inline-block px-2.5 py-1 text-[11px] font-bold rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  {CATEGORY_LABELS[product.category] || product.category}
                </span>
              )}

              <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
                {product.name}
              </h1>

              {priceFormatted && (
                <div className="text-2xl font-black text-emerald-400">
                  Từ {priceFormatted}
                </div>
              )}


              {/* Khuyến mại In theo mét dài - Áp dụng từ 10/07/2026 đến 31/07/2027 */}
              {(product.name.toLowerCase().includes('mét dài') || product.name.toLowerCase().includes('met dai') || slug.includes('met-dai') || slug.includes('met_dai')) && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-5 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎉</span>
                    <span className="font-bold text-lg">KHUYẾN MẠI ĐẶC BIỆT</span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm line-through opacity-75">Giá cũ: 150.000 - 400.000đ/m</p>
                    <p className="text-xl font-black">ĐỒNG GIÁ <span className="text-yellow-300">145.000đ/m</span> cho mọi số lượng!</p>
                    <p className="text-xs opacity-90">📅 Áp dụng từ <strong>10/07/2026</strong> đến hết <strong>31/07/2027</strong></p>
                  </div>
                  <p className="text-xs mt-2 opacity-80">💡 In UV DTF khổ 60cm - Decal, tem nhãn, bảng hiệu...</p>
                </div>
              )}
              {product.description && (
                <p className="text-sm text-foreground/80 leading-relaxed">{product.description}</p>
              )}

              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Bám dính siêu chắc trên mọi vật liệu cứng
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> In nổi 3D phủ bóng gương sắc nét
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Nhận in lẻ & sỉ số lượng lớn
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Giao hàng toàn quốc
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="tel:0822968412"
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-5 py-3 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
                >
                  📞 Gọi báo giá ngay
                </a>
                <a
                  href="https://zalo.me/0822968412"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border border-slate-700 hover:border-slate-600 bg-slate-900/60 text-slate-200 font-bold px-5 py-3 rounded-xl text-sm transition"
                >
                  💬 Chat Zalo
                </a>
              </div>
            </div>
          </div>
        </main>

        {/* Footer tối giản */}
        <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} PrinK Tech – GMKT Việt Nam |{' '}
          <Link href="/" className="hover:text-sky-400 transition-colors">
            prinktech.netslive.com
          </Link>
        </footer>
      </div>
    </>
  );
}
