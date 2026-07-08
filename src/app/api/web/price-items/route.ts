import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// GET /api/web/price-items - Lấy bảng giá in
export async function GET() {
  try {
    const { data: priceItems, error } = await supabaseAdmin
      .from('web_price_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ priceItems });
  } catch (error: any) {
    console.error('[API Web Price Items GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/web/price-items - Lưu/Cập nhật bảng giá (Admin)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { priceItems } = body; // Mảng các price items cần cập nhật hoặc thêm mới

    if (!Array.isArray(priceItems)) {
      return NextResponse.json({ error: 'Dữ liệu không đúng định dạng mảng' }, { status: 400 });
    }

    // Thực hiện lưu từng phần tử (upsert)
    for (const item of priceItems) {
      const { id, material_name, unit, price_sheet, sort_order } = item;
      
      const dataToSave: any = {
        material_name,
        unit,
        price_sheet: typeof price_sheet === 'string' ? JSON.parse(price_sheet) : price_sheet,
        sort_order: Number(sort_order) || 0,
        updated_at: new Date().toISOString()
      };

      if (id && id.length > 10) {
        // Cập nhật
        const { error } = await supabaseAdmin
          .from('web_price_items')
          .update(dataToSave)
          .eq('id', id);
        if (error) throw error;
      } else {
        // Thêm mới
        const { error } = await supabaseAdmin
          .from('web_price_items')
          .insert(dataToSave);
        if (error) throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Web Price Items POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// DELETE /api/web/price-items - Xóa theo danh sách ID hoặc xóa toàn bộ
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { ids, deleteAll } = body;

    if (deleteAll === true) {
      // Xóa toàn bộ bảng giá
      const { error } = await supabaseAdmin
        .from('web_price_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // xóa all
      if (error) throw error;
      return NextResponse.json({ success: true, deleted: 'all' });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      // Xóa theo danh sách ID
      const { error } = await supabaseAdmin
        .from('web_price_items')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    return NextResponse.json({ error: 'Cần truyền ids[] hoặc deleteAll: true' }, { status: 400 });
  } catch (error: any) {
    console.error('[API Web Price Items DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
