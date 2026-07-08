import { NextRequest, NextResponse } from 'next/server';
import { supabaseMarketing } from '@/lib/supabaseMarketing';
import { verifyAdminOrMarketing } from '@/lib/adminAuth';

// GET /api/marketing/settings - Lấy thông tin cấu hình marketing
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { data: settings, error } = await supabaseMarketing
      .from('settings')
      .select('*');

    if (error) throw error;

    // Định dạng lại settings dạng key-value để frontend dễ dùng
    const settingsMap: Record<string, string> = {};
    settings?.forEach((item) => {
      let val = item.value;
      // Che giấu bớt ký tự token nhạy cảm khi trả về cho UI
      if (item.key.includes('token') && val && val.length > 10) {
        val = `${val.substring(0, 8)}...${val.substring(val.length - 8)}`;
      }
      settingsMap[item.key] = val;
    });

    return NextResponse.json({ settings: settingsMap });
  } catch (error: any) {
    console.error('[API Marketing Settings GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/marketing/settings - Cập nhật cấu hình marketing
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json(); // Nhận object dạng: { fb_access_token: '...', fb_ad_account_id: '...' }
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu cấu hình không hợp lệ' }, { status: 400 });
    }

    const updates: { key: string; value: string; updated_at: string }[] = [];
    
    for (const [key, val] of Object.entries(body)) {
      const value = String(val || '').trim();
      
      // Nếu giá trị gửi lên chứa dấu "...", tức là người dùng giữ nguyên token cũ đã bị che giấu ở client,
      // ta sẽ bỏ qua không update key đó.
      if (key.includes('token') && value.includes('...')) {
        continue;
      }

      updates.push({
        key,
        value,
        updated_at: new Date().toISOString()
      });
    }

    if (updates.length > 0) {
      const { error } = await supabaseMarketing
        .from('settings')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Cập nhật cấu hình thành công' });
  } catch (error: any) {
    console.error('[API Marketing Settings POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
