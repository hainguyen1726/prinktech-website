import type { Metadata } from 'next';
import BaoGiaContent from '@/components/BaoGiaContent';

export const metadata: Metadata = {
  title: 'Bảng Giá & Tính Giá In UV DTF | PrinK Tech',
  description: 'Bảng giá in UV DTF chi tiết và công cụ tính giá tức thời.',
  alternates: {
    canonical: 'https://prinktech.netslive.com/bao-gia',
  },
};

export default function BaoGiaPage() {
  return <BaoGiaContent />;
}
