import type { Metadata } from 'next';
import PriceTable from '@/components/PriceTable';
import PricingCalculator from '@/components/PricingCalculator';

export const metadata: Metadata = {
  title: 'Bảng Giá & Tính Giá In UV DTF 3D | PrinK Tech',
  description:
    'Bảng giá in UV DTF 3D chi tiết + công cụ tính giá nổi tức thời của PrinK Tech. Cập nhật 09/07/2026.',
};

export default function BaoGiaPage() {
  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-200">
      <header className="border-b border-slate-800/60 bg-[#080d1a]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <a href="/" aria-label="Về trang chủ PrinK Tech">
            <img src="/logo-horizontal.png" alt="PrinK Tech" className="h-9 object-contain" />
          </a>
          <a href="/" className="text-xs text-slate-400 hover:text-sky-400 transition-colors">← Trang chủ</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <nav className="mb-8 text-xs text-slate-500 flex items-center gap-2">
          <a href="/" className="hover:text-sky-400 transition-colors">Trang chủ</a>
          <span>/</span>
          <span className="text-slate-300">Bảng giá & Tính giá</span>
        </nav>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
            Bảng Giá & Tính Giá In UV DTF
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Xem bảng giá chi tiết hoặc sử dụng máy tính báo giá để nhận báo giá tức thì.
          </p>
        </div>

        <PriceTable />

        <div className="pt-8 border-t border-slate-800">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              Máy Tính Báo Giá Tức Thời
            </h2>
            <p className="text-slate-400 text-sm">
              Chọn sản phẩm, nhập số lượng → Nhận báo giá chi tiết ngay lập tức
            </p>
          </div>
          <PricingCalculator />
        </div>
      </main>

      <footer className="border-t border-slate-800/60 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} PrinK Tech – GMKT Việt Nam • <a href="https://prinktech.netslive.com" className="hover:text-sky-400 transition-colors">prinktech.netslive.com</a>
      </footer>
    </div>
  );
}
