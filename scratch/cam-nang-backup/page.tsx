import { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Header from '@/components/Header';
import { Home, BookOpen, Clock, ArrowRight } from 'lucide-react';

const BASE_URL = 'https://prinktech.netslive.com';

export const metadata: Metadata = {
  title: 'Cẩm Nang In UV DTF | Hướng Dẫn & Kinh Nghiệm In Tem Dán | PrinK Tech',
  description:
    'Tổng hợp hướng dẫn, kinh nghiệm và bí quyết về công nghệ in UV DTF nổi 3D: so sánh loại in, dán tem lên bình giữ nhiệt, chống nước ngoài trời, thiết kế file chuẩn và cách dán đúng kỹ thuật.',
  keywords: [
    'cẩm nang in uv dtf',
    'hướng dẫn in uv dtf',
    'kinh nghiệm in tem dán',
    'in uv dtf nổi 3d',
    'tem dán bình giữ nhiệt',
    'thiết kế file in uv dtf',
    'tem uv dtf ngoài trời',
    'hướng dẫn dán tem uv dtf',
  ],
  alternates: {
    canonical: `${BASE_URL}/cam-nang`,
  },
  openGraph: {
    type: 'website',
    url: `${BASE_URL}/cam-nang`,
    title: 'Cẩm Nang In UV DTF — Hướng Dẫn & Kinh Nghiệm | PrinK Tech',
    description:
      'Hướng dẫn, so sánh và bí quyết về in UV DTF nổi 3D từ xưởng PrinK Tech. Tài liệu thực tế, dễ hiểu, áp dụng ngay.',
    siteName: 'PrinK Tech',
    images: [
      {
        url: `${BASE_URL}/logo-prink-tech-1.png`,
        width: 1200,
        height: 630,
        alt: 'Cẩm nang in UV DTF - PrinK Tech',
      },
    ],
  },
};

export const revalidate = 1800; // ISR mỗi 30 phút

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  cover_image: string;
  author: string;
  created_at: string;
  updated_at?: string;
}

export default async function CamNangPage() {
  let posts: Post[] = [];

  try {
    const { data } = await supabaseAdmin
      .schema('printing')
      .from('web_posts')
      .select('id, title, slug, summary, cover_image, author, created_at, updated_at')
      .eq('status', 'published')
      .lte('created_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    posts = data || [];
  } catch (err) {
    console.error('Lỗi tải bài viết cẩm nang:', err);
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Cẩm nang', item: `${BASE_URL}/cam-nang` },
    ],
  };

  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Cẩm Nang In UV DTF — PrinK Tech',
    description:
      'Tổng hợp hướng dẫn, kinh nghiệm thực tế về công nghệ in UV DTF nổi 3D từ xưởng PrinK Tech.',
    url: `${BASE_URL}/cam-nang`,
    publisher: {
      '@type': 'Organization',
      name: 'PrinK Tech',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo-horizontal.png`,
      },
    },
    hasPart: posts.map((p) => ({
      '@type': 'Article',
      headline: p.title,
      url: `${BASE_URL}/cam-nang/${p.slug}`,
      datePublished: p.created_at,
      dateModified: p.updated_at || p.created_at,
      description: p.summary,
    })),
  };

  return (
    <>
      <Script
        id="schema-breadcrumb-cam-nang"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="schema-collection-cam-nang"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
      />

      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />

        <main className="max-w-5xl mx-auto px-4 md:px-6 py-12">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground/50 bg-foreground/5 px-4 py-2.5 rounded-xl border border-card-border/30 w-fit"
          >
            <Link href="/" className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
              <Home size={13} />
              <span>Trang chủ</span>
            </Link>
            <span className="text-foreground/20 font-light">/</span>
            <span className="text-foreground/80 font-medium flex items-center gap-1.5">
              <BookOpen size={13} />
              Cẩm nang
            </span>
          </nav>

          {/* Header section */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-3">
              Cẩm Nang{' '}
              <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                In UV DTF
              </span>
            </h1>
            <p className="text-base text-foreground/60 max-w-2xl leading-relaxed">
              Hướng dẫn, so sánh và kinh nghiệm thực tế về công nghệ in UV DTF nổi 3D từ xưởng PrinK Tech.
              Từ thiết kế file đến cách dán đúng kỹ thuật.
            </p>
          </div>

          {/* Danh sách bài viết */}
          {posts.length === 0 ? (
            <div className="text-center py-20 text-foreground/40">
              <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
              <p>Chưa có bài viết nào. Vui lòng quay lại sau.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => {
                const dateFmt = new Date(post.created_at).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                return (
                  <Link
                    key={post.id}
                    href={`/cam-nang/${post.slug}`}
                    className="group block rounded-2xl border border-card-border/50 bg-card-bg/20 overflow-hidden hover:border-[var(--accent)]/55 hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-300"
                  >
                    {/* Cover image */}
                    <div className="aspect-[16/10] overflow-hidden border-b border-card-border/40 bg-slate-900/20">
                      {post.cover_image ? (
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900/60">
                          <img
                            src="/logo-horizontal.png"
                            alt="PrinK Tech"
                            className="h-8 opacity-20 object-contain"
                          />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mb-2">
                        <Clock size={10} />
                        <span>{dateFmt}</span>
                        {post.author && (
                          <>
                            <span>•</span>
                            <span>{post.author}</span>
                          </>
                        )}
                      </div>
                      <h2 className="text-sm font-bold text-foreground group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-snug mb-2">
                        {post.title}
                      </h2>
                      {post.summary && (
                        <p className="text-xs text-foreground/50 line-clamp-2 leading-relaxed mb-3">
                          {post.summary}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-sky-400 font-semibold group-hover:gap-2 transition-all">
                        Xem chi tiết <ArrowRight size={12} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* CTA section */}
          <div className="mt-14 p-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 text-center">
            <p className="text-base font-bold text-slate-300 mb-1">
              Cần in UV DTF cho dự án của bạn?
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Chat Zalo để được tư vấn và nhận báo giá nhanh trong 5 phút.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="https://zalo.me/0822968412"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
              >
                💬 Chat Zalo: 0822.968.412
              </a>
              <Link
                href="/bao-gia"
                className="inline-flex items-center gap-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold px-6 py-3 rounded-xl text-sm transition"
              >
                🧮 Tự tính giá ngay
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
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
