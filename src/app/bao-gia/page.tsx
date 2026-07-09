import type { Metadata } from 'next';
import Link from 'next/link';
import PricingCalculator from '@/components/PricingCalculator';

export const metadata: Metadata = {
  title: 'Tính Giá In UV DTF | PrinK Tech',
  description: 'Công cụ tính giá in UV DTF 3D nổi tức thời của PrinK Tech.',
};

export default function BaoGiaPage() {
  return <PricingCalculator />;
}
