import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminOrStaff } from '@/lib/adminAuth';
import { logActivity } from '@/lib/activityLogger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(
  supabaseUrl || 'https://placeholder-supabase-url.supabase.co',
  supabaseServiceKey || 'placeholder-service-role-key',
  { db: { schema: 'printing' } }
);

// GET /api/orders/[id] — Lấy thông tin đơn hàng
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from('orders')
    .select('*, partners(id, name, phone, address, email)')
    .eq('id', id)
    .single();

  if (error) {
    const { data: rData, error: rErr } = await supabase
      .from('retail_orders')
      .select('*')
      .eq('id', id)
      .single();
    if (rErr) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    return NextResponse.json({ data: rData });
  }

  return NextResponse.json({ data });
}

function mapRetailToLegacyStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'pending_file';
    case 'confirmed':
      return 'pending_print';
    case 'printing':
      return 'printing';
    case 'shipped':
      return 'delivering';
    case 'delivered':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return status;
  }
}

// PATCH /api/orders/[id] — Cập nhật toàn bộ thông tin đơn hàng đã tạo
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminOrStaff(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      status,
      payment_status,
      shipping_carrier,
      tracking_number,
      cost_amount,
      customer_name,
      customer_phone,
      customer_address,
      customer_email,
      customer_note,
      items,
      design_files,
      shipping_fee,
      discount,
      has_vat
    } = body;

    // 1. Tìm đơn hàng hiện tại
    const { data: isRetail } = await supabase
      .from('retail_orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    let oldOrder: any = isRetail;
    if (!isRetail) {
      const { data: adminOrder } = await supabase
        .from('orders')
        .select('*, partners(*)')
        .eq('id', id)
        .maybeSingle();
      oldOrder = adminOrder;
    }

    if (!oldOrder) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    const changes: Record<string, { from: any; to: any }> = {};

    // 2. Cập nhật thông tin đối tác/khách hàng nếu có
    if (oldOrder.partner_id && (customer_name || customer_phone || customer_address || customer_email !== undefined)) {
      const partnerUpdates: Record<string, any> = {};
      if (customer_name && customer_name.trim()) partnerUpdates.name = customer_name.trim();
      if (customer_phone && customer_phone.trim()) partnerUpdates.phone = customer_phone.trim();
      if (customer_address && customer_address.trim()) partnerUpdates.address = customer_address.trim();
      if (customer_email !== undefined) partnerUpdates.email = customer_email ? customer_email.trim() : null;

      if (Object.keys(partnerUpdates).length > 0) {
        await supabase.from('partners').update(partnerUpdates).eq('id', oldOrder.partner_id);
      }
    }

    // 3. Chuẩn hóa danh sách sản phẩm (Items Contract)
    let formattedItems: any[] | null = null;
    let newStickerType = oldOrder.sticker_type || 'dtf_sheet';

    if (Array.isArray(items)) {
      formattedItems = items.map((it: any) => {
        const q = Number(it.quantity) || 1;
        const price = Number(it.unit_price) > 0 ? Number(it.unit_price) : (Number(it.rate_excl_vat) > 0 ? Number(it.rate_excl_vat) : 0);
        const sub = Number(it.subtotal) > 0 ? Number(it.subtotal) : Math.round(q * price);
        const type = it.product_type || 'sticker_piece';

        if (type === 'sticker_piece') {
          newStickerType = 'sticker_piece';
        } else if (type === 'cuon' || type === 'dtf_roll') {
          newStickerType = 'dtf_roll';
        }

        return {
          product_type: type,
          product_label: it.product_label || it.name || 'Tem UV DTF',
          quantity: q,
          unit: it.unit || (type === 'sticker_piece' ? 'chiếc' : (type === 'cuon' ? 'mét' : 'cái')),
          unit_price: price,
          subtotal: sub,
          width_cm: it.width_cm ? Number(it.width_cm) : undefined,
          height_cm: it.height_cm ? Number(it.height_cm) : undefined,
          sku: it.sku || undefined,
          design_url: it.design_url || it.url || null,
          note: it.note || null
        };
      });
    }

    // 4. Chuẩn hóa kho file thiết kế (Design Files Contract)
    let formattedDesignFiles: any[] | null = null;
    if (Array.isArray(design_files)) {
      formattedDesignFiles = design_files.map((df: any, idx: number) => ({
        id: df.id || `df-${Date.now()}-${idx}`,
        sku_label: df.sku_label || df.name || 'File thiết kế',
        file_url: df.file_url || df.url || '',
        file_name: df.file_name || df.name || 'file.pdf',
        file_type: df.file_type || (df.file_url?.toLowerCase().includes('.ai') ? 'ai' : 'pdf'),
        version: df.version || 'v1',
        note: df.note || null,
        uploaded_at: df.uploaded_at || new Date().toISOString(),
        is_latest: df.is_latest !== undefined ? Boolean(df.is_latest) : (idx === 0)
      }));
    }

    // 5. Tính toán lại Tổng tiền & Giá vốn
    let newSubtotal = oldOrder.total_amount || oldOrder.subtotal || 0;
    if (formattedItems) {
      newSubtotal = formattedItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    }

    const newShippingCost = shipping_fee !== undefined ? Number(shipping_fee) || 0 : (oldOrder.shipping_cost ?? oldOrder.shipping_fee ?? 35000);
    const newDiscount = discount !== undefined ? Number(discount) || 0 : (oldOrder.discount_amount ?? oldOrder.discount ?? 0);
    const newTotalAmount = newSubtotal + newShippingCost - newDiscount;

    let newCostAmount = cost_amount !== undefined ? Number(cost_amount) : oldOrder.cost_amount;
    if (newCostAmount === undefined || newCostAmount <= 0 || newCostAmount > newSubtotal * 1.5) {
      newCostAmount = newStickerType === 'dtf_roll'
        ? Math.round((Number(oldOrder.quantity_actual) || 1) * 80000)
        : Math.round(newSubtotal * 0.35);
    }

    // 6. Xây dựng lại ghi chú hợp lệ
    const updatedNote = customer_note !== undefined ? (customer_note || '') : (oldOrder.customer_note || oldOrder.note || '');

    // Bảo lưu thông tin link Excel/PDF cũ nếu có
    const excelMatch = oldOrder.note?.match(/- Excel Báo giá:\s*(https?:\/\/[^\s\n]+)/);
    const pdfMatch = oldOrder.note?.match(/- PDF Báo giá:\s*(https?:\/\/[^\s\n]+)/);
    const excelUrl = excelMatch ? excelMatch[1] : null;
    const pdfUrl = pdfMatch ? pdfMatch[1] : null;

    // Loại bỏ các dòng cũ để ghi đè sạch sẽ
    const cleanNoteLines = updatedNote
      .split('\n')
      .filter((line: string) =>
        !line.trim().startsWith('- Excel Báo giá:') &&
        !line.trim().startsWith('- PDF Báo giá:') &&
        !line.trim().startsWith('- Dữ liệu sản phẩm JSON:') &&
        !line.trim().startsWith('- Đơn vị vận chuyển:') &&
        !line.trim().startsWith('- Mã vận đơn:')
      );

    if (excelUrl) cleanNoteLines.push(`- Excel Báo giá: ${excelUrl}`);
    if (pdfUrl) cleanNoteLines.push(`- PDF Báo giá: ${pdfUrl}`);

    if (formattedItems) {
      cleanNoteLines.push(`- Dữ liệu sản phẩm JSON: ${JSON.stringify(formattedItems)}`);
    } else {
      const existingJsonMatch = oldOrder.note?.match(/- Dữ liệu sản phẩm JSON:\s*([^\n\r]+)/);
      if (existingJsonMatch) cleanNoteLines.push(`- Dữ liệu sản phẩm JSON: ${existingJsonMatch[1]}`);
    }

    const carrierStr = shipping_carrier !== undefined ? (shipping_carrier || '') : (oldOrder.shipping_carrier || '');
    const trackingStr = tracking_number !== undefined ? (tracking_number || '') : (oldOrder.tracking_number || '');

    if (carrierStr) cleanNoteLines.push(`- Đơn vị vận chuyển: ${carrierStr}`);
    if (trackingStr) cleanNoteLines.push(`- Mã vận đơn: ${trackingStr}`);

    const finalNote = cleanNoteLines.join('\n').trim();

    // 7. Chuẩn hóa Tags (VAT 8%)
    let tags = Array.isArray(oldOrder.tags) ? [...oldOrder.tags] : ['Tem UV DTF', 'Prinktech'];
    if (has_vat !== undefined) {
      if (has_vat && !tags.includes('VAT 8%')) {
        tags.push('VAT 8%');
      } else if (!has_vat && tags.includes('VAT 8%')) {
        tags = tags.filter(t => t !== 'VAT 8%');
      }
    }

    let updateRes;
    if (isRetail) {
      const updates: Record<string, any> = {
        subtotal: newSubtotal,
        shipping_fee: newShippingCost,
        discount: newDiscount,
        total: newTotalAmount,
        cost_amount: newCostAmount,
        note: finalNote,
        updated_at: new Date().toISOString()
      };
      if (status) updates.status = status;
      if (payment_status) updates.payment_status = payment_status;
      if (shipping_carrier !== undefined) updates.shipping_carrier = shipping_carrier;
      if (tracking_number !== undefined) updates.tracking_number = tracking_number;

      updateRes = await supabase.from('retail_orders').update(updates).eq('id', id).select().single();
    } else {
      const updates: Record<string, any> = {
        shipping_cost: newShippingCost,
        discount_amount: newDiscount,
        cost_amount: newCostAmount,
        note: finalNote,
        tags: tags,
        updated_at: new Date().toISOString()
      };
      if (status) updates.status = mapRetailToLegacyStatus(status);
      if (payment_status) updates.payment_status = payment_status;
      if (formattedDesignFiles) updates.design_files = formattedDesignFiles;

      updateRes = await supabase.from('orders').update(updates).eq('id', id).select('*, partners(*)').single();
    }

    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    // 8. Ghi log hoạt động
    await logActivity({
      userId: auth.user?.id || 'admin',
      userName: auth.user?.name || 'Website Admin',
      action: 'edit_order',
      targetType: isRetail ? 'customer_order' : 'order',
      targetId: id,
      description: `Sửa thông tin chi tiết đơn hàng ${oldOrder.order_code || oldOrder.order_number || id}`,
      details: {
        total_amount: { old: oldOrder.total_amount || oldOrder.total, new: newTotalAmount },
        cost_amount: { old: oldOrder.cost_amount, new: newCostAmount }
      }
    });

    return NextResponse.json({ success: true, data: updateRes.data });
  } catch (err: any) {
    console.error('Lỗi khi sửa đơn hàng:', err);
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống khi sửa đơn' }, { status: 500 });
  }
}

// DELETE /api/orders/[id] — Xóa đơn hàng
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminOrStaff(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const { id } = await params;

  const { data: retailOrder } = await supabase
    .from('retail_orders')
    .select('order_number')
    .eq('id', id)
    .maybeSingle();

  if (retailOrder) {
    const { error } = await supabase.from('retail_orders').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      userId: auth.user?.id || 'admin',
      userName: auth.user?.name || 'Website Admin',
      action: 'delete_order',
      targetType: 'customer_order',
      targetId: id,
      description: `Xóa đơn hàng bán lẻ mã ${retailOrder.order_number} khỏi hệ thống.`
    });

    return NextResponse.json({ success: true });
  }

  const { data: partnerOrder } = await supabase
    .from('orders')
    .select('order_code')
    .eq('id', id)
    .maybeSingle();

  if (partnerOrder) {
    await supabase.from('order_logs').delete().eq('order_id', id);
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      userId: auth.user?.id || 'admin',
      userName: auth.user?.name || 'Website Admin',
      action: 'delete_order',
      targetType: 'partner_order',
      targetId: id,
      description: `Xóa đơn hàng đối tác mã ${partnerOrder.order_code} khỏi hệ thống.`
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Không tìm thấy đơn hàng để xóa' }, { status: 404 });
}
