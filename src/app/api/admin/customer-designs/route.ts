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

    let query = supabase
      .from('customer_designs')
      .select('*, partners(id, name, phone, address)');

    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    if (partnerPhone) {
      const cleanPhone = partnerPhone.replace(/\s+/g, '');
      const { data: p } = await supabase
        .from('partners')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone.eq.${partnerPhone}`)
        .maybeSingle();

      if (p) {
        query = query.eq('partner_id', p.id);
      }
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

// POST /api/admin/customer-designs — Thêm hoặc cập nhật mẫu thiết kế vào kho
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const { partner_id, name, size_label, sticker_type, file_url, preview_url, unit_price, note } = body;

    if (!partner_id || !name) {
      return NextResponse.json({ error: 'partner_id và name là bắt buộc' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('customer_designs')
      .insert([{
        partner_id,
        name,
        size_label: size_label || '',
        sticker_type: sticker_type || 'dtf_sheet',
        file_url: file_url || null,
        preview_url: preview_url || null,
        unit_price: Number(unit_price) || 0,
        note: note || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
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
