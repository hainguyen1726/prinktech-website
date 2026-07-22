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

// GET /api/v2/customers — Danh sách khách hàng V2 chuẩn hóa
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type') || 'retail'; // 'retail', 'partner', hoặc 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('v2_customers')
      .select('*, v2_orders(id, total_amount, created_at, status, channel)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Lọc theo loại khách hàng
    if (type === 'retail') {
      query = query.neq('customer_type', 'partner').neq('customer_type', 'b2b');
    } else if (type === 'partner' || type === 'b2b') {
      query = query.or('customer_type.eq.partner,customer_type.eq.b2b');
    }

    if (search) {
      const s = search.trim();
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: customers, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedCustomers = (customers || []).map((c: any) => {
      // Đơn hàng hợp lệ (loại trừ đơn hủy và đơn xưởng B2B khi tính cho khách lẻ)
      const custOrders = (c.v2_orders || []).filter((o: any) => {
        if (o.status === 'cancelled') return false;
        if (type === 'retail' && o.channel === 'workshop_b2b') return false;
        return true;
      });

      const totalSpent = custOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      
      let lastOrderDate = null;
      if (custOrders.length > 0) {
        const sorted = [...custOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        lastOrderDate = sorted[0].created_at;
      }

      return {
        id: c.id,
        code: c.code || `KH-${c.phone ? c.phone.slice(-6) : '000000'}`,
        name: c.name,
        phone: c.phone,
        email: c.email || '',
        address: c.address || '',
        customer_type: c.customer_type || 'retail',
        total_orders: custOrders.length,
        total_spent: totalSpent,
        last_order_date: lastOrderDate,
        is_active: true,
        created_at: c.created_at,
      };
    });

    return NextResponse.json({ data: formattedCustomers, total: count || 0, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/v2/customers — Tạo khách hàng V2 mới
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const { name, phone, address, email, customer_type } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Thiếu tên hoặc số điện thoại' }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Check existing
    const { data: existing } = await supabase
      .from('v2_customers')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ data: existing, message: 'Khách hàng đã tồn tại' }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('v2_customers')
      .insert({
        name: name.trim(),
        phone: cleanPhone,
        address: address?.trim() || null,
        email: email?.trim() || null,
        customer_type: customer_type || 'retail'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
