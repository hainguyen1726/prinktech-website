import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(
  supabaseUrl || 'https://placeholder-supabase-url.supabase.co',
  supabaseServiceKey || 'placeholder-service-role-key',
  { db: { schema: 'printing' } }
);

// Hàm ẩn thông tin nhạy cảm của khách hàng
function maskName(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return parts.map((part, i) => {
    if (i === 0 || i === parts.length - 1) return part;
    return '*'.repeat(Math.min(part.length, 3));
  }).join(' ');
}

function maskPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 7) return phone;
  return cleaned.slice(0, 4) + '***' + cleaned.slice(-3);
}

function maskAddress(address: string): string {
  if (!address) return '';
  const parts = address.split(',');
  if (parts.length <= 2) return '***, ' + parts[parts.length - 1]?.trim();
  return '***, ' + parts.slice(-2).map(p => p.trim()).join(', ');
}

function maskEmail(email: string): string {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

// GET /api/orders/track?phone=...&order_number=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone')?.trim() || '';
    const orderNumber = searchParams.get('order_number')?.trim() || '';

    // Dự phòng trường hợp query cũ gộp chung q
    const q = searchParams.get('q')?.trim() || '';

    let targetPhone = phone;
    let targetOrderNumber = orderNumber;

    if (q) {
      if (q.toUpperCase().startsWith('PK-')) {
        targetOrderNumber = q.toUpperCase();
      } else {
        targetPhone = q.replace(/[^0-9]/g, '');
      }
    }

    if (!targetPhone) {
      return NextResponse.json(
        { error: 'Số điện thoại là bắt buộc để tra cứu và bảo mật đơn hàng' },
        { status: 400 }
      );
    }

    const phoneClean = targetPhone.replace(/[^0-9]/g, '');
    if (phoneClean.length < 9) {
      return NextResponse.json(
        { error: 'Số điện thoại không hợp lệ' },
        { status: 400 }
      );
    }

    // Bắt buộc so khớp số điện thoại trong database
    let query = supabase.from('retail_orders').select('*').eq('customer_phone', phoneClean);

    if (targetOrderNumber) {
      query = query.eq('order_number', targetOrderNumber.toUpperCase());
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Mask thông tin trước khi trả về client
    const maskedOrders = orders.map(o => ({
      id: o.id,
      order_number: o.order_number,
      source: o.source,
      customer_name: maskName(o.customer_name),
      customer_phone: maskPhone(o.customer_phone),
      customer_address: maskAddress(o.customer_address),
      customer_email: o.customer_email ? maskEmail(o.customer_email) : null,
      customer_note: o.customer_note,
      items: o.items,
      subtotal: Number(o.subtotal),
      shipping_fee: Number(o.shipping_fee),
      discount: Number(o.discount),
      total: Number(o.total),
      free_shipping: o.free_shipping,
      status: o.status,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      shipping_carrier: o.shipping_carrier,
      tracking_number: o.tracking_number,
      design_url: o.design_url,
      created_at: o.created_at,
      confirmed_at: o.confirmed_at,
      shipped_at: o.shipped_at,
      delivered_at: o.delivered_at
    }));

    return NextResponse.json({ data: maskedOrders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
