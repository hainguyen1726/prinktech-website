import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/web/quote-requests/[id] - Cập nhật trạng thái yêu cầu báo giá (Admin)
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'contacted', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const { data: quoteReq, error } = await supabaseAdmin
      .from('web_quote_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, quoteReq });
  } catch (error: any) {
    console.error('[API Web Quote Request PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// DELETE /api/web/quote-requests/[id] - Xóa yêu cầu báo giá (Admin)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await context.params;

    const { error } = await supabaseAdmin
      .from('web_quote_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Web Quote Request DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
