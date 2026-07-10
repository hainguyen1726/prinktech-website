// link-old-to-new.mjs
// Script tạo liên kết nội bộ từ các bài viết cũ tới bài viết Ngày 1 mới tạo để truyền Link Juice
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env.local
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
  console.log('🔗 Đang tối ưu hóa liên kết nội bộ (Internal Links) từ các bài cũ...');

  // 1. Cập nhật bài "huong-dan-dan-tem-uv-dtf-dung-cach"
  const { data: post1 } = await supabase
    .from('web_posts')
    .select('id, content')
    .eq('slug', 'huong-dan-dan-tem-uv-dtf-dung-cach')
    .single();

  if (post1) {
    let content = post1.content;
    // Chèn liên kết ở đầu bài
    const searchStr = 'nhưng dán thế nào mới đúng kỹ thuật';
    if (content.includes(searchStr) && !content.includes('in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re')) {
      const linkHtml = 'nhưng dán thế nào mới đúng kỹ thuật (sau khi bạn đặt <a href="/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re" class="text-blue-600 hover:underline">in sticker uv dtf</a> chất lượng tại xưởng)';
      content = content.replace(searchStr, linkHtml);

      const { error: err1 } = await supabase
        .from('web_posts')
        .update({ content })
        .eq('id', post1.id);

      if (err1) console.error('❌ Lỗi cập nhật bài 1:', err1.message);
      else console.log('✅ Đã chèn link nội bộ thành công vào bài: huong-dan-dan-tem-uv-dtf-dung-cach');
    } else {
      console.log('ℹ️ Bài 1 đã có link hoặc không khớp chuỗi cần thay thế.');
    }
  }

  // 2. Cập nhật bài "so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang"
  const { data: post2 } = await supabase
    .from('web_posts')
    .select('id, content')
    .eq('slug', 'so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang')
    .single();

  if (post2) {
    let content = post2.content;
    const searchStr = 'in uv dtf nổi 3d hiện đại';
    if (content.includes(searchStr) && !content.includes('in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re')) {
      const linkHtml = 'in uv dtf nổi 3d hiện đại (tham khảo dịch vụ <a href="/cam-nang/in-sticker-uv-dtf-theo-yeu-cau-lay-lien-gia-re" class="text-blue-600 hover:underline">in sticker uv dtf theo yêu cầu</a>)';
      content = content.replace(searchStr, linkHtml);

      const { error: err2 } = await supabase
        .from('web_posts')
        .update({ content })
        .eq('id', post2.id);

      if (err2) console.error('❌ Lỗi cập nhật bài 2:', err2.message);
      else console.log('✅ Đã chèn link nội bộ thành công vào bài: so-sanh-in-uv-dtf-noi-3d-va-in-uv-phang');
    } else {
      console.log('ℹ️ Bài 2 đã có link hoặc không khớp chuỗi cần thay thế.');
    }
  }

  console.log('🎉 Hoàn tất tối ưu hóa liên kết nội bộ!');
}

main().catch(console.error);
