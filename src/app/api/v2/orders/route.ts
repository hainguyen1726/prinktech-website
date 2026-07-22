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

// GET /api/v2/orders — Lấy danh sách đơn hàng chuẩn hóa v2
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel') || 'all'; // 'all', 'website', 'sale_online', 'workshop_b2b'
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search');
    const vat = searchParams.get('vat') || 'all';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('v2_orders')
      .select('*, v2_order_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Lọc theo kênh (Channel)
    // 'sale_online' = filter nội bộ → lấy tất cả đơn KHÔNG phải của xưởng
    // Xưởng in dùng prefix 'workshop_' cho tất cả channel B2B
    if (channel && channel !== 'all') {
      if (channel === 'sale_online') {
        query = query.not('channel', 'in', '("workshop_b2b","workshop_agent_l1")');
      } else {
        query = query.eq('channel', channel);
      }
    }

    // Lọc theo trạng thái
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Lọc VAT
    if (vat && vat !== 'all') {
      query = query.eq('has_vat', vat === 'yes');
    }

    // Lọc thời gian
    if (from) {
      query = query.gte('created_at', `${from}T00:00:00.000Z`);
    }
    if (to) {
      query = query.lte('created_at', `${to}T23:59:59.999Z`);
    }

    // Tìm kiếm từ khóa (Mã đơn, Tên khách, SĐT)
    if (search) {
      const s = search.trim();
      query = query.or(`order_code.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`);
    }

    const { data: rawOrders, error, count } = await query;

    if (error) {
      // Fallback nếu chưa chạy SQL Migration v2
      return NextResponse.json({ 
        error: error.message,
        hint: 'Bạn cần chạy script migration_v2_tables.sql trên Supabase trước.'
      }, { status: 500 });
    }

    // Chuẩn hóa định dạng trả về khớp 100% với kiểu Order trong Frontend
    const formattedOrders = (rawOrders || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_code,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      customer_email: o.customer_email,
      customer_note: o.customer_note,
      items: Array.isArray(o.v2_order_items) ? o.v2_order_items.map((it: any) => ({
        product_label: it.product_name,
        product_type: it.product_type,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'cái',
        unit_price: Number(it.unit_price) || 0,
        subtotal: Number(it.subtotal) || 0,
        image_url: it.preview_image_url,
        design_url: it.design_file_url,
        note: it.note
      })) : [],
      subtotal: Number(o.subtotal) || 0,
      shipping_fee: Number(o.shipping_fee) || 0,
      discount: Number(o.discount) || 0,
      total: Number(o.total_amount) || 0,
      free_shipping: Number(o.shipping_fee) === 0,
      status: o.status,
      payment_method: o.payment_method || 'cod',
      payment_status: o.payment_status || 'unpaid',
      design_url: o.design_url,
      quote_excel_url: o.quote_excel_url,
      quote_pdf_url: o.quote_pdf_url,
      shipping_carrier: o.shipping_carrier,
      tracking_number: o.tracking_number,
      source: o.channel,
      has_vat: o.has_vat,
      tags: o.tags || [],
      created_at: o.created_at,
      converted_length: Number(o.actual_meters) || 0,
      cost_amount: Number(o.cost_amount) || 0,
      packaging_fee: Number(o.packaging_fee) || 0,
    }));

    return NextResponse.json({ data: formattedOrders, total: count || 0, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/v2/orders — Tạo đơn hàng v2 mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      customer_id,
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
      payment_method,
      design_url,
      request_vat,
      vat_company_name,
      vat_tax_code,
      vat_company_address,
      vat_email,
      channel,
      quote_excel_url,
      quote_pdf_url
    } = body;

    let finalCustId = customer_id || null;
    let finalCustName = customer_name?.trim() || '';
    let finalCustPhone = customer_phone?.trim() || '';
    let finalCustAddr = customer_address?.trim() || null;
    let finalCustEmail = customer_email?.trim() || null;

    // 1. Nếu truyền customer_id, lấy thông tin từ v2_customers
    if (finalCustId) {
      const { data: custData } = await supabase
        .from('v2_customers')
        .select('*')
        .eq('id', finalCustId)
        .single();
      if (custData) {
        if (!finalCustName) finalCustName = custData.name;
        if (!finalCustPhone) finalCustPhone = custData.phone;
        if (!finalCustAddr) finalCustAddr = custData.address;
        if (!finalCustEmail) finalCustEmail = custData.email;
      }
    } else if (finalCustPhone) {
      // Tìm hoặc tạo mới theo SĐT
      const { data: existingCust } = await supabase
        .from('v2_customers')
        .select('id, name, address, email')
        .eq('phone', finalCustPhone)
        .limit(1)
        .maybeSingle();

      if (existingCust) {
        finalCustId = existingCust.id;
        if (!finalCustName) finalCustName = existingCust.name;
      } else if (finalCustName) {
        const { data: newCust } = await supabase
          .from('v2_customers')
          .insert({
            name: finalCustName,
            phone: finalCustPhone,
            address: finalCustAddr,
            email: finalCustEmail,
            customer_type: 'retail'
          })
          .select('id')
          .single();
        if (newCust) finalCustId = newCust.id;
      }
    }

    if (!finalCustName || !finalCustPhone) {
      return NextResponse.json({ error: 'Thiếu thông tin tên hoặc số điện thoại khách hàng' }, { status: 400 });
    }

    const order_code = generateOrderNumber();

    // Calculate totals & items
    let calcSubtotal = Number(subtotal) || 0;
    if (calcSubtotal === 0 && items && Array.isArray(items)) {
      calcSubtotal = items.reduce((s: number, it: any) => s + (Number(it.subtotal) || (Number(it.quantity || 1) * Number(it.unit_price || 0))), 0);
    }

    const ship = Number(shipping_fee) || 0;
    const disc = Number(discount) || 0;
    const hasVat = Boolean(request_vat);
    const vatAmt = hasVat ? Math.round(calcSubtotal * 0.08) : 0;
    const tot = total || (calcSubtotal + ship + vatAmt - disc);

    const { data: orderData, error: orderErr } = await supabase
      .from('v2_orders')
      .insert({
        order_code,
        channel: channel || 'sale_online',
        customer_id: finalCustId,
        customer_name: finalCustName,
        customer_phone: finalCustPhone,
        customer_address: finalCustAddr,
        customer_email: finalCustEmail,
        customer_note: customer_note?.trim() || null,
        subtotal: calcSubtotal,
        shipping_fee: ship,
        discount: disc,
        has_vat: hasVat,
        vat_amount: vatAmt,
        total_amount: tot,
        status: 'pending',
        payment_status: 'unpaid',
        payment_method: payment_method || 'cod',
        design_url: design_url?.trim() || null,
        quote_excel_url: quote_excel_url || null,
        quote_pdf_url: quote_pdf_url || null,
        request_vat: hasVat,
        vat_company_name,
        vat_tax_code,
        vat_company_address,
        vat_email
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // 3. Thêm chi tiết từng sản phẩm vào v2_order_items
    if (items && Array.isArray(items) && items.length > 0) {
      const orderItemsToInsert = items.map((it: any) => ({
        order_id: orderData.id,
        product_name: it.product_label || it.product_type || 'Tem UV DTF',
        product_type: it.product_type || 'tem',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'cái',
        unit_price: Number(it.unit_price) || 0,
        subtotal: Number(it.subtotal) || 0,
        preview_image_url: it.image_url || null,
        design_file_url: it.design_url || null,
        note: it.note || null
      }));

      await supabase.from('v2_order_items').insert(orderItemsToInsert);
    }

    return NextResponse.json({ data: orderData, order_code }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
