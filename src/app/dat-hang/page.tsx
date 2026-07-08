import type { Metadata } from 'next';
import { Suspense } from 'react';
import OrderForm from '@/components/OrderForm';

export const metadata: Metadata = {
  title: 'Đặt hàng in UV DTF | PrinK Tech',
  description: 'Đặt hàng in UV DTF 3D nổi tại PrinK Tech. Điền thông tin, chọn sản phẩm và gửi đơn hàng. Xưởng sẽ xác nhận và sản xuất trong 24h.',
};

export default function DatHangPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center">
          <span className="inline-block w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-slate-400 mt-2 text-sm">Đang tải biểu mẫu đặt hàng...</p>
        </div>
      </div>
    }>
      <OrderForm />
    </Suspense>
  );
}
