import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(
  supabaseUrl || 'https://placeholder-supabase-url.supabase.co',
  supabaseServiceKey || 'placeholder-service-role-key',
  { db: { schema: 'printing' } }
);

// GET /api/v2/orders/[id] — Xem chi tiết đơn hàng V2
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('v2_orders')
      .select('*, v2_order_items(*), v2_customers(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// PATCH /api/v2/orders/[id] — Cập nhật trạng thái / thông tin đơn V2
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      status,
      payment_status,
      shipping_carrier,
      tracking_number,
      cost_amount,
      actual_meters,
      customer_name,
      customer_phone,
      customer_address,
      customer_email,
      customer_note,
      items,
      shipping_fee,
      discount,
      has_vat
    } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (status !== undefined) updates.status = status;
    if (payment_status !== undefined) updates.payment_status = payment_status;
    if (shipping_carrier !== undefined) updates.shipping_carrier = shipping_carrier;
    if (tracking_number !== undefined) updates.tracking_number = tracking_number;
    if (cost_amount !== undefined) updates.cost_amount = Number(cost_amount);
    if (actual_meters !== undefined) updates.actual_meters = Number(actual_meters);
    if (customer_name !== undefined) updates.customer_name = customer_name;
    if (customer_phone !== undefined) updates.customer_phone = customer_phone;
    if (customer_address !== undefined) updates.customer_address = customer_address;
    if (customer_email !== undefined) updates.customer_email = customer_email;
    if (customer_note !== undefined) updates.customer_note = customer_note;
    if (shipping_fee !== undefined) updates.shipping_fee = Number(shipping_fee);
    if (discount !== undefined) updates.discount = Number(discount);
    if (has_vat !== undefined) updates.has_vat = Boolean(has_vat);

    // Cập nhật lại tổng tiền nếu có thay đổi items/ship/discount/vat
    if (items && Array.isArray(items)) {
      const itemsSubtotal = items.reduce((s: number, it: any) => s + (Number(it.subtotal) || 0), 0);
      updates.subtotal = itemsSubtotal;
      const ship = shipping_fee !== undefined ? Number(shipping_fee) : 0;
      const disc = discount !== undefined ? Number(discount) : 0;
      const vatAmt = updates.has_vat ? Math.round(itemsSubtotal * 0.08) : 0;
      updates.vat_amount = vatAmt;
      updates.total_amount = itemsSubtotal + ship + vatAmt - disc;

      // Cập nhật v2_order_items
      await supabase.from('v2_order_items').delete().eq('order_id', id);
      const newItems = items.map((it: any) => ({
        order_id: id,
        product_name: it.product_label || it.product_type || 'Tem UV DTF',
        product_type: it.product_type || 'tem',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'cái',
        unit_price: Number(it.unit_price) || 0,
        subtotal: Number(it.subtotal) || 0,
        preview_image_url: it.image_url || it.preview_image_url || null,
        design_file_url: it.design_url || it.design_file_url || null,
        note: it.note || null
      }));
      await supabase.from('v2_order_items').insert(newItems);
    }

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('v2_orders')
      .update(updates)
      .eq('id', id)
      .select('*, v2_order_items(*)')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ data: updatedOrder });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// DELETE /api/v2/orders/[id] — Xóa đơn hàng V2
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const { error } = await supabase.from('v2_orders').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Xóa đơn hàng thành công' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
