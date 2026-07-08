import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'printing' } }
);

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PK-${date}-${rand}`;
}

// GET /api/orders — lấy danh sách đơn hàng (admin)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('retail_orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,order_number.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, page, limit });
}

// POST /api/orders — tạo đơn hàng mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      customer_name,
      customer_phone,
      customer_address,
      customer_email,
      customer_note,
      items,
      subtotal,
      shipping_fee,
      discount,
      total,
      free_shipping,
      payment_method,
      design_url,
      request_vat,
      vat_company_name,
      vat_tax_code,
      vat_company_address,
      vat_email,
    } = body;

    // Validate bắt buộc
    if (!customer_name?.trim()) {
      return NextResponse.json({ error: 'Thiếu tên khách hàng' }, { status: 400 });
    }
    if (!customer_phone?.trim()) {
      return NextResponse.json({ error: 'Thiếu số điện thoại' }, { status: 400 });
    }
    if (!customer_address?.trim()) {
      return NextResponse.json({ error: 'Thiếu địa chỉ giao hàng' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Đơn hàng không có sản phẩm' }, { status: 400 });
    }

    const order_number = generateOrderNumber();

    const { data, error } = await supabase
      .from('retail_orders')
      .insert({
        order_number,
        source: 'website',
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        customer_address: customer_address.trim(),
        customer_email: customer_email?.trim() || null,
        customer_note: customer_note?.trim() || null,
        items,
        subtotal: subtotal || 0,
        shipping_fee: shipping_fee || 0,
        discount: discount || 0,
        total: total || 0,
        free_shipping: free_shipping || false,
        payment_method: payment_method || 'cod',
        design_url: design_url?.trim() || null,
        status: 'pending',
        payment_status: 'unpaid',
        request_vat: request_vat || false,
        vat_company_name: vat_company_name?.trim() || null,
        vat_tax_code: vat_tax_code?.trim() || null,
        vat_company_address: vat_company_address?.trim() || null,
        vat_email: vat_email?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, order_number }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
