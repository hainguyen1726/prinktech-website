import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// GET /api/customers/[id] — thông tin KH + danh sách đơn + history
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;

    const { data: customer, error: cErr } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();

    if (cErr || !customer) {
      return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }

    // Get orders for this partner
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('partner_id', id)
      .order('created_at', { ascending: false });

    const orderIds = (orders || []).map((o: any) => o.id);

    const logsByOrder: Record<string, any[]> = {};
    if (orderIds.length > 0) {
      const { data: logs } = await supabaseAdmin
        .from('order_logs')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

      (logs || []).forEach((l: any) => {
        if (!logsByOrder[l.order_id]) logsByOrder[l.order_id] = [];
        logsByOrder[l.order_id].push({
          id: l.id,
          order_id: l.order_id,
          event_type: l.action || 'updated',
          description: typeof l.changes === 'object' && l.changes !== null
            ? `Thay đổi: ${Object.keys(l.changes).join(', ') || l.action}`
            : (l.action || 'Cập nhật'),
          created_by: l.changed_by_name || 'Hệ thống',
          created_at: l.created_at,
        });
      });
    }

    const formattedOrders = (orders || []).map((o: any) => {
      // Parse file Excel & PDF báo giá từ note
      const excelMatch = o.note?.match(/- Excel Báo giá:\s*(https?:\/\/[^\s\n]+)/);
      const pdfMatch = o.note?.match(/- PDF Báo giá:\s*(https?:\/\/[^\s\n]+)/);
      const excelUrl = excelMatch ? excelMatch[1] : null;
      const pdfUrl = pdfMatch ? pdfMatch[1] : null;

      return {
        id: o.id,
        order_number: o.order_code,
        customer_id: o.partner_id,
        sticker_type: o.sticker_type || 'uv_dtf_noi',
        quantity_items: o.quantity_expected,
        quantity_meters: o.quantity_actual,
        design_link: o.design_link,
        preview_image_url: o.preview_image,
        nesting_image_url: o.layout_image || o.preview_image,
        label_link: o.label_link,
        subtotal: (o.unit_price || 0) * (o.quantity_actual || 1),
        shipping_fee: o.shipping_cost || 0,
        discount: o.discount_amount || 0,
        total: o.total_amount || 0,
        unit_price_per_meter: o.unit_price,
        shipping_method: 'cod',
        status: o.status || 'processing',
        payment_status: o.payment_status || 'unpaid',
        notes: o.note,
        quote_excel_url: excelUrl,
        quote_pdf_url: pdfUrl,
        created_at: o.created_at,
        updated_at: o.updated_at,
        history: logsByOrder[o.id] || [],
      };
    });

    const formattedCustomer = {
      ...customer,
      customer_code: `KH-${customer.id.slice(0, 6).toUpperCase()}`,
      total_orders: formattedOrders.length,
      total_spent: formattedOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
    };

    return NextResponse.json({ customer: formattedCustomer, orders: formattedOrders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// PATCH /api/customers/[id] — cập nhật KH
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from('partners')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
