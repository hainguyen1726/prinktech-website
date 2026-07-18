import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import { logActivity } from '@/lib/activityLogger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(
  supabaseUrl || 'https://placeholder-supabase-url.supabase.co',
  supabaseServiceKey || 'placeholder-service-role-key',
  { db: { schema: 'printing' } }
);

// GET /api/orders/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from('retail_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

// PATCH /api/orders/[id] — cập nhật trạng thái & thông tin vận chuyển
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, payment_status, shipping_carrier, tracking_number, cost_amount } = body;

  // Lấy đơn hàng hiện tại để đối chiếu sự thay đổi cho việc ghi log
  const { data: isRetail } = await supabase
    .from('retail_orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  let oldOrder: any = isRetail;
  if (!isRetail) {
    const { data: adminOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    oldOrder = adminOrder;
  }

  if (!oldOrder) {
    return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
  }

  let res;

  if (isRetail) {
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (payment_status) updates.payment_status = payment_status;
    if (shipping_carrier !== undefined) updates.shipping_carrier = shipping_carrier;
    if (tracking_number !== undefined) updates.tracking_number = tracking_number;
    if (cost_amount !== undefined) updates.cost_amount = Number(cost_amount) || 0;

    // Tự động set timestamp khi thay đổi trạng thái
    if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
    if (status === 'shipped')   updates.shipped_at = new Date().toISOString();
    if (status === 'delivered') updates.delivered_at = new Date().toISOString();

    res = await supabase
      .from('retail_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    // Nếu lỗi do cột timestamp chưa tồn tại, retry không có timestamp
    if (res.error && (res.error.message.includes('column') || res.error.code === '42703')) {
      delete updates.confirmed_at;
      delete updates.shipped_at;
      delete updates.delivered_at;
      res = await supabase
        .from('retail_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    }
  } else {
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (payment_status) updates.payment_status = payment_status;
    if (cost_amount !== undefined) updates.cost_amount = Number(cost_amount) || 0;

    // Tự động set timestamp khi thay đổi trạng thái
    if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
    if (status === 'shipped')   updates.shipped_at = new Date().toISOString();
    if (status === 'delivered') updates.delivered_at = new Date().toISOString();

    // Xử lý cập nhật note cho shipping_carrier & tracking_number
    if (shipping_carrier !== undefined || tracking_number !== undefined) {
      let note = oldOrder.note || '';
      
      if (shipping_carrier !== undefined) {
        const carrierStr = shipping_carrier ? String(shipping_carrier).trim() : '';
        const carrierRegex = /- Đơn vị vận chuyển:\s*[^\n\r]*/g;
        if (carrierStr) {
          const newLine = `- Đơn vị vận chuyển: ${carrierStr}`;
          if (carrierRegex.test(note)) {
            note = note.replace(carrierRegex, newLine);
          } else {
            note = note + (note ? '\n' : '') + newLine;
          }
        } else {
          note = note.replace(carrierRegex, '').trim();
        }
      }
      
      if (tracking_number !== undefined) {
        const trackingStr = tracking_number ? String(tracking_number).trim() : '';
        const trackingRegex = /- Mã vận đơn:\s*[^\n\r]*/g;
        if (trackingStr) {
          const newLine = `- Mã vận đơn: ${trackingStr}`;
          if (trackingRegex.test(note)) {
            note = note.replace(trackingRegex, newLine);
          } else {
            note = note + (note ? '\n' : '') + newLine;
          }
        } else {
          note = note.replace(trackingRegex, '').trim();
        }
      }
      
      updates.note = note.trim();
    }

    res = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    // Nếu lỗi do cột timestamp chưa tồn tại, retry không có timestamp
    if (res.error && (res.error.message.includes('column') || res.error.code === '42703')) {
      delete updates.confirmed_at;
      delete updates.shipped_at;
      delete updates.delivered_at;
      res = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    }
  }

  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

  // GHI LOG ACTIVITY HOẠT ĐỘNG
  const updatedOrder = res.data;
  let logDesc = `Cập nhật đơn hàng ${updatedOrder.order_number || updatedOrder.order_code || id}:`;
  const details: Record<string, any> = {};

  if (status && oldOrder.status !== status) {
    logDesc += ` trạng thái [${oldOrder.status} ➔ ${status}];`;
    details.status = { old: oldOrder.status, new: status };
  }
  if (payment_status && oldOrder.payment_status !== payment_status) {
    logDesc += ` thanh toán [${oldOrder.payment_status} ➔ ${payment_status}];`;
    details.payment_status = { old: oldOrder.payment_status, new: payment_status };
  }
  if (tracking_number !== undefined && oldOrder.tracking_number !== tracking_number) {
    logDesc += ` vận đơn [${oldOrder.tracking_number || 'chưa có'} ➔ ${tracking_number || 'đã xóa'}];`;
    details.tracking_number = { old: oldOrder.tracking_number, new: tracking_number };
  }
  if (cost_amount !== undefined && Number(oldOrder.cost_amount) !== Number(cost_amount)) {
    logDesc += ` giá vốn xưởng [${oldOrder.cost_amount || 0}đ ➔ ${cost_amount}đ];`;
    details.cost_amount = { old: oldOrder.cost_amount, new: cost_amount };
  }

  await logActivity({
    userId: auth.user?.id || 'admin',
    userName: auth.user?.name || 'Website Admin',
    action: 'update_status',
    targetType: isRetail ? 'customer_order' : 'order',
    targetId: id,
    description: logDesc,
    details
  });

  return NextResponse.json({ data: res.data });
}

// DELETE /api/orders/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { id } = await params;

  // 1. Thử tìm và xóa trong retail_orders trước
  const { data: retailOrder } = await supabase
    .from('retail_orders')
    .select('order_number')
    .eq('id', id)
    .maybeSingle();

  if (retailOrder) {
    const { error } = await supabase.from('retail_orders').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      userId: auth.user?.id || 'admin',
      userName: auth.user?.name || 'Website Admin',
      action: 'delete_order',
      targetType: 'customer_order',
      targetId: id,
      description: `Xóa đơn hàng bán lẻ mã ${retailOrder.order_number} khỏi hệ thống.`
    });

    return NextResponse.json({ success: true });
  }

  // 2. Nếu không thấy ở retail_orders, tìm và xóa ở orders (đơn admin)
  const { data: partnerOrder } = await supabase
    .from('orders')
    .select('order_code')
    .eq('id', id)
    .maybeSingle();

  if (partnerOrder) {
    // Xóa logs của orders trước để tránh lỗi foreign key constraint
    await supabase.from('order_logs').delete().eq('order_id', id);

    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      userId: auth.user?.id || 'admin',
      userName: auth.user?.name || 'Website Admin',
      action: 'delete_order',
      targetType: 'partner_order',
      targetId: id,
      description: `Xóa đơn hàng đối tác mã ${partnerOrder.order_code} khỏi hệ thống.`
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Không tìm thấy đơn hàng để xóa' }, { status: 404 });
}
