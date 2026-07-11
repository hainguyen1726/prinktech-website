import { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Header from '@/components/Header';
import {
  Home,
  BookOpen,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  CalendarDays,
} from 'lucide-react';

const BASE_URL = 'https://prinktech.netslive.com';
const POSTS_PER_PAGE = 9;

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

// ─── Metadata động theo trang ────────────────────────────────────────
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));

  const canonicalUrl =
    currentPage === 1
      ? `${BASE_URL}/bai-viet`
      : `${BASE_URL}/bai-viet?page=${currentPage}`;

  return {
    title:
      currentPage === 1
        ? 'Bài Viết & Kiến Thức In UV DTF | PrinK Tech'
        : `Bài Viết In UV DTF — Trang ${currentPage} | PrinK Tech`,
    description:
      'Tổng hợp hướng dẫn, kinh nghiệm thực tế và kiến thức chuyên sâu về công nghệ in UV DTF nổi 3D từ xưởng PrinK Tech. Từ thiết kế file đến cách dán đúng kỹ thuật.',
    keywords: [
      'bài viết in uv dtf',
      'kiến thức in uv dtf',
      'hướng dẫn in tem dán',
      'in uv dtf nổi 3d',
      'tem dán bình giữ nhiệt',
      'thiết kế file in uv dtf',
    ],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title: 'Bài Viết & Kiến Thức In UV DTF — PrinK Tech',
      description:
        'Hướng dẫn, so sánh và bí quyết về in UV DTF nổi 3D từ xưởng PrinK Tech.',
      siteName: 'PrinK Tech',
      images: [
        {
          url: `${BASE_URL}/logo-prink-tech-1.png`,
          width: 1200,
          height: 630,
          alt: 'Bài viết in UV DTF - PrinK Tech',
        },
      ],
    },
  };
}

export const revalidate = 1800;

// ─── Page Component ───────────────────────────────────────────────────
export default async function BaiVietPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const offset = (currentPage - 1) * POSTS_PER_PAGE;

  let posts: Post[] = [];
  let totalCount = 0;

  try {
    const { count } = await supabaseAdmin
      .schema('printing')
      .from('web_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .lte('created_at', new Date().toISOString());

    totalCount = count || 0;

    const { data } = await supabaseAdmin
      .schema('printing')
      .from('web_posts')
      .select('id, title, slug, summary, cover_image, author, created_at, updated_at')
      .eq('status', 'published')
      .lte('created_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1);

    posts = data || [];
  } catch (err) {
    console.error('Lỗi tải bài viết:', err);
  }

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);
  const heroPost = currentPage === 1 ? posts[0] : null;
  const gridPosts = currentPage === 1 ? posts.slice(1) : posts;

  // Ngày mới nhất
  const latestDate = posts[0]
    ? new Date(posts[0].created_at).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  // JSON-LD schemas
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: BASE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Bài viết',
        item: `${BASE_URL}/bai-viet`,
      },
    ],
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Bài Viết & Kiến Thức In UV DTF — PrinK Tech',
    description:
      'Tổng hợp hướng dẫn, kinh nghiệm thực tế về công nghệ in UV DTF nổi 3D từ xưởng PrinK Tech.',
    url: `${BASE_URL}/bai-viet`,
    publisher: {
      '@type': 'Organization',
      name: 'PrinK Tech',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo-horizontal.png` },
    },
    hasPart: posts.map((p) => ({
      '@type': 'Article',
      headline: p.title,
      url: `${BASE_URL}/${p.slug}`,
      datePublished: p.created_at,
      dateModified: p.updated_at || p.created_at,
      description: p.summary,
    })),
  };

  return (
    <>
      <Script
        id="schema-breadcrumb-bai-viet"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="schema-collection-bai-viet"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />

        <main className="max-w-6xl mx-auto px-4 md:px-6 py-10">

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
              <FileText size={13} />
              Bài viết
            </span>
          </nav>

          {/* Page Header */}
          <div className="mb-8">
            <p className="text-xs font-bold tracking-widest uppercase text-[var(--accent)] mb-2">
              Kiến thức & Kinh nghiệm
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-3">
              Bài viết{' '}
              <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                In UV DTF
              </span>
            </h1>
            <p className="text-sm text-foreground/60 max-w-2xl leading-relaxed">
              Hướng dẫn, so sánh và kinh nghiệm thực tế từ xưởng PrinK Tech.
              Từ thiết kế file đến cách dán đúng kỹ thuật.
            </p>
          </div>

          {/* Stats bar */}
          {totalCount > 0 && (
            <div className="mb-8 flex flex-wrap items-center gap-4 text-xs text-foreground/50 border-b border-card-border/30 pb-6">
              <span className="flex items-center gap-1.5">
                <BookOpen size={12} className="text-sky-400" />
                <strong className="text-foreground/80">{totalCount}</strong> bài viết
              </span>
              {latestDate && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={12} className="text-sky-400" />
                  Cập nhật mới nhất:{' '}
                  <strong className="text-foreground/80">{latestDate}</strong>
                </span>
              )}
              {totalPages > 1 && (
                <span className="ml-auto text-foreground/40">
                  Trang {currentPage} / {totalPages}
                </span>
              )}
            </div>
          )}

          {posts.length === 0 ? (
            <div className="text-center py-24 text-foreground/40">
              <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
              <p>Chưa có bài viết nào. Vui lòng quay lại sau.</p>
            </div>
          ) : (
            <>
              {/* ── Hero Card (bài mới nhất, chỉ trang 1) ─────────────────── */}
              {heroPost && (
                <Link
                  href={`/${heroPost.slug}`}
                  className="group mb-8 flex flex-col md:flex-row rounded-2xl border border-card-border/50 bg-card-bg/20 overflow-hidden hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300"
                >
                  {/* Hero image */}
                  <div className="md:w-[58%] aspect-[16/10] md:aspect-auto overflow-hidden border-b md:border-b-0 md:border-r border-card-border/40 bg-slate-900/20 flex-shrink-0">
                    {heroPost.cover_image ? (
                      <img
                        src={heroPost.cover_image}
                        alt={heroPost.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900/60">
                        <img
                          src="/logo-horizontal.png"
                          alt="PrinK Tech"
                          className="h-10 opacity-20 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Hero content */}
                  <div className="flex flex-col justify-center p-6 md:p-8">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1 rounded-full w-fit mb-4">
                      ✦ Bài mới nhất
                    </div>

                    <h2 className="text-xl md:text-2xl font-black text-foreground group-hover:text-sky-400 transition-colors leading-snug mb-3">
                      {heroPost.title}
                    </h2>

                    {heroPost.summary && (
                      <p className="text-sm text-foreground/55 line-clamp-3 leading-relaxed mb-5">
                        {heroPost.summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <Clock size={11} />
                        <span>
                          {new Date(heroPost.created_at).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                        {heroPost.author && (
                          <>
                            <span>•</span>
                            <span>{heroPost.author}</span>
                          </>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm text-sky-400 font-bold group-hover:gap-2 transition-all">
                        Đọc bài viết <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* ── Grid bài viết còn lại ────────────────────────────────── */}
              {gridPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {gridPosts.map((post) => {
                    const dateFmt = new Date(post.created_at).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });
                    return (
                      <Link
                        key={post.id}
                        href={`/${post.slug}`}
                        className="group flex flex-col rounded-2xl border border-card-border/50 bg-card-bg/20 overflow-hidden hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/8 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        {/* Cover */}
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

                        {/* Body */}
                        <div className="flex flex-col flex-1 p-5">
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

                          <h2 className="text-sm font-bold text-foreground group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug mb-2 flex-1">
                            {post.title}
                          </h2>

                          {post.summary && (
                            <p className="text-xs text-foreground/45 line-clamp-2 leading-relaxed mb-3">
                              {post.summary}
                            </p>
                          )}

                          <span className="inline-flex items-center gap-1 text-xs text-sky-400 font-semibold group-hover:gap-2 transition-all mt-auto">
                            Đọc tiếp <ArrowRight size={11} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* ── Phân trang SEO ───────────────────────────────────────── */}
              {totalPages > 1 && (
                <nav
                  aria-label="Phân trang bài viết"
                  className="mt-12 flex items-center justify-center gap-2 flex-wrap"
                >
                  {/* Nút Trước */}
                  {currentPage > 1 && (
                    <Link
                      href={currentPage === 2 ? '/bai-viet' : `/bai-viet?page=${currentPage - 1}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-card-border/60 bg-card-bg/20 text-xs font-semibold text-foreground/70 hover:border-sky-500/50 hover:text-sky-400 transition-all"
                      rel="prev"
                    >
                      <ChevronLeft size={14} /> Trang trước
                    </Link>
                  )}

                  {/* Số trang */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const isActive = p === currentPage;
                    const isFar = Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages;
                    if (isFar) {
                      if (p === currentPage - 3 || p === currentPage + 3) {
                        return (
                          <span key={p} className="text-foreground/30 text-xs px-1">
                            …
                          </span>
                        );
                      }
                      return null;
                    }
                    return (
                      <Link
                        key={p}
                        href={p === 1 ? '/bai-viet' : `/bai-viet?page=${p}`}
                        aria-current={isActive ? 'page' : undefined}
                        className={`min-w-[36px] h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                            : 'border border-card-border/60 bg-card-bg/20 text-foreground/60 hover:border-sky-500/50 hover:text-sky-400'
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  })}

                  {/* Nút Sau */}
                  {currentPage < totalPages && (
                    <Link
                      href={`/bai-viet?page=${currentPage + 1}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-card-border/60 bg-card-bg/20 text-xs font-semibold text-foreground/70 hover:border-sky-500/50 hover:text-sky-400 transition-all"
                      rel="next"
                    >
                      Trang sau <ChevronRight size={14} />
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}

          {/* CTA */}
          <div className="mt-14 p-6 md:p-8 rounded-2xl border border-sky-500/20 bg-sky-500/5 text-center">
            <p className="text-base font-bold text-foreground/90 mb-1">
              Cần in UV DTF cho dự án của bạn?
            </p>
            <p className="text-sm text-foreground/50 mb-5">
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
                className="inline-flex items-center gap-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 font-bold px-6 py-3 rounded-xl text-sm transition"
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
