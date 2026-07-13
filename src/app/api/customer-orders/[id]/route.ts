import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/customer-orders/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    const { data: logs } = await supabaseAdmin
      .from('order_logs')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ order, logs: logs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// PATCH /api/customer-orders/[id] — cập nhật đơn hàng + log lịch sử
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { data: oldOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Write log to order_logs
    if (oldOrder) {
      const changes: Record<string, { from: any; to: any }> = {};
      Object.keys(body).forEach(key => {
        if (oldOrder[key] !== body[key]) {
          changes[key] = { from: oldOrder[key], to: body[key] };
        }
      });

      if (Object.keys(changes).length > 0) {
        await supabaseAdmin.from('order_logs').insert({
          order_id: id,
          action: 'edit_order',
          changes,
          changed_by_name: 'Admin User',
        });
      }
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
