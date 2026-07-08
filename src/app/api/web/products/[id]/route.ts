import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/web/products/[id] - Cập nhật sản phẩm (Admin)
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, slug, description, price, image_url, category, is_featured } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Tên và đường dẫn (slug) sản phẩm là bắt buộc' }, { status: 400 });
    }

    const { data: product, error } = await supabaseAdmin
      .from('web_products')
      .update({
        name,
        slug,
        description,
        price: Number(price) || 0,
        image_url,
        category: category || 'standard',
        is_featured: !!is_featured,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Đường dẫn (slug) này đã tồn tại' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('[API Web Product PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// DELETE /api/web/products/[id] - Xóa sản phẩm (Admin)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await context.params;

    const { error } = await supabaseAdmin
      .from('web_products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Web Product DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
