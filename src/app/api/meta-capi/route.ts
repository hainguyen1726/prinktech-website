import { NextRequest, NextResponse } from 'next/server';
import { sendMetaCapiEvent } from '@/lib/metaCapi';

const ALLOWED_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'Lead',
  'Contact',
  'Purchase',
]);

/**
 * POST /api/meta-capi - Nhận sự kiện từ client và chuyển tiếp về Meta Conversions API để dedup theo event_id.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      event_name,
      event_id,
      event_source_url,
      custom_data,
      user_data,
      fbp,
      fbc,
    } = body || {};

    if (!event_name || !ALLOWED_EVENTS.has(event_name) || !event_id) {
      return NextResponse.json(
        { error: 'Invalid event_name or missing event_id' },
        { status: 400 }
      );
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp =
      forwardedFor?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;
    const cookieFbp = request.cookies.get('_fbp')?.value || fbp || null;
    const cookieFbc = request.cookies.get('_fbc')?.value || fbc || null;

    const result = await sendMetaCapiEvent({
      eventName: event_name,
      eventId: String(event_id),
      eventSourceUrl: event_source_url || request.headers.get('referer') || undefined,
      userData: {
        email: user_data?.email || null,
        phone: user_data?.phone || null,
        firstName: user_data?.name || null,
        clientIpAddress: clientIp,
        clientUserAgent: userAgent,
        fbp: cookieFbp,
        fbc: cookieFbc,
      },
      customData: custom_data || undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[API Meta CAPI Error]', err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
