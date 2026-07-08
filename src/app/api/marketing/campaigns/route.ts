import { NextRequest, NextResponse } from 'next/server';
import { supabaseMarketing } from '@/lib/supabaseMarketing';
import { verifyAdminOrMarketing } from '@/lib/adminAuth';

// GET /api/marketing/campaigns - Lấy danh sách chiến dịch
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = request.nextUrl;
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');

    let query = supabaseMarketing
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query;
    if (error) throw error;

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error('[API Marketing Campaigns GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/marketing/campaigns - Tạo chiến dịch mới
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { name, platform, status, budget, budget_type, start_date, end_date, fb_campaign_id } = body;

    if (!name || !platform) {
      return NextResponse.json({ error: 'Tên chiến dịch và nền tảng là bắt buộc' }, { status: 400 });
    }

    const { data: campaign, error } = await supabaseMarketing
      .from('campaigns')
      .insert({
        name,
        platform,
        status: status || 'active',
        budget: budget || 0,
        budget_type: budget_type || 'daily',
        start_date: start_date || null,
        end_date: end_date || null,
        fb_campaign_id: fb_campaign_id || null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'ID chiến dịch Facebook này đã tồn tại trên hệ thống' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    console.error('[API Marketing Campaigns POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// PUT /api/marketing/campaigns - Cập nhật chiến dịch
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { id, name, platform, status, budget, budget_type, start_date, end_date, fb_campaign_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID chiến dịch' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (platform !== undefined) updateData.platform = platform;
    if (status !== undefined) updateData.status = status;
    if (budget !== undefined) updateData.budget = budget;
    if (budget_type !== undefined) updateData.budget_type = budget_type;
    if (start_date !== undefined) updateData.start_date = start_date || null;
    if (end_date !== undefined) updateData.end_date = end_date || null;
    if (fb_campaign_id !== undefined) updateData.fb_campaign_id = fb_campaign_id || null;
    updateData.updated_at = new Date().toISOString();

    const { data: campaign, error } = await supabaseMarketing
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'ID chiến dịch Facebook này đã tồn tại trên hệ thống' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    console.error('[API Marketing Campaigns PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// DELETE /api/marketing/campaigns - Xóa chiến dịch
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID chiến dịch cần xóa' }, { status: 400 });
    }

    const { error } = await supabaseMarketing
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Xóa chiến dịch thành công' });
  } catch (error: any) {
    console.error('[API Marketing Campaigns DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
