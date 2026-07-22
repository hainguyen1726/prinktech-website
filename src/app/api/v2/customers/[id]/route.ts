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

// GET /api/v2/customers/[id] — Chi tiết khách hàng + Danh sách đơn hàng V2
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;

    const { data: customer, error } = await supabase
      .from('v2_customers')
      .select('*, v2_orders(*, v2_order_items(*))')
      .eq('id', id)
      .single();

    if (error || !customer) {
      return NextResponse.json({ error: 'Khách hàng không tồn tại' }, { status: 404 });
    }

    const validOrders = (customer.v2_orders || []).filter((o: any) => o.status !== 'cancelled');
    const totalSpent = validOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

    const formattedOrders = (customer.v2_orders || []).map((o: any) => {
      const items = (o.v2_order_items || []).map((it: any) => ({
        id: it.id,
        product_label: it.product_label,
        product_type: it.product_type,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        subtotal: it.subtotal,
        design_url: it.design_url
      }));

      return {
        id: o.id,
        order_number: o.order_code,
        customer_id: customer.id,
        sticker_type: items[0]?.product_type || 'a4',
        quantity_items: items.reduce((s: number, i: any) => s + (i.quantity || 0), 0),
        items: items,
        design_link: o.v2_order_items?.find((i: any) => i.design_url)?.design_url || '',
        quote_excel_url: o.quote_excel_url || '',
        quote_pdf_url: o.quote_pdf_url || '',
        subtotal: Number(o.subtotal_amount || o.total_amount || 0),
        shipping_fee: Number(o.shipping_fee || 0),
        discount: Number(o.discount_amount || 0),
        total: Number(o.total_amount || 0),
        shipping_method: 'Giao hàng tận nơi',
        shipping_carrier: o.shipping_carrier || '',
        tracking_code: o.tracking_code || '',
        shipping_address: o.customer_address || customer.address || '',
        status: o.status,
        payment_status: o.payment_status,
        source: o.channel || 'sale_online',
        notes: o.notes || '',
        created_at: o.created_at,
        updated_at: o.updated_at || o.created_at,
        history: []
      };
    });

    const formattedCustomer = {
      id: customer.id,
      customer_code: customer.code || `KH-${customer.phone?.slice(-6) || '000000'}`,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      customer_type: customer.customer_type || 'retail',
      total_orders: validOrders.length,
      total_spent: totalSpent,
      is_active: true,
      created_at: customer.created_at,
      orders: formattedOrders
    };

    return NextResponse.json({ customer: formattedCustomer, orders: formattedOrders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// PUT /api/v2/customers/[id] — Cập nhật thông tin khách hàng V2
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, address, customer_type } = body;

    const { data, error } = await supabase
      .from('v2_customers')
      .update({
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(customer_type && { customer_type })
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, message: 'Cập nhật khách hàng thành công' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
