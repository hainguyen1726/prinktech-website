import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Header from '@/components/Header';
import { Home, FileText } from 'lucide-react';

const BASE_URL = 'https://prinktech.netslive.com';

export const revalidate = 1800;

// Danh sách slug tĩnh của các trang KHÔNG phải bài viết
// Dùng để tránh truy vấn Supabase không cần thiết cho các trang đã có route riêng
const RESERVED_SLUGS = new Set([
  'san-pham',
  'bai-viet',
  'cam-nang',
  'bao-gia',
  'dat-hang',
  'tra-cuu',
  'thu-vien-anh',
  'chinh-sach-bao-mat',
  'login',
  'admin',
  'api',
  'marketing',
  'mau-1',
  'mau-2',
  'mau-3',
  'sitemap.xml',
  'favicon.ico',
]);

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image: string;
  status: string;
  author: string;
  created_at: string;
  updated_at?: string;
}

// Pre-render tất cả slug bài viết đã publish
export async function generateStaticParams() {
  try {
    const { data: posts } = await supabaseAdmin
      .schema('printing')
      .from('web_posts')
      .select('slug')
      .eq('status', 'published')
      .not('slug', 'is', null);
    return (posts || []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

// Dynamic metadata cho từng bài
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (RESERVED_SLUGS.has(slug)) return { title: 'Không tìm thấy trang' };

  const { data: post } = await supabaseAdmin
    .schema('printing')
    .from('web_posts')
    .select('title, summary, cover_image, created_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('created_at', new Date().toISOString())
    .single();

  if (!post) return { title: 'Bài viết không tồn tại' };

  const url = `${BASE_URL}/${slug}`;
  const image = post.cover_image || `${BASE_URL}/logo-prink-tech-1.png`;

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.summary,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
      publishedTime: post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      siteName: 'PrinK Tech',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      images: [image],
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Bỏ qua ngay nếu là slug bị reserved
  if (RESERVED_SLUGS.has(slug)) notFound();

  const { data: post } = await supabaseAdmin
    .schema('printing')
    .from('web_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('created_at', new Date().toISOString())
    .single<Post>();

  if (!post) notFound();

  // Bài viết liên quan (loại trừ bài hiện tại, giới hạn 3)
  const { data: relatedPosts } = await supabaseAdmin
    .schema('printing')
    .from('web_posts')
    .select('id, title, slug, cover_image, summary, created_at')
    .eq('status', 'published')
    .lte('created_at', new Date().toISOString())
    .neq('id', post.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    image: post.cover_image || `${BASE_URL}/logo-prink-tech-1.png`,
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: {
      '@type': 'Person',
      name: post.author || 'PrinK Tech',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'PrinK Tech',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo-horizontal.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/${slug}`,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Bài viết', item: `${BASE_URL}/bai-viet` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${BASE_URL}/${slug}` },
    ],
  };

  const publishedDate = new Date(post.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <>
      <script
        id="schema-article"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        id="schema-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />

        <main className="max-w-4xl mx-auto px-4 md:px-6 py-12">
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
            <Link href="/bai-viet" className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors">
              <FileText size={13} />
              <span>Bài viết</span>
            </Link>
            <span className="text-foreground/20 font-light">/</span>
            <span
              className="text-foreground/80 truncate max-w-[240px] md:max-w-xs font-medium"
              title={post.title}
            >
              {post.title}
            </span>
          </nav>

          {/* Cover image */}
          {post.cover_image && (
            <div className="rounded-2xl overflow-hidden mb-8 border border-slate-800/60">
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full h-56 md:h-80 object-cover"
              />
            </div>
          )}

          {/* Tiêu đề & meta */}
          <h1 className="text-2xl md:text-4xl font-black text-foreground leading-tight mb-3">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-6">
            <span>Đăng ngày {publishedDate}</span>
            {post.author && (
              <>
                <span>•</span>
                <span>{post.author}</span>
              </>
            )}
          </div>

          {post.summary && (
            <p className="text-base text-foreground/80 leading-relaxed border-l-4 border-sky-500/50 pl-4 mb-8 italic">
              {post.summary}
            </p>
          )}

          {/* Nội dung bài viết */}
          {post.content ? (
            <div
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:text-foreground prose-a:text-sky-400 prose-img:rounded-xl text-foreground/90"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            <p className="text-slate-500 italic">Nội dung đang được cập nhật...</p>
          )}

          {/* CTA cuối bài */}
          <div className="mt-12 p-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 text-center">
            <p className="text-sm font-bold text-foreground/90 mb-3">
              Cần tư vấn in UV DTF Nổi 3D?
            </p>
            <a
              href="https://zalo.me/0822968412"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
            >
              💬 Chat Zalo: 0822.968.412 (Ưu tiên)
            </a>
          </div>

          {/* Bài viết liên quan */}
          {relatedPosts && relatedPosts.length > 0 && (
            <section className="mt-16 pt-8 border-t border-card-border/40">
              <h3 className="text-xl font-bold text-foreground mb-6">Bài viết liên quan</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {relatedPosts.map((p) => {
                  const dateFmt = new Date(p.created_at).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });
                  return (
                    <Link
                      key={p.id}
                      href={`/${p.slug}`}
                      className="group block rounded-2xl border border-card-border/50 bg-card-bg/20 overflow-hidden hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="aspect-[16/10] overflow-hidden border-b border-card-border/40 bg-slate-900/20">
                        {p.cover_image ? (
                          <img
                            src={p.cover_image}
                            alt={p.title}
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
                      <div className="p-4">
                        <span className="text-[10px] text-slate-500 font-semibold">{dateFmt}</span>
                        <h4 className="text-sm font-bold text-foreground mt-1 group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug">
                          {p.title}
                        </h4>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
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
