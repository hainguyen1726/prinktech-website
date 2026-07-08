import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminOrStaff } from '@/lib/adminAuth';

// GET /api/web/products - Lấy danh sách sản phẩm
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const featured = searchParams.get('featured') === 'true';

    let query = supabaseAdmin
      .from('web_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }
    if (featured) {
      query = query.eq('is_featured', true);
    }

    const { data: products, error } = await query;
    if (error) throw error;

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('[API Web Products GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/web/products - Tạo sản phẩm mới (Admin)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrStaff(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { name, slug, description, price, image_url, category, is_featured } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Tên và đường dẫn (slug) sản phẩm là bắt buộc' }, { status: 400 });
    }

    const { data: product, error } = await supabaseAdmin
      .from('web_products')
      .insert({
        name,
        slug,
        description,
        price: Number(price) || 0,
        image_url,
        category: category || 'standard',
        is_featured: !!is_featured,
        updated_at: new Date().toISOString()
      })
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
    console.error('[API Web Products POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
