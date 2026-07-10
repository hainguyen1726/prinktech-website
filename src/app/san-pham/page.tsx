import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ProductListContent from '@/components/ProductListContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Danh Sách Sản Phẩm | In UV DTF PrinK Tech',
  description: 'Khám phá các sản phẩm tem in UV DTF nổi 3D cao cấp, tem dán cốc thủy tinh, bình giữ nhiệt và tem in sỉ theo cuộn từ xưởng PrinK Tech.',
  alternates: {
    canonical: 'https://prinktech.netslive.com/san-pham',
  },
};

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  is_featured: boolean;
  created_at: string;
}

export default async function SanPhamPage() {
  let products: Product[] = [];
  
  try {
    const { data } = await supabaseAdmin
      .from('web_products')
      .select('*')
      .order('created_at', { ascending: false });
      
    products = data || [];
  } catch (err) {
    console.error('Lỗi tải sản phẩm từ database:', err);
  }

  return <ProductListContent products={products} />;
}
