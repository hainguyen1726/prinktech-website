import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'printing' } }
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { id } = await params;

  try {
    // 1. Fetch tu activity_logs (logs thao tac cua he thong admin)
    const logsPromise = supabase
      .from('activity_logs')
      .select('*')
      .eq('target_id', id)
      .order('created_at', { ascending: false });

    // 2. Fetch tu order_history (logs trigger tu dong cua customer_orders neu co)
    const historyPromise = supabase
      .from('order_history')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });

    const [logsRes, historyRes] = await Promise.all([logsPromise, historyPromise]);

    const logsData = logsRes.data || [];
    const historyData = historyRes.data || [];

    // Chuẩn hóa và gộp dữ liệu
    const mergedHistory = [
      ...logsData.map(l => ({
        id: l.id,
        created_at: l.created_at,
        created_by: l.user_name,
        event_type: l.action,
        description: l.description,
        details: l.details,
        source: 'system_log'
      })),
      ...historyData.map(h => ({
        id: h.id,
        created_at: h.created_at,
        created_by: h.created_by || 'system',
        event_type: h.event_type,
        description: h.description,
        details: h.field_changed ? { field: h.field_changed, old: h.old_value, new: h.new_value } : null,
        source: 'order_history'
      }))
    ];

    // Sắp xếp theo ngày tạo giảm dần (mới nhất lên đầu)
    mergedHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ data: mergedHistory });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
