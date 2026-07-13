import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(
  supabaseUrl || 'https://placeholder-supabase-url.supabase.co',
  supabaseServiceKey || 'placeholder-service-role-key',
  { db: { schema: 'printing' } }
);

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PK-${date}-${rand}`;
}

// GET /api/orders — lấy danh sách đơn hàng gộp (admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const source = searchParams.get('source') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 1. Tạo query cho retail_orders
    let retailQuery = supabase
      .from('retail_orders')
      .select('*');

    if (status && status !== 'all') {
      retailQuery = retailQuery.eq('status', status);
    }

    // 2. Tạo query cho orders (đơn admin)
    let ordersQuery = supabase
      .from('orders')
      .select('*, partners(*)')
      .contains('tags', ['prinktech']);

    if (status && status !== 'all') {
      ordersQuery = ordersQuery.eq('status', status);
    }

    // Thực hiện query song song
    const [retailRes, ordersRes] = await Promise.all([retailQuery, ordersQuery]);

    if (retailRes.error) throw retailRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const retailData = retailRes.data || [];
    const ordersData = ordersRes.data || [];

    // 3. Chuẩn hóa dữ liệu retail_orders
    const formattedRetail = retailData.map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      customer_email: o.customer_email,
      customer_note: o.customer_note,
      items: Array.isArray(o.items) ? o.items.map((item: any) => ({
        product_label: item.product_label || item.product_type || 'In tem',
        quantity: item.quantity || 0,
        unit: item.unit || 'cái',
        unit_price: item.unit_price || 0,
        subtotal: item.subtotal || 0,
        image_url: item.image_url,
        design_url: item.design_url,
        note: item.note
      })) : [],
      subtotal: Number(o.subtotal) || 0,
      shipping_fee: Number(o.shipping_fee) || 0,
      discount: Number(o.discount) || 0,
      total: Number(o.total) || 0,
      free_shipping: o.free_shipping || false,
      status: o.status,
      payment_method: o.payment_method || 'cod',
      payment_status: o.payment_status || 'unpaid',
      design_url: o.design_url,
      source: 'web',
      created_at: o.created_at
    }));

    // 4. Chuẩn hóa dữ liệu orders
    const formattedOrders = ordersData.map((o: any) => {
      const partner = o.partners || {};
      
      // Parse file Excel & PDF báo giá từ note
      const excelMatch = o.note?.match(/- Excel Báo giá:\s*(https?:\/\/[^\s\n]+)/);
      const pdfMatch = o.note?.match(/- PDF Báo giá:\s*(https?:\/\/[^\s\n]+)/);
      const excelUrl = excelMatch ? excelMatch[1] : null;
      const pdfUrl = pdfMatch ? pdfMatch[1] : null;

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
        customer_name: partner.name || 'Khách lẻ',
        customer_phone: partner.phone || '',
        customer_address: partner.address || '',
        customer_email: partner.email || '',
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
        design_url: o.design_link,
        quote_excel_url: excelUrl,
        quote_pdf_url: pdfUrl,
        source: 'admin',
        created_at: o.created_at
      };
    });

    // 5. Gộp và lọc tìm kiếm
    let allOrders = [...formattedRetail, ...formattedOrders];

    if (search) {
      const s = search.toLowerCase().trim();
      allOrders = allOrders.filter((o: any) => 
        (o.order_number && o.order_number.toLowerCase().includes(s)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(s)) ||
        (o.customer_phone && o.customer_phone.includes(s))
      );
    }

    // Lọc theo nguồn đơn (source)
    if (source && source !== 'all') {
      allOrders = allOrders.filter((o: any) => o.source === source);
    }

    // 6. Sắp xếp theo ngày tạo giảm dần
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 7. Phân trang
    const total = allOrders.length;
    const paginated = allOrders.slice(offset, offset + limit);

    return NextResponse.json({ data: paginated, total, page, limit });
  } catch (err: any) {
    console.error('Error fetching combined orders:', err);
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/orders — tạo đơn hàng mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      customer_name,
      customer_phone,
      customer_address,
      customer_email,
      customer_note,
      items,
      subtotal,
      shipping_fee,
      discount,
      total,
      free_shipping,
      payment_method,
      design_url,
      request_vat,
      vat_company_name,
      vat_tax_code,
      vat_company_address,
      vat_email,
    } = body;

    // Validate bắt buộc
    if (!customer_name?.trim()) {
      return NextResponse.json({ error: 'Thiếu tên khách hàng' }, { status: 400 });
    }
    if (!customer_phone?.trim()) {
      return NextResponse.json({ error: 'Thiếu số điện thoại' }, { status: 400 });
    }
    if (!customer_address?.trim()) {
      return NextResponse.json({ error: 'Thiếu địa chỉ giao hàng' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Đơn hàng không có sản phẩm' }, { status: 400 });
    }

    const order_number = generateOrderNumber();

    const { data, error } = await supabase
      .from('retail_orders')
      .insert({
        order_number,
        source: 'website',
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        customer_address: customer_address.trim(),
        customer_email: customer_email?.trim() || null,
        customer_note: customer_note?.trim() || null,
        items,
        subtotal: subtotal || 0,
        shipping_fee: shipping_fee || 0,
        discount: discount || 0,
        total: total || 0,
        free_shipping: free_shipping || false,
        payment_method: payment_method || 'cod',
        design_url: design_url?.trim() || null,
        status: 'pending',
        payment_status: 'unpaid',
        request_vat: request_vat || false,
        vat_company_name: vat_company_name?.trim() || null,
        vat_tax_code: vat_tax_code?.trim() || null,
        vat_company_address: vat_company_address?.trim() || null,
        vat_email: vat_email?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, order_number }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
