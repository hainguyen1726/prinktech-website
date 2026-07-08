import type { Metadata } from 'next';
import PricingCalculator from '@/components/PricingCalculator';

export const metadata: Metadata = {
  title: 'Tính Giá In UV DTF 3D | PrinK Tech',
  description:
    'Công cụ tính giá in UV DTF 3D nổi tức thời của PrinK Tech. Chọn loại sản phẩm, nhập số lượng và nhận báo giá chi tiết ngay lập tức. Xuất PDF báo giá chuyên nghiệp.',
};

export default function BaoGiaPage() {
  return <PricingCalculator />;
}
