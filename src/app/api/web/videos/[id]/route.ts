import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/web/videos/[id] - Cập nhật video (Admin)
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
    const { title, description, platform, video_url, cover_image, display_order, is_visible } = body;

    if (!title || !platform || !video_url) {
      return NextResponse.json({ error: 'Tiêu đề, nền tảng và đường dẫn video là bắt buộc' }, { status: 400 });
    }

    if (!['youtube', 'reels', 'tiktok'].includes(platform)) {
      return NextResponse.json({ error: 'Nền tảng không hợp lệ' }, { status: 400 });
    }

    const { data: video, error } = await supabaseAdmin
      .from('web_videos')
      .update({
        title,
        description,
        platform,
        video_url,
        cover_image,
        display_order: Number(display_order) || 0,
        is_visible: is_visible !== undefined ? !!is_visible : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error('[API Web Video PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// DELETE /api/web/videos/[id] - Xóa video (Admin)
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
      .from('web_videos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa video thành công' });
  } catch (error: any) {
    console.error('[API Web Video DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
