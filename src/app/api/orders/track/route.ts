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

function parseCustomerFromNote(note: string) {
  const phoneMatch = note.match(/Điện thoại:\s*([0-9\s]+)/i);
  const nameMatch = note.match(/(?:địa chỉ|Khách hàng:)\s*([^.]+?)\s*(?:\.|Điện thoại:|$)/i);
  
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    phone: phoneMatch ? phoneMatch[1].replace(/\s/g, '') : null
  };
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
      if (q.toUpperCase().startsWith('PK-') || q.toUpperCase().startsWith('ORD-')) {
        targetOrderNumber = q.toUpperCase();
      } else {
        targetPhone = q.replace(/[^0-9]/g, '');
      }
    }

    if (!targetPhone && !targetOrderNumber) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp Số điện thoại hoặc Mã đơn hàng để tra cứu' },
        { status: 400 }
      );
    }

    const phoneClean = targetPhone ? targetPhone.replace(/[^0-9]/g, '') : '';
    if (phoneClean && phoneClean.length < 9) {
      return NextResponse.json(
        { error: 'Số điện thoại không hợp lệ (phải từ 9 chữ số trở lên)' },
        { status: 400 }
      );
    }

    // 1. Tìm trong retail_orders (đơn hàng đặt từ Web)
    let retailOrders: any[] = [];
    if (targetOrderNumber || phoneClean) {
      let retailQuery = supabase.from('retail_orders').select('*');
      if (targetOrderNumber) {
        retailQuery = retailQuery.eq('order_number', targetOrderNumber.toUpperCase());
      }
      if (phoneClean) {
        retailQuery = retailQuery.eq('customer_phone', phoneClean);
      }
      const { data, error: retailError } = await retailQuery;
      if (retailError) throw retailError;
      retailOrders = data || [];
    }

    // 2. Tìm trong orders (đơn hàng tạo bởi Admin)
    let matchedAdminOrders: any[] = [];
    if (targetOrderNumber) {
      // Nếu có mã đơn, truy vấn trực tiếp bằng order_code (rất nhanh)
      const { data: adminOrders, error: adminError } = await supabase
        .from('orders')
        .select('*, partners(*)')
        .eq('order_code', targetOrderNumber.toUpperCase());
      
      if (adminError) throw adminError;
      matchedAdminOrders = adminOrders || [];

      // Nếu có nhập thêm sđt, lọc tiếp để đảm bảo khớp thông tin bảo mật
      if (phoneClean && matchedAdminOrders.length > 0) {
        matchedAdminOrders = matchedAdminOrders.filter(o => {
          if (o.note && o.note.replace(/[^0-9]/g, '').includes(phoneClean)) return true;
          if (o.partners?.phone && o.partners.phone.replace(/[^0-9]/g, '') === phoneClean) return true;
          return false;
        });
      }
    } else if (phoneClean) {
      // Nếu chỉ có sđt, lấy 300 đơn gần nhất để lọc khớp số điện thoại
      const { data: adminOrders, error: adminError } = await supabase
        .from('orders')
        .select('*, partners(*)')
        .order('created_at', { ascending: false })
        .limit(300);

      if (adminError) throw adminError;

      matchedAdminOrders = (adminOrders || []).filter(o => {
        if (o.note && o.note.replace(/[^0-9]/g, '').includes(phoneClean)) return true;
        if (o.partners?.phone && o.partners.phone.replace(/[^0-9]/g, '') === phoneClean) return true;
        return false;
      });
    }

    // 3. Chuẩn hóa và mask thông tin retail_orders
    const formattedRetail = (retailOrders || []).map(o => ({
      id: o.id,
      order_number: o.order_number,
      source: 'web',
      customer_name: maskName(o.customer_name),
      customer_phone: maskPhone(o.customer_phone),
      customer_address: maskAddress(o.customer_address),
      customer_email: o.customer_email ? maskEmail(o.customer_email) : null,
      customer_note: o.customer_note,
      items: o.items || [],
      subtotal: Number(o.subtotal),
      shipping_fee: Number(o.shipping_fee),
      discount: Number(o.discount),
      total: Number(o.total),
      free_shipping: o.free_shipping,
      status: o.status,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      shipping_carrier: o.shipping_carrier || null,
      tracking_number: o.tracking_number || null,
      design_url: o.design_url,
      created_at: o.created_at,
      confirmed_at: o.confirmed_at,
      shipped_at: o.shipped_at,
      delivered_at: o.delivered_at
    }));

    // 4. Chuẩn hóa và mask thông tin admin orders
    const formattedAdmin = matchedAdminOrders.map(o => {
      const partner = o.partners || {};
      const parsed = parseCustomerFromNote(o.note || '');
      const custName = parsed.name || partner.name || 'Khách lẻ';
      const custPhone = parsed.phone || partner.phone || '';
      
      const excelMatch = o.note?.match(/- Excel Báo giá:\s*(https?:\/\/[^\s\n]+)/);
      const pdfMatch = o.note?.match(/- PDF Báo giá:\s*(https?:\/\/[^\s\n]+)/);
      const carrierMatch = o.note?.match(/- Đơn vị vận chuyển:\s*([^\n\r]+)/);
      const trackingMatch = o.note?.match(/- Mã vận đơn:\s*([^\n\r]+)/);
      
      const excelUrl = excelMatch ? excelMatch[1] : null;
      const pdfUrl = pdfMatch ? pdfMatch[1] : null;
      const shippingCarrier = carrierMatch ? carrierMatch[1].trim() : null;
      const trackingNumber = trackingMatch ? trackingMatch[1].trim() : null;

      const items = [
        {
          product_label: o.sticker_type === 'dtf_roll' ? 'In tem UV DTF cuộn' : 'In tem UV DTF cái/tờ',
          quantity: o.quantity_expected || 0,
          unit: o.sticker_type === 'dtf_roll' ? 'mét' : 'cái/tờ',
          unit_price: o.unit_price || 0,
          subtotal: o.total_amount || 0,
          image_url: o.preview_image,
          design_url: o.design_link,
          note: null
        }
      ];

      return {
        id: o.id,
        order_number: o.order_code,
        source: 'admin',
        customer_name: maskName(custName),
        customer_phone: maskPhone(custPhone),
        customer_address: maskAddress(partner.address || ''),
        customer_email: partner.email ? maskEmail(partner.email) : null,
        customer_note: o.note || '',
        items: items,
        subtotal: (o.unit_price || 0) * (o.quantity_actual || 1),
        shipping_fee: o.shipping_cost || 0,
        discount: o.discount_amount || 0,
        total: o.total_amount || 0,
        free_shipping: o.shipping_cost === 0,
        status: o.status || 'processing',
        payment_method: 'cod',
        payment_status: o.payment_status || 'unpaid',
        shipping_carrier: shippingCarrier,
        tracking_number: trackingNumber,
        design_url: o.design_link,
        quote_excel_url: excelUrl,
        quote_pdf_url: pdfUrl,
        created_at: o.created_at,
        confirmed_at: o.confirmed_at,
        shipped_at: o.shipped_at,
        delivered_at: o.delivered_at
      };
    });

    // 5. Gộp kết quả và sắp xếp
    const allOrders = [...formattedRetail, ...formattedAdmin];
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ data: allOrders });
  } catch (err: any) {
    console.error('Error tracking orders:', err);
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
