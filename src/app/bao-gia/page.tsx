import type { Metadata } from 'next';
import Link from 'next/link';
import PricingCalculator from '@/components/PricingCalculator';

export const metadata: Metadata = {
  title: 'Bảng Giá & Tính Giá In UV DTF | PrinK Tech',
  description: 'Bảng giá in UV DTF chi tiết và công cụ tính giá tức thời.',
};

export default function BaoGiaPage() {
  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-200">
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-[#080d1a]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" aria-label="Về trang chủ PrinK Tech">
              <img src="/logo-horizontal.png" alt="PrinK Tech" className="h-9 object-contain" />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6 text-[13px] font-semibold">
            <Link href="/" className="hover:text-foreground transition-colors text-slate-400 hover:text-white">Trang chủ</Link>
            <Link href="/san-pham" className="hover:text-foreground transition-colors text-slate-400 hover:text-white">Sản phẩm</Link>
            <Link href="/thu-vien-anh" className="hover:text-foreground transition-colors text-slate-400 hover:text-white">Thư viện ảnh</Link>
            <Link href="/bao-gia" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-black transition-colors">Tính giá</Link>
            <Link href="/tra-cuu" className="hover:text-foreground transition-colors text-slate-400 hover:text-white">Tra cứu đơn</Link>
            <Link href="/dat-hang" className="hover:text-foreground transition-colors text-slate-400 hover:text-white">Đặt hàng</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="https://zalo.me/0822968412" target="_blank" className="hidden sm:flex items-center gap-2 text-sm font-semibold px-4 h-9 rounded-2xl border border-slate-800/60 hover:bg-white/10 transition-colors text-slate-300">
              Chat Zalo
            </Link>
            <a href="tel:0822968412" className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold px-5 h-9 rounded-2xl text-sm transition shadow-sm">
              Gọi ngay
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="mb-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span>Bảng giá & Tính giá</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Bảng giá In UV DTF</h1>
          <p className="text-slate-400 mt-2">Cập nhật 09/07/2026 • Giá đã bao gồm VAT</p>
        </div>

        <div className="mb-10">
          <div className="overflow-x-auto rounded-2xl border border-slate-800/60 bg-[#0b1329]">
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/50 text-slate-200">
                  <th className="text-left px-6 py-4 font-semibold">Sản phẩm</th>
                  <th className="text-center px-4 py-4 font-semibold w-16">ĐVT</th>
                  <th className="text-left px-6 py-4 font-semibold">Số lượng → Giá</th>
                  <th className="text-right px-6 py-4 font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                <tr className="bg-orange-500/5">
                  <td className="px-6 py-4 font-medium text-white">In cuộn mét dài (Khổ 60cm)</td>
                  <td className="px-4 py-4 text-center text-slate-400">mét</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-emerald-400">Đồng giá 145.000đ/m</span>
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-orange-500 text-white font-bold">KHUYẾN MẠI</span>
                    <div className="text-[11px] text-orange-400 mt-0.5">10/07/2026 → 31/07/2027</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">Mọi số lượng</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">In tờ A4 (20×28cm)</td>
                  <td className="px-4 py-4 text-center text-slate-400">tờ</td>
                  <td className="px-6 py-4 text-sm text-slate-300">1–4: <span className="font-semibold text-white">45.000đ</span> • 5–49: <span className="font-semibold text-white">39.000đ</span> • ≥50: <span className="font-semibold text-white">28.000đ</span></td>
                  <td className="px-6 py-4 text-xs text-slate-400">~10 tờ/mét</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">In tờ A3 (29×40cm)</td>
                  <td className="px-4 py-4 text-center text-slate-400">tờ</td>
                  <td className="px-6 py-4 text-sm text-slate-300">1–4: <span className="font-semibold text-white">80.000đ</span> • 5–49: <span className="font-semibold text-white">65.000đ</span> • ≥50: <span className="font-semibold text-white">50.000đ</span></td>
                  <td className="px-6 py-4 text-xs text-slate-400">~5 tờ/mét</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Tem nhỏ (≤3×3cm) – Cắt bế sẵn</td>
                  <td className="px-4 py-4 text-center text-slate-400">chiếc</td>
                  <td className="px-6 py-4 text-sm text-slate-300">20–49: <span className="font-semibold text-white">2.500đ</span> • 50–100: <span className="font-semibold text-white">1.600đ</span> • 200–999: <span className="font-semibold text-white">1.100đ</span> • ≥1.000: <span className="font-semibold text-white">500đ</span></td>
                  <td className="px-6 py-4 text-xs text-slate-400">MOQ 20</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Tem trung bình (4×4–5×5cm)</td>
                  <td className="px-4 py-4 text-center text-slate-400">chiếc</td>
                  <td className="px-6 py-4 text-sm text-slate-300">20–49: <span className="font-semibold text-white">4.000đ</span> • 50–199: <span className="font-semibold text-white">2.800đ</span> • 200–999: <span className="font-semibold text-white">1.900đ</span> • ≥1.000: <span className="font-semibold text-white">1.300đ</span></td>
                  <td className="px-6 py-4 text-xs text-slate-400">MOQ 20</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Tem lớn (6×6–8×8cm)</td>
                  <td className="px-4 py-4 text-center text-slate-400">chiếc</td>
                  <td className="px-6 py-4 text-sm text-slate-300">20–49: <span className="font-semibold text-white">7.000đ</span> • 50–199: <span className="font-semibold text-white">4.800đ</span> • 200–999: <span className="font-semibold text-white">3.200đ</span> • ≥1.000: <span className="font-semibold text-white">2.400đ</span></td>
                  <td className="px-6 py-4 text-xs text-slate-400">MOQ 20</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 px-1">Giá có thể thay đổi tùy chất liệu. Liên hệ Zalo 0822 968 412.</p>
        </div>

        <div id="calculator">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-white">Máy tính báo giá tức thời</h2>
            <p className="text-slate-400 text-sm mt-1">Chọn sản phẩm và số lượng để nhận báo giá chi tiết</p>
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
