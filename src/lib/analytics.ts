'use client';

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || '2297118074425178';

export const GA4_ID = 'G-HKSYJR8T5S';

const ATTRIBUTION_STORAGE_KEY = 'prinktech_attribution';

export interface AttributionParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  landing_path?: string;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
}

/**
 * Tạo giá trị _fbc chuẩn Meta (fb.1.<timestamp_ms>.<fbclid>) khi có fbclid trên URL.
 */
function buildFbc(fbclid: string): string {
  return `fb.1.${Date.now()}.${fbclid}`;
}

/**
 * Lưu UTM params và fbclid từ URL hiện tại vào sessionStorage để giữ xuyên suốt hành trình chuyển đổi.
 */
export function captureAttributionParams(): AttributionParams {
  if (typeof window === 'undefined') return {};

  const existing = getAttributionParams();
  const params = new URLSearchParams(window.location.search);

  const utm_source = params.get('utm_source') || existing.utm_source;
  const utm_medium = params.get('utm_medium') || existing.utm_medium;
  const utm_campaign = params.get('utm_campaign') || existing.utm_campaign;
  const utm_content = params.get('utm_content') || existing.utm_content;
  const utm_term = params.get('utm_term') || existing.utm_term;
  const fbclid = params.get('fbclid') || existing.fbclid;

  const cookieFbc = readCookie('_fbc');
  const fbc = cookieFbc || (fbclid ? existing.fbc || buildFbc(fbclid) : existing.fbc);
  const fbp = readCookie('_fbp') || existing.fbp;

  const updated: AttributionParams = {
    ...(utm_source ? { utm_source } : {}),
    ...(utm_medium ? { utm_medium } : {}),
    ...(utm_campaign ? { utm_campaign } : {}),
    ...(utm_content ? { utm_content } : {}),
    ...(utm_term ? { utm_term } : {}),
    ...(fbclid ? { fbclid } : {}),
    ...(fbc ? { fbc } : {}),
    ...(fbp ? { fbp } : {}),
    landing_path: existing.landing_path || window.location.pathname,
  };

  try {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Bỏ qua nếu trình duyệt chặn storage
  }

  return updated;
}

/**
 * Đọc lại thông tin nguồn chiến dịch (UTM/fbclid/fbp/fbc) đã lưu trong phiên làm việc.
 */
export function getAttributionParams(): AttributionParams {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    const parsed: AttributionParams = raw ? JSON.parse(raw) : {};
    return {
      ...parsed,
      fbp: readCookie('_fbp') || parsed.fbp,
      fbc: readCookie('_fbc') || parsed.fbc,
    };
  } catch {
    return {};
  }
}

export function createEventId(prefix = 'evt'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

function sendGa4Event(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  const gaMap: Record<string, string> = {
    ViewContent: 'view_item',
    AddToCart: 'add_to_cart',
    InitiateCheckout: 'begin_checkout',
    Lead: 'generate_lead',
    Purchase: 'purchase',
    Contact: 'contact',
  };

  const gaEventName = gaMap[eventName];
  if (!gaEventName) return;

  window.gtag('event', gaEventName, params || {});
}

export interface TrackEventOptions {
  eventName:
    | 'PageView'
    | 'ViewContent'
    | 'AddToCart'
    | 'InitiateCheckout'
    | 'Lead'
    | 'Contact'
    | 'Purchase';
  eventId?: string;
  params?: Record<string, unknown>;
  userData?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  sendServerCapi?: boolean;
}

/**
 * Bắn sự kiện đồng bộ qua Browser Meta Pixel, GA4 và tùy chọn Server CAPI (dùng chung eventId để dedup).
 */
export function trackEvent({
  eventName,
  eventId: providedEventId,
  params,
  userData,
  sendServerCapi = true,
}: TrackEventOptions): string {
  const eventId = providedEventId || createEventId(eventName.toLowerCase());

  if (typeof window !== 'undefined') {
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, params || {}, { eventID: eventId });
    }

    sendGa4Event(eventName, {
      ...params,
      transaction_id: params?.order_id || eventId,
    });

    if (sendServerCapi && eventName !== 'PageView') {
      const attr = getAttributionParams();
      fetch('/api/meta-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          event_name: eventName,
          event_id: eventId,
          event_source_url: window.location.href,
          custom_data: params,
          user_data: userData,
          fbp: attr.fbp,
          fbc: attr.fbc,
        }),
      }).catch(() => {
        // Không làm gián đoạn trải nghiệm người dùng nếu request tracking lỗi
      });
    }
  }

  return eventId;
}

/**
 * Ghi nhận sự kiện khách bấm vào các kênh tư vấn (Zalo, Messenger, Hotline).
 */
export function trackContact(
  channel: 'zalo' | 'messenger' | 'phone',
  placement: string
) {
  trackEvent({
    eventName: 'Contact',
    params: {
      content_name: `contact_${channel}`,
      content_category: placement,
    },
    sendServerCapi: true,
  });
}
