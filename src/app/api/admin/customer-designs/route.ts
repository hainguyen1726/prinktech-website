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

// GET /api/admin/customer-designs — Tra cứu kho mẫu thiết kế theo khách hàng hoặc từ khoá
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partner_id');
    const partnerPhone = searchParams.get('partner_phone');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope'); // 'all' để xem tất cả khách hàng nếu muốn

    let targetPartnerId: string | null = partnerId || null;

    // Nếu truyền sdt mà chưa truyền partner_id -> Tìm partner
    if (!targetPartnerId && partnerPhone) {
      const cleanPhone = partnerPhone.replace(/\D/g, '');
      if (cleanPhone) {
        const { data: p } = await supabase
          .from('partners')
          .select('id')
          .or(`phone.ilike.%${cleanPhone}%,phone.eq.${partnerPhone}`)
          .maybeSingle();

        if (p) {
          targetPartnerId = p.id;
        } else {
          // Khách hàng chưa từng lưu trong hệ thống -> Trả về rỗng ngay (KHÔNG lộ mẫu khách khác) trừ khi chọn 'all'
          if (scope !== 'all') {
            return NextResponse.json({ data: [] });
          }
        }
      }
    }

    let query = supabase
      .from('customer_designs')
      .select('*, partners(id, name, phone, address)');

    if (targetPartnerId && scope !== 'all') {
      query = query.eq('partner_id', targetPartnerId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,size_label.ilike.%${search}%,note.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/customer-designs — Thêm mẫu thiết kế mới vào kho (Auto-create partner nếu thiếu ID)
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json();
    let { partner_id } = body;
    const { partner_phone, customer_name, name, size_label, sticker_type, file_url, preview_url, unit_price, note } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên mẫu thiết kế là bắt buộc' }, { status: 400 });
    }

    // Tự động tìm hoặc tạo partner_id nếu không được truyền trực tiếp
    if (!partner_id) {
      if (partner_phone) {
        const cleanPhone = partner_phone.replace(/\D/g, '');
        const { data: existingP } = await supabase
          .from('partners')
          .select('id')
          .or(`phone.ilike.%${cleanPhone}%,phone.eq.${partner_phone}`)
          .maybeSingle();

        if (existingP) {
          partner_id = existingP.id;
        } else {
          // Tạo đối tác mới
          const { data: newP, error: pErr } = await supabase
            .from('partners')
            .insert([{
              name: customer_name?.trim() || 'Khách hàng mới',
              phone: partner_phone.trim(),
              address: 'Chưa cập nhật địa chỉ'
            }])
            .select()
            .single();

          if (!pErr && newP) {
            partner_id = newP.id;
          }
        }
      }
    }

    if (!partner_id) {
      return NextResponse.json({ error: 'Không thể xác định đối tác (cần partner_id hoặc partner_phone)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('customer_designs')
      .insert([{
        partner_id,
        name: name.trim(),
        size_label: size_label?.trim() || '',
        sticker_type: sticker_type || 'dtf_sheet',
        file_url: file_url?.trim() || null,
        preview_url: preview_url?.trim() || null,
        unit_price: Number(unit_price) || 0,
        note: note?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('*, partners(id, name, phone, address)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/admin/customer-designs — Cập nhật mẫu thiết kế (Link file, đơn giá, tên, note)
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const { id, name, size_label, unit_price, file_url, preview_url, note } = body;

    if (!id) {
      return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (name !== undefined) updates.name = name;
    if (size_label !== undefined) updates.size_label = size_label;
    if (unit_price !== undefined) updates.unit_price = Number(unit_price) || 0;
    if (file_url !== undefined) updates.file_url = file_url || null;
    if (preview_url !== undefined) updates.preview_url = preview_url || null;
    if (note !== undefined) updates.note = note || null;

    const { data, error } = await supabase
      .from('customer_designs')
      .update(updates)
      .eq('id', id)
      .select('*, partners(id, name, phone, address)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/customer-designs — Xoá tệp thiết kế khỏi kho
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });
    }

    const { error } = await supabase
      .from('customer_designs')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
