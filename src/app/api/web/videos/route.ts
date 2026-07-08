import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// GET /api/web/videos - Lấy danh sách video
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isAdminMode = searchParams.get('admin') === 'true';

    let query = supabaseAdmin
      .from('web_videos')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Nếu không phải chế độ admin, chỉ lấy các video được hiển thị
    if (!isAdminMode) {
      query = query.eq('is_visible', true);
    } else {
      // Xác thực quyền nếu muốn xem ở chế độ admin
      const auth = await verifyAdminOrStaff(request);
      if (auth.error) {
        return NextResponse.json({ error: 'Không có quyền truy cập dữ liệu admin' }, { status: 401 });
      }
    }

    const { data: videos, error } = await query;
    if (error) throw error;

    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error('[API Web Videos GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/web/videos - Tạo video mới (Admin)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { title, description, platform, video_url, cover_image, display_order, is_visible } = body;

    if (!title || !platform || !video_url) {
      return NextResponse.json({ error: 'Tiêu đề, nền tảng và đường dẫn video là bắt buộc' }, { status: 400 });
    }

    if (!['youtube', 'reels', 'tiktok'].includes(platform)) {
      return NextResponse.json({ error: 'Nền tảng không hợp lệ (chỉ hỗ trợ youtube, reels, tiktok)' }, { status: 400 });
    }

    const { data: video, error } = await supabaseAdmin
      .from('web_videos')
      .insert({
        title,
        description,
        platform,
        video_url,
        cover_image,
        display_order: Number(display_order) || 0,
        is_visible: is_visible !== undefined ? !!is_visible : true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error('[API Web Videos POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
