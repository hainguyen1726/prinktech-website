import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BASE_URL = 'https://prinktech.netslive.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  // Fetch posts từ Supabase
  let postRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: posts } = await supabaseAdmin
      .schema('printing')
      .from('web_posts')
      .select('slug, updated_at, created_at')
      .eq('status', 'published')
      .not('slug', 'is', null);

    if (posts) {
      postRoutes = posts.map((post) => ({
        url: `${BASE_URL}/cam-nang/${post.slug}`,
        lastModified: post.updated_at || post.created_at || today,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch (e) {
    console.error('[Sitemap] Error fetching posts:', e);
  }

  // Fetch products từ Supabase
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: products } = await supabaseAdmin
      .schema('printing')
      .from('web_products')
      .select('slug, updated_at, created_at')
      .not('slug', 'is', null);

    if (products) {
      productRoutes = products.map((product) => ({
        url: `${BASE_URL}/san-pham/${product.slug}`,
        lastModified: product.updated_at || product.created_at || today,
        changeFrequency: 'monthly' as const,
        priority: 0.9,
      }));
    }
  } catch (e) {
    console.error('[Sitemap] Error fetching products:', e);
  }

  return [...staticPages, ...productRoutes, ...postRoutes];
}
