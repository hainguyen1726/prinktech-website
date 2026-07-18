import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// GET /api/customers — danh sách khách hàng riêng của Prink Tech Website (partner_type = 'standard')
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const filterDuplicates = searchParams.get('filter_duplicates') === 'true';

    if (filterDuplicates) {
      // 1. Tìm các số điện thoại bị trùng của khách hàng standard
      const { data: dupPhones, error: dupErr } = await supabaseAdmin.rpc('run_sql', {
        sql: `
          SELECT phone
          FROM printing.partners
          WHERE partner_type = 'standard' AND phone IS NOT NULL AND phone != ''
          GROUP BY phone
          HAVING COUNT(*) > 1
        `
      });

      if (dupErr) {
        return NextResponse.json({ error: dupErr.message }, { status: 500 });
      }

      const phones = (dupPhones || []).map((p: any) => p.phone);

      if (phones.length === 0) {
        return NextResponse.json({ data: [], total: 0, isDuplicateView: true });
      }

      // 2. Lấy thông tin của tất cả partners có số điện thoại trùng đó
      const { data: partners, error: pErr } = await supabaseAdmin
        .from('partners')
        .select('*')
        .eq('partner_type', 'standard')
        .in('phone', phones)
        .order('phone')
        .order('created_at', { ascending: true });

      if (pErr) {
        return NextResponse.json({ error: pErr.message }, { status: 500 });
      }

      const partnerIds = (partners || []).map((p: any) => p.id);

      // 3. Lấy tất cả đơn hàng để tính tổng đơn và số tiền tích lũy
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

      // 4. Format thông tin khách hàng lẻ
      const formattedPartners = (partners || []).map((p: any) => {
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

      // 5. Gom nhóm các partners theo phone
      const groupsMap = new Map<string, any[]>();
      formattedPartners.forEach((p: any) => {
        if (!groupsMap.has(p.phone)) {
          groupsMap.set(p.phone, []);
        }
        groupsMap.get(p.phone)!.push(p);
      });

      const groupedData = Array.from(groupsMap.entries()).map(([phone, customers]) => ({
        phone,
        customers,
      }));

      return NextResponse.json({
        data: groupedData,
        total: groupedData.length,
        isDuplicateView: true,
      });
    }

    // Tách riêng khách Prink Tech Website: chỉ lấy partner_type = 'standard'
    // (Bỏ qua các đại lý sỉ/xưởng agent_level_1, agent_level_2)
    let query = supabaseAdmin
      .from('partners')
      .select('*', { count: 'exact' })
      .eq('partner_type', 'standard')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: partners, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

// POST /api/customers — tạo mới khách hàng lẻ cho Prink Tech Website
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const { name, phone, email, address } = body;

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
        partner_type: 'standard', // Đặt cứng partner_type cho khách Prink Tech Website
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
