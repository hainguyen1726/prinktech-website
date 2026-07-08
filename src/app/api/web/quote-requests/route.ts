import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// GET /api/web/quote-requests - Lấy danh sách yêu cầu báo giá (Admin)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { data: requests, error } = await supabaseAdmin
      .from('web_quote_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('[API Web Quote Requests GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/web/quote-requests - Khách hàng gửi yêu cầu báo giá (Public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_name, phone, email, material_type, quantity, dimensions, notes } = body;

    if (!customer_name || !phone) {
      return NextResponse.json({ error: 'Tên và số điện thoại là bắt buộc' }, { status: 400 });
    }

    const { data: quoteReq, error } = await supabaseAdmin
      .from('web_quote_requests')
      .insert({
        customer_name,
        phone,
        email,
        material_type,
        quantity: Number(quantity) || 0,
        dimensions,
        notes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, quoteReq });
  } catch (error: any) {
    console.error('[API Web Quote Requests POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
