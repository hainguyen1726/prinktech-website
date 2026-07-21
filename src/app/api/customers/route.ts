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
        .select('id, partner_id, total_amount, shipping_cost, discount_amount, note, status, created_at')
        .in('partner_id', partnerIds);

      (orders || []).forEach((o: any) => {
        if (!ordersByPartner[o.partner_id]) ordersByPartner[o.partner_id] = [];
        
        // Parse retail total
        const jsonMatch = o.note?.match(/- Dữ liệu sản phẩm JSON:\s*([^\n\r]+)/);
        let items = [];
        if (jsonMatch) {
          try { items = JSON.parse(jsonMatch[1]); } catch(e) {}
        }

        const calculatedItemsSubtotal = items.reduce((sum: number, it: any) => sum + (Number(it.subtotal) || 0), 0);
        const shippingFee = Number(o.shipping_cost) || 0;
        const discount = Number(o.discount_amount) || 0;

        let retailTotal = 0;
        if (calculatedItemsSubtotal > 0) {
          retailTotal = calculatedItemsSubtotal + shippingFee - discount;
        } else {
          const totalMatch = o.note?.match(/Tổng\s*([0-9\.]+k|[0-9]+)/i);
          if (totalMatch) {
            const rawT = totalMatch[1].toLowerCase();
            if (rawT.endsWith('k')) retailTotal = parseFloat(rawT) * 1000;
            else retailTotal = Number(rawT) || 0;
          }
          if (retailTotal === 0) {
            retailTotal = (Number(o.total_amount) || 0) + shippingFee - discount;
          }
        }

        ordersByPartner[o.partner_id].push({ ...o, retailTotal });
      });
    }

    const formattedData = (partners || []).map((p: any) => {
      const pOrders = ordersByPartner[p.id] || [];
      const totalSpent = pOrders.reduce((sum: number, o: any) => sum + (Number(o.retailTotal) || 0), 0);
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

    const phoneTrimmed = phone.trim();

    // KIỂM TRA TRÙNG LẶP SỐ ĐIỆN THOẠI
    const { data: existingPartner, error: checkErr } = await supabaseAdmin
      .from('partners')
      .select('id, name')
      .eq('phone', phoneTrimmed)
      .eq('partner_type', 'standard')
      .maybeSingle();

    if (checkErr) {
      return NextResponse.json({ error: checkErr.message }, { status: 500 });
    }

    if (existingPartner) {
      return NextResponse.json({ 
        error: `Số điện thoại ${phoneTrimmed} đã tồn tại trên hệ thống cho khách hàng "${existingPartner.name}"! Không thể tạo trùng lặp.` 
      }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('partners')
      .insert({
        name: name.trim(),
        phone: phoneTrimmed,
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
