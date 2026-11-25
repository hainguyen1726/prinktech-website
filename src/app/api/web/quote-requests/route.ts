import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import { sendMetaCapiEvent } from '@/lib/metaCapi';

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
    const {
      customer_name,
      phone,
      email,
      material_type,
      quantity,
      dimensions,
      notes,
      event_id,
      event_source_url,
      utm_source,
      utm_campaign,
      utm_content,
      fbp,
      fbc,
    } = body;

    if (!customer_name || !phone) {
      return NextResponse.json({ error: 'Tên và số điện thoại là bắt buộc' }, { status: 400 });
    }

    const utmTags = [
      utm_source ? `src=${utm_source}` : '',
      utm_campaign ? `camp=${utm_campaign}` : '',
      utm_content ? `ad=${utm_content}` : '',
    ].filter(Boolean);
    const finalNotes = [
      notes?.trim(),
      utmTags.length > 0 ? `[Ads: ${utmTags.join(' | ')}]` : '',
    ]
      .filter(Boolean)
      .join(' ') || null;

    const { data: quoteReq, error } = await supabaseAdmin
      .from('web_quote_requests')
      .insert({
        customer_name: customer_name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        material_type: material_type || null,
        quantity: Number(quantity) || 0,
        dimensions: dimensions || null,
        notes: finalNotes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp =
      forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
    await sendMetaCapiEvent({
      eventName: 'Lead',
      eventId: event_id || `lead_${quoteReq.id}`,
      eventSourceUrl: event_source_url || request.headers.get('referer') || undefined,
      userData: {
        firstName: customer_name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        clientIpAddress: clientIp,
        clientUserAgent: request.headers.get('user-agent') || null,
        fbp: request.cookies.get('_fbp')?.value || fbp || null,
        fbc: request.cookies.get('_fbc')?.value || fbc || null,
        externalId: String(quoteReq.id),
      },
      customData: {
        content_name: material_type || 'Tư vấn in UV DTF',
        currency: 'VND',
      },
    });

    return NextResponse.json({ success: true, quoteReq });
  } catch (error: any) {
    console.error('[API Web Quote Requests POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
