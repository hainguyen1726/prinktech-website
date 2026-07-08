import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// GET /api/web/posts - Lấy danh sách bài viết
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const all = searchParams.get('all') === 'true'; // Nếu true, lấy cả nháp (chỉ admin được dùng)

    let query = supabaseAdmin
      .from('web_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!all) {
      // Mặc định khách vãng lai chỉ xem bài đã xuất bản
      query = query.eq('status', 'published');
    } else {
      // Kiểm tra quyền admin nếu muốn lấy tất cả bài viết (kể cả nháp)
      const auth = await verifyAdminOrStaff(request);
      if (auth.error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('[API Web Posts GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/web/posts - Tạo bài viết mới (Admin)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { title, slug, summary, content, cover_image, status, author } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Tiêu đề và đường dẫn (slug) là bắt buộc' }, { status: 400 });
    }

    const { data: post, error } = await supabaseAdmin
      .from('web_posts')
      .insert({
        title,
        slug,
        summary,
        content,
        cover_image,
        status: status || 'draft',
        author: author || auth.user?.name || 'PrinK Tech',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Đường dẫn (slug) này đã tồn tại' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error('[API Web Posts POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
