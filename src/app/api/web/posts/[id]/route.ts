import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/web/posts/[id] - Lấy chi tiết bài viết (Admin/Public)
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const { data: post, error } = await supabaseAdmin
      .from('web_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!post) {
      return NextResponse.json({ error: 'Bài viết không tồn tại' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error('[API Web Post GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// PUT /api/web/posts/[id] - Cập nhật bài viết (Admin)
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { title, slug, summary, content, cover_image, status, author, created_at } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Tiêu đề và đường dẫn (slug) là bắt buộc' }, { status: 400 });
    }

    const { data: post, error } = await supabaseAdmin
      .from('web_posts')
      .update({
        title,
        slug,
        summary,
        content,
        cover_image,
        status: status || 'draft',
        author: author || auth.user?.name || 'PrinK Tech',
        created_at: created_at ? new Date(created_at).toISOString() : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
    console.error('[API Web Post PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// DELETE /api/web/posts/[id] - Xóa bài viết (Admin)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await context.params;

    const { error } = await supabaseAdmin
      .from('web_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Web Post DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
