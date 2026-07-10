// fetch-post-content.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve('.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  db: {
    schema: 'printing'
  }
});

async function main() {
  const slugs = ['huong-dan-dan-tem-uv-dtf-dung-cach', 'so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang'];
  for (const slug of slugs) {
    const { data: post } = await supabase
      .from('web_posts')
      .select('title, content')
      .eq('slug', slug)
      .single();
    if (post) {
      console.log(`\n=== TITLE: ${post.title} ===`);
      console.log(post.content);
    } else {
      console.log(`\n⚠️ Not found: ${slug}`);
    }
  }
}

main().catch(console.error);
