import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import BaoGiaContent from '@/components/BaoGiaContent';

export const metadata: Metadata = {
  title: 'Bảng Giá In UV DTF Nổi 3D & Tính Giá Tức Thì | PrinK Tech',
  description: 'Tra cứu bảng giá in UV DTF nổi 3D chi tiết theo kích thước và số lượng. Công cụ tính giá tự động tức thì — in lẻ từ 1 tờ hoặc in sỉ số lượng lớn. Giao hàng toàn quốc.',
  keywords: ['bảng giá in uv dtf', 'giá in tem dán nổi 3d', 'tính giá in uv dtf', 'giá in tem decal', 'in uv dtf giá rẻ', 'báo giá in tem nhãn', 'prink tech giá'],
  alternates: {
    canonical: 'https://prinktech.netslive.com/bao-gia',
  },
  openGraph: {
    type: 'website',
    title: 'Bảng Giá In UV DTF Nổi 3D & Tính Giá Tức Thì | PrinK Tech',
    description: 'Tra cứu bảng giá in UV DTF nổi 3D theo kích thước và số lượng. Tính giá tự động tức thì — Giao hàng toàn quốc.',
    url: 'https://prinktech.netslive.com/bao-gia',
  },
};

export const dynamic = 'force-dynamic';

export default async function BaoGiaPage() {
  let initialPriceItems: any[] = [];
  try {
    const { data } = await supabaseAdmin
      .schema('printing')
      .from('web_price_items')
      .select('*')
      .order('sort_order', { ascending: true });
    initialPriceItems = data || [];
  } catch (err) {
    console.error('Lỗi SSR data trang bao-gia:', err);
  }

  return <BaoGiaContent initialPriceItems={initialPriceItems} />;
}
