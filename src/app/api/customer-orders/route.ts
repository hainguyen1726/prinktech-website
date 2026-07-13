import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// GET /api/customer-orders
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('customer_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (partnerId) query = query.eq('partner_id', partnerId);
    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.ilike('order_code', `%${search}%`);

    const { data: orders, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: orders, total: count, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/customer-orders
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const {
      partner_id,
      sticker_type,
      design_link,
      preview_image,
      quantity_expected,
      unit_price,
      shipping_cost,
      note,
    } = body;

    if (!partner_id) {
      return NextResponse.json({ error: 'Thiếu partner_id (Khách hàng)' }, { status: 400 });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(Math.random() * 9000) + 1000;
    const order_code = `ORD-${dateStr}-${randNum}`;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        order_code,
        partner_id,
        sticker_type: sticker_type || 'dtf_roll',
        design_link: design_link || null,
        preview_image: preview_image || null,
        quantity_expected: quantity_expected || 0,
        unit_price: unit_price || 0,
        shipping_cost: shipping_cost || 0,
        status: 'processing',
        payment_status: 'unpaid',
        note: note || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Write to order_logs
    await supabaseAdmin.from('order_logs').insert({
      order_id: data.id,
      action: 'create',
      changes: { order_code },
      changed_by_name: 'Admin Panel',
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
