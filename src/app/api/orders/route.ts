import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(
  supabaseUrl || 'https://placeholder-supabase-url.supabase.co',
  supabaseServiceKey || 'placeholder-service-role-key',
  { db: { schema: 'printing' } }
);

function mapLegacyToRetailStatus(legacyStatus: string): string {
  switch (legacyStatus) {
    case 'pending_file':
    case 'rejected_file':
      return 'pending';
    case 'pending_print':
      return 'confirmed';
    case 'printing':
    case 'processing':
      return 'printing';
    case 'pending_delivery':
    case 'delivering':
      return 'shipped';
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

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
    const vat = searchParams.get('vat') || 'all'; // all, yes, no
    const from = searchParams.get('from'); // YYYY-MM-DD
    const to = searchParams.get('to'); // YYYY-MM-DD
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
    if (from) {
      retailQuery = retailQuery.gte('created_at', `${from}T00:00:00.000Z`);
    }
    if (to) {
      retailQuery = retailQuery.lte('created_at', `${to}T23:59:59.999Z`);
    }

    // 2. Tạo query cho orders (đơn admin)
    let ordersQuery = supabase
      .from('orders')
      .select('*, partners(*)');

    if (status && status !== 'all') {
      ordersQuery = ordersQuery.eq('status', status);
    }
    if (from) {
      ordersQuery = ordersQuery.gte('created_at', `${from}T00:00:00.000Z`);
    }
    if (to) {
      ordersQuery = ordersQuery.lte('created_at', `${to}T23:59:59.999Z`);
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
      shipping_carrier: o.shipping_carrier || null,
      tracking_number: o.tracking_number || null,
      converted_length: Number(o.converted_length) || 0,
      cost_amount: Number(o.cost_amount) || 0,
      packaging_fee: 0,
      source: 'website',
      has_vat: o.request_vat || false,
      note: o.note || '',
      tags: [],
      created_at: o.created_at
    }));

    // Lọc đơn hàng của Prink Tech: chỉ lấy đơn hàng của khách lẻ (partner_type = 'standard') hoặc đơn hàng có tag 'prinktech'
    const prinktechOrdersData = ordersData.filter((o: any) => {
      const isStandard = o.partners?.partner_type === 'standard';
      const hasTag = Array.isArray(o.tags) && o.tags.includes('prinktech');
      return isStandard || hasTag;
    });

    // 4. Chuẩn hóa dữ liệu orders
    const formattedOrders = prinktechOrdersData.map((o: any) => {
      const partner = o.partners || {};
      
      // Parse file Excel & PDF báo giá, thông tin vận chuyển từ note
      const excelMatch = o.note?.match(/- Excel Báo giá:\s*(https?:\/\/[^\s\n]+)/);
      const pdfMatch = o.note?.match(/- PDF Báo giá:\s*(https?:\/\/[^\s\n]+)/);
      const carrierMatch = o.note?.match(/- Đơn vị vận chuyển:\s*([^\n\r]+)/);
      const trackingMatch = o.note?.match(/- Mã vận đơn:\s*([^\n\r]+)/);
      const jsonMatch = o.note?.match(/- Dữ liệu sản phẩm JSON:\s*([^\n\r]+)/);
      
      const excelUrl = excelMatch ? excelMatch[1] : null;
      const pdfUrl = pdfMatch ? pdfMatch[1] : null;
      const shippingCarrier = carrierMatch ? carrierMatch[1].trim() : null;
      const trackingNumber = trackingMatch ? trackingMatch[1].trim() : null;

      let items = [];
      if (jsonMatch) {
        try {
          items = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.error('Error parsing items JSON:', e);
        }
      }

      if (!items || items.length === 0) {
        items = [
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
      }

      // Chuẩn hóa từng item để luôn có unit_price và unit chuẩn, tránh NaN ₫
      items = items.map((it: any) => {
        const q = Number(it.quantity) || 1;
        const sub = Number(it.subtotal) || 0;
        const price = Number(it.unit_price) > 0 
          ? Number(it.unit_price) 
          : (Number(it.rate_excl_vat) > 0 
            ? Number(it.rate_excl_vat) 
            : (sub > 0 && q > 0 ? Math.round(sub / q) : 0));
        return {
          ...it,
          product_label: it.product_label || it.name || 'Tem UV DTF',
          quantity: q,
          unit: it.unit || it.size_label || 'cái',
          unit_price: price,
          subtotal: sub || Math.round(q * price)
        };
      });

      // TÍNH TỔNG TIỀN TẠM TÍNH BÁN LẺ DỰA TRÊN CÁC SẢN PHẨM TRONG ĐƠN (RETAIL SUBTOTAL)
      const calculatedItemsSubtotal = items.reduce((sum: number, it: any) => sum + (Number(it.subtotal) || 0), 0);
      const itemSubtotal = calculatedItemsSubtotal > 0 ? calculatedItemsSubtotal : (Number(o.total_amount) || 0);

      const shippingFee = Number(o.shipping_cost) || 0;
      const discount = Number(o.discount_amount) || 0;
      
      const tags = Array.isArray(o.tags) ? o.tags : [];
      const hasVat = tags.some((t: string) => t.toLowerCase().includes('vat'));
      const vatAmount = hasVat ? Math.round(itemSubtotal * 0.08) : 0;
      const total = itemSubtotal + shippingFee + vatAmount - discount;

      let orderSource = 'admin';
      if (Array.isArray(o.tags)) {
        const found = o.tags.find((t: string) => t.toLowerCase().startsWith('nguồn:'));
        if (found) {
          orderSource = found.replace(/nguồn:\s*/i, '').trim().toLowerCase();
        }
      }

      const rawCost = Number(o.cost_amount) || 0;
      const actualMeters = Number(o.quantity_actual) || 0;

      // Giá vốn xưởng (Giá vốn trả xưởng = số mét thực tế * 150.000đ. Nếu chưa nhập số mét hoặc ghép đơn = 0m, giá vốn = 0đ)
      let calculatedCost = 0;
      if (actualMeters > 0) {
        calculatedCost = rawCost > 0 ? rawCost : Math.round(actualMeters * 150000);
      } else if (rawCost > 0 && rawCost <= itemSubtotal * 1.5) {
        calculatedCost = rawCost;
      } else {
        calculatedCost = 0;
      }

      return {
        id: o.id,
        order_number: o.order_code,
        customer_name: partner.name || 'Khách lẻ',
        customer_phone: partner.phone || '',
        customer_address: partner.address || '',
        customer_email: partner.email || '',
        customer_note: o.note || '',
        items: items,
        subtotal: itemSubtotal,
        shipping_fee: shippingFee,
        discount: discount,
        total: total,
        free_shipping: shippingFee === 0,
        status: mapLegacyToRetailStatus(o.status || 'processing'),
        payment_method: 'cod',
        payment_status: o.payment_status || 'unpaid',
        design_url: o.design_link,
        quote_excel_url: excelUrl,
        quote_pdf_url: pdfUrl,
        shipping_carrier: shippingCarrier,
        tracking_number: trackingNumber,
        source: orderSource,
        has_vat: Array.isArray(o.tags) && o.tags.includes('VAT 8%'),
        note: o.note || '',
        tags: o.tags || [],
        created_at: o.created_at,
        converted_length: actualMeters,
        cost_amount: calculatedCost,
        packaging_fee: (Number(o.packaging_unit_price) || 0) * (Number(o.pack_total_packs) || 0)
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

    // Lọc theo VAT (vat)
    if (vat && vat !== 'all') {
      const needVat = vat === 'yes';
      allOrders = allOrders.filter((o: any) => o.has_vat === needVat);
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

function calculateConvertedLength(items: any[]): number {
  let totalMeters = 0;
  for (const item of items) {
    const label = (item.product_label || item.product_type || '').toLowerCase();
    const qty = Number(item.quantity) || 0;
    const unit = (item.unit || '').toLowerCase();
    
    if (unit === 'mét' || unit === 'm' || label.includes('cuộn') || label.includes('roll')) {
      totalMeters += qty;
    } else if (unit === 'tờ a4' || label.includes('a4')) {
      totalMeters += qty * 0.125;
    } else if (unit === 'tờ a3' || label.includes('a3')) {
      totalMeters += qty * 0.25;
    } else {
      // Thử parse kích thước con tem dạng "5x5cm", "10x10", "5x5" từ label
      const sizeMatch = label.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
      if (sizeMatch) {
        const width = parseFloat(sizeMatch[1]);
        const height = parseFloat(sizeMatch[2]);
        // Diện tích có cộng lề bế 0.5cm
        const s = (width + 0.5) * (height + 0.5);
        totalMeters += (qty * s) / 5800;
      } else {
        // Fallback: Nếu không parse được kích thước, giả định kích thước trung bình 5x5cm (s = 30.25 cm2)
        totalMeters += (qty * 30.25) / 5800;
      }
    }
  }
  return Math.round(totalMeters * 1000) / 1000; // Làm tròn 3 chữ số thập phân
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
    const converted_length = calculateConvertedLength(items);

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
        converted_length,
        cost_amount: Math.round(converted_length * 150000)
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
