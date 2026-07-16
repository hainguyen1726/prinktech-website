import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'printing' } }
);

// GET /api/admin/logs - Lấy danh sách activity logs (phân trang)
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const targetType = searchParams.get('target_type');

    let q = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action && action !== 'all') {
      q = q.eq('action', action);
    }
    if (targetType && targetType !== 'all') {
      q = q.eq('target_type', targetType);
    }

    const { data, count, error } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, total: count || 0, limit, offset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/admin/logs - Ghi log mới từ backend hoặc frontend
export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  try {
    const body = await req.json();
    const { action, target_type, target_id, description, details } = body;

    if (!action || !target_type || !description) {
      return NextResponse.json({ error: 'Thiếu thông số bắt buộc' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: auth.user?.id || 'unknown',
        user_name: auth.user?.name || 'Unknown User',
        action,
        target_type,
        target_id: target_id?.toString() || null,
        description,
        details: details || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
