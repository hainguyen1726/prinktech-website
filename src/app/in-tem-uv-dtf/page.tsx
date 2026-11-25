import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import LandingUvDtfContent from '@/components/LandingUvDtfContent';

const BASE_URL = 'https://prinktech.netslive.com';

export const metadata: Metadata = {
  title: 'In Tem UV DTF Nổi 3D Theo Yêu Cầu — Từ 1 Tờ A4, Bền Chống Nước | PrinK Tech',
  description:
    'Xưởng in tem UV DTF nổi 3D PrinK Tech: siêu bền chống nước, bám chắc trên ly cốc, bình giữ nhiệt, mũ bảo hiểm, bao bì. Nhận in số lượng ít từ 1 tờ A4 (45.000đ) hoặc 20 tem. Giao toàn quốc.',
  alternates: {
    canonical: `${BASE_URL}/in-tem-uv-dtf`,
  },
  openGraph: {
    type: 'website',
    title: 'In Tem UV DTF Nổi 3D Theo Yêu Cầu — Giá Tận Xưởng | PrinK Tech',
    description:
      'In tem logo thương hiệu, tem tên cho bé, sticker UV DTF chống nước 100%. Tính giá & đặt in ngay trong 30 giây.',
    url: `${BASE_URL}/in-tem-uv-dtf`,
  },
};

export const revalidate = 1800;

export default async function InTemUvDtfLandingPage() {
  let priceItems: any[] = [];
  let videos: any[] = [];

  try {
    const [priceRes, videoRes] = await Promise.all([
      supabaseAdmin
        .schema('printing')
        .from('web_price_items')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .schema('printing')
        .from('web_videos')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true }),
    ]);

    priceItems = priceRes.data || [];
    videos = videoRes.data || [];
  } catch (err) {
    console.error('Lỗi tải dữ liệu trang landing /in-tem-uv-dtf:', err);
  }

  return <LandingUvDtfContent priceItems={priceItems} videos={videos} />;
}
