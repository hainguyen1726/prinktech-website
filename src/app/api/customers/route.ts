import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/customers — danh sách khách hàng (từ printing.partners)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('partners')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: partners, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get orders for each partner to compute summary totals
    const partnerIds = (partners || []).map((p: any) => p.id);

    const ordersByPartner: Record<string, any[]> = {};
    if (partnerIds.length > 0) {
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id, partner_id, total_amount, status, created_at')
        .in('partner_id', partnerIds);

      (orders || []).forEach((o: any) => {
        if (!ordersByPartner[o.partner_id]) ordersByPartner[o.partner_id] = [];
        ordersByPartner[o.partner_id].push(o);
      });
    }

    const formattedData = (partners || []).map((p: any) => {
      const pOrders = ordersByPartner[p.id] || [];
      const totalSpent = pOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
      return {
        ...p,
        customer_code: `KH-${p.id.slice(0, 6).toUpperCase()}`,
        total_orders: pOrders.length,
        total_spent: totalSpent,
        is_active: true,
      };
    });

    return NextResponse.json({ data: formattedData, total: count, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/customers — tạo mới khách hàng trong printing.partners
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, address, partner_type } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Thiếu tên khách hàng' }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Thiếu số điện thoại' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('partners')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        address: address?.trim() || null,
        partner_type: partner_type || 'standard',
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
