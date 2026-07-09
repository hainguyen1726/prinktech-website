import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Script from 'next/script';
import Header from '@/components/Header';

const BASE_URL = 'https://prinktech.netslive.com';

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
  const { data: post } = await supabaseAdmin
    .from('web_posts')
    .select('title, summary, cover_image, created_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!post) return { title: 'Bài viết không tồn tại' };

  const url = `${BASE_URL}/cam-nang/${slug}`;
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

export default async function CamNangDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: post } = await supabaseAdmin
    .from('web_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single<Post>();

  if (!post) notFound();

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
      '@id': `${BASE_URL}/cam-nang/${slug}`,
    },
  };

  const publishedDate = new Date(post.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <>
      <Script
        id="schema-article"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Header điều hướng */}
        <Header />

        {/* Bài viết */}
        <main className="max-w-4xl mx-auto px-4 md:px-6 py-12">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-sky-400 transition-colors">Trang chủ</Link>
            <span>/</span>
            <Link href="/#blog" className="hover:text-sky-400 transition-colors">Cẩm nang</Link>
            <span>/</span>
            <span className="text-slate-300 truncate max-w-[200px]">{post.title}</span>
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
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight mb-3">
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
            <p className="text-base text-slate-300 leading-relaxed border-l-4 border-sky-500/50 pl-4 mb-8 italic">
              {post.summary}
            </p>
          )}

          {/* Nội dung bài viết */}
          {post.content ? (
            <div
              className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-a:text-sky-400 prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            <p className="text-slate-500 italic">Nội dung đang được cập nhật...</p>
          )}

          {/* CTA cuối bài */}
          <div className="mt-12 p-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 text-center">
            <p className="text-sm font-bold text-slate-300 mb-3">
              Cần tư vấn in UV DTF Nổi 3D?
            </p>
            <a
              href="tel:0822968412"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
            >
              📞 Gọi ngay 0822.968.412
            </a>
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
