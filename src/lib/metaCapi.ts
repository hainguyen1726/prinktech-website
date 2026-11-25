import crypto from 'crypto';

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || '2297118074425178';

const META_GRAPH_VERSION = 'v25.0';

export interface MetaCapiUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  externalId?: string | null;
}

export interface MetaCapiEventInput {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  actionSource?: 'website' | 'chat' | 'other';
  userData?: MetaCapiUserData;
  customData?: Record<string, unknown>;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Chuẩn hóa số điện thoại Việt Nam về dạng quốc tế (84xxxxxxxxx) trước khi hash SHA-256.
 */
function normalizeVietnamPhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0') && digits.length >= 9) {
    return `84${digits.slice(1)}`;
  }
  return digits;
}

function normalizeEmail(rawEmail?: string | null): string | null {
  if (!rawEmail) return null;
  const trimmed = rawEmail.trim().toLowerCase();
  return trimmed || null;
}

function buildHashedUserData(userData?: MetaCapiUserData): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    country: [sha256('vn')],
  };

  if (!userData) return payload;

  const phone = normalizeVietnamPhone(userData.phone);
  if (phone) payload.ph = [sha256(phone)];

  const email = normalizeEmail(userData.email);
  if (email) payload.em = [sha256(email)];

  const name = userData.firstName?.trim().toLowerCase();
  if (name) payload.fn = [sha256(name)];

  if (userData.externalId) payload.external_id = [sha256(userData.externalId)];
  if (userData.clientIpAddress) payload.client_ip_address = userData.clientIpAddress;
  if (userData.clientUserAgent) payload.client_user_agent = userData.clientUserAgent;
  if (userData.fbp) payload.fbp = userData.fbp;
  if (userData.fbc) payload.fbc = userData.fbc;

  return payload;
}

/**
 * Gửi sự kiện chuyển đổi về Meta Conversions API (server-side) kèm event_id để khử trùng lặp với Browser Pixel.
 */
export async function sendMetaCapiEvent(input: MetaCapiEventInput): Promise<{
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  fbtrace_id?: string;
}> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      sent: false,
      skipped: true,
      reason: 'META_CAPI_ACCESS_TOKEN not configured',
    };
  }

  const eventPayload: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: input.actionSource || 'website',
    user_data: buildHashedUserData(input.userData),
  };

  if (input.eventSourceUrl) {
    eventPayload.event_source_url = input.eventSourceUrl;
  }
  if (input.customData && Object.keys(input.customData).length > 0) {
    eventPayload.custom_data = input.customData;
  }

  const body: Record<string, unknown> = {
    data: [eventPayload],
  };

  if (process.env.META_CAPI_TEST_EVENT_CODE) {
    body.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;
  }

  try {
    const endpoint = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[Meta CAPI Error]', res.status, json);
      return {
        sent: false,
        reason: json?.error?.message || `HTTP ${res.status}`,
      };
    }

    return {
      sent: true,
      fbtrace_id: json?.fbtrace_id,
    };
  } catch (err) {
    console.error('[Meta CAPI Request Failed]', err);
    return {
      sent: false,
      reason: (err as Error).message,
    };
  }
}

/**
 * Chuẩn hóa tên kênh bán hàng từ UTM/fbclid cho bảng retail_orders.
 */
export function resolveOrderSource(utmSource?: string | null, fbclid?: string | null): string {
  const src = (utmSource || '').toLowerCase().trim();
  if (fbclid || src.includes('facebook') || src === 'fb' || src.includes('meta') || src.includes('instagram') || src === 'ig') {
    return 'facebook';
  }
  if (src.includes('tiktok')) return 'tiktok';
  if (src.includes('youtube')) return 'youtube';
  if (src.includes('shopee')) return 'shopee';
  return 'website';
}
