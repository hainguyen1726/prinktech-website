import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { db: { schema: 'printing' } }
);

function translateField(field: string): string {
  const map: Record<string, string> = {
    status: 'Trạng thái',
    payment_status: 'Thanh toán',
    shipping_carrier: 'Đơn vị vận chuyển',
    tracking_number: 'Mã vận đơn',
    cost_amount: 'Giá vốn xưởng',
    quantity_actual: 'Mét in thực tế',
    quantity_expected: 'Số lượng thiết kế',
    unit_price: 'Đơn giá',
    total_amount: 'Tổng tiền',
    note: 'Ghi chú',
    design_link: 'Link thiết kế',
    layout_image: 'Ảnh layout',
    preview_image: 'Ảnh preview',
  };
  return map[field] || field;
}

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
    // Fetch từ order_logs
    const { data: logsData, error: logsError } = await supabase
      .from('order_logs')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });

    if (logsError) throw logsError;

    const historyData = logsData || [];

    // Chuẩn hóa dữ liệu
    const mergedHistory = historyData.map(h => {
      let description = h.action || 'Cập nhật đơn hàng';
      
      if (h.action === 'edit_order' && typeof h.changes === 'object' && h.changes !== null) {
        const changedFields = Object.keys(h.changes).map(key => {
          const val = h.changes[key];
          // Hỗ trợ cả 2 định dạng: { from, to } và { old, new }
          const fromVal = val && typeof val === 'object' 
            ? ('from' in val ? val.from : ('old' in val ? val.old : '')) 
            : '';
          const toVal = val && typeof val === 'object' 
            ? ('to' in val ? val.to : ('new' in val ? val.new : '')) 
            : '';
          
          return `${translateField(key)}: [${fromVal || 'trống'} ➔ ${toVal || 'trống'}]`;
        });
        if (changedFields.length > 0) {
          description = `Sửa đơn hàng (${changedFields.join(', ')})`;
        }
      } else if (h.action === 'create' || h.action === 'create_order') {
        description = 'Tạo mới đơn hàng';
      } else if (h.action === 'update_status') {
        description = 'Cập nhật trạng thái đơn hàng';
      }

      return {
        id: h.id,
        created_at: h.created_at,
        created_by: h.changed_by_name || 'Hệ thống',
        event_type: h.action,
        description: description,
        details: h.changes,
        source: 'order_log'
      };
    });

    return NextResponse.json({ data: mergedHistory });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

