'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import PricingCalculator from '@/components/PricingCalculator';
import Header from '@/components/Header';

export default function BaoGiaContent() {
  const [activeTheme, setActiveTheme] = useState<'tech' | 'creative' | 'elegant'>('elegant');

  // Khởi tạo theme từ localStorage ở client-side
  useEffect(() => {
    const savedTheme = localStorage.getItem('prinktech-theme') || 'elegant';
    if (savedTheme === 'tech' || savedTheme === 'creative' || savedTheme === 'elegant') {
      setActiveTheme(savedTheme);
    }
  }, []);

  // Apply theme class to html/body và lưu vào localStorage
  useEffect(() => {
    localStorage.setItem('prinktech-theme', activeTheme);
    document.documentElement.classList.remove('theme-tech', 'theme-creative');
    document.body.classList.remove('theme-tech', 'theme-creative');
    if (activeTheme === 'tech') {
      document.documentElement.classList.add('theme-tech');
      document.body.classList.add('theme-tech');
    } else if (activeTheme === 'creative') {
      document.documentElement.classList.add('theme-creative');
      document.body.classList.add('theme-creative');
    }
  }, [activeTheme]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* ── Navbar ── */}
      <Header activeTheme={activeTheme} setActiveTheme={setActiveTheme} />

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-xs text-text-muted font-medium">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">Trang chủ</Link>
          <ChevronRight size={10} className="text-text-muted/65" />
          <span>Bảng giá & Tính giá</span>
        </div>

        {/* Page Title */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Bảng giá in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500">
                UV DTF 3D
              </span>
            </h1>
            <p className="text-text-muted mt-2 text-sm">
              Cập nhật ngày 09/07/2026 • Giá đã bao gồm thuế VAT
            </p>
          </div>
          <div className="flex-shrink-0">
            <a
              href="#calculator"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('calculator');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black px-6 py-3 rounded-2xl text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer focus:outline-none"
            >
              🧮 Tạo bảng tính giá chi tiết →
            </a>
          </div>
        </div>

        {/* Pricing table */}
        <div className="mb-12">
          <div className="overflow-x-auto rounded-2xl border border-card-border bg-card-bg shadow-sm">
            <table className="w-full text-sm border-collapse border border-card-border">
              <thead>
                <tr className="bg-block-bg/50 text-foreground text-left">
                  <th className="px-4 md:px-6 py-4 font-bold border border-card-border">Sản phẩm</th>
                  <th className="text-center px-3 py-4 font-bold w-20 border border-card-border">ĐVT</th>
                  <th className="px-4 md:px-6 py-4 font-bold border border-card-border">Số lượng</th>
                  <th className="px-4 md:px-6 py-4 font-bold border border-card-border text-right">Đơn giá (VNĐ)</th>
                  <th className="px-4 md:px-6 py-4 font-bold text-right border border-card-border">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40 text-foreground/90">
                {/* In tờ A4 */}
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td rowSpan={3} className="px-4 md:px-6 py-4 font-bold text-foreground border border-card-border align-middle">
                    In tờ A4 (20×28cm)
                    <span className="block text-[10px] font-normal text-text-muted mt-0.5">Khổ A4 tự dàn trang mẫu in tự do</span>
                  </td>
                  <td rowSpan={3} className="px-3 py-4 text-center text-text-muted font-semibold border border-card-border align-middle">
                    tờ
                  </td>
                  <td className="px-4 md:px-6 py-3 border border-card-border">1–4</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">45.000</td>
                  <td rowSpan={3} className="px-4 md:px-6 py-4 text-xs text-text-muted text-right font-medium border border-card-border align-middle">
                    ~10 tờ tương đương 1 mét dài
                  </td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">5–49</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">39.000</td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">≥ 50</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">28.000</td>
                </tr>

                {/* In tờ A3 */}
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td rowSpan={3} className="px-4 md:px-6 py-4 font-bold text-foreground border border-card-border align-middle">
                    In tờ A3 (29×40cm)
                    <span className="block text-[10px] font-normal text-text-muted mt-0.5">Khổ A3 lớn gấp đôi khổ A4</span>
                  </td>
                  <td rowSpan={3} className="px-3 py-4 text-center text-text-muted font-semibold border border-card-border align-middle">
                    tờ
                  </td>
                  <td className="px-4 md:px-6 py-3 border border-card-border">1–4</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">80.000</td>
                  <td rowSpan={3} className="px-4 md:px-6 py-4 text-xs text-text-muted text-right font-medium border border-card-border align-middle">
                    ~5 tờ tương đương 1 mét dài
                  </td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">5–49</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">65.000</td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">≥ 50</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">50.000</td>
                </tr>

                {/* Tem nhỏ */}
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td rowSpan={4} className="px-4 md:px-6 py-4 font-bold text-foreground border border-card-border align-middle">
                    Tem nhỏ (&lt; 3×3cm) – Cắt bế sẵn
                    <span className="block text-[10px] font-normal text-text-muted mt-0.5">Tem dán nắp chai, nhãn phụ logo nhỏ</span>
                  </td>
                  <td rowSpan={4} className="px-3 py-4 text-center text-text-muted font-semibold border border-card-border align-middle">
                    chiếc
                  </td>
                  <td className="px-4 md:px-6 py-3 border border-card-border">20–49</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">2.500</td>
                  <td rowSpan={4} className="px-4 md:px-6 py-4 text-xs text-text-muted text-right font-medium border border-card-border align-middle">
                    MOQ tối thiểu 20 chiếc
                  </td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">50–100</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">1.600</td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">200–999</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">1.100</td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">≥ 1.000</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">500</td>
                </tr>

                {/* Tem trung bình */}
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td rowSpan={4} className="px-4 md:px-6 py-4 font-bold text-foreground border border-card-border align-middle">
                    Tem trung bình (4×4–5×5cm) – Cắt bế sẵn
                    <span className="block text-[10px] font-normal text-text-muted mt-0.5">Vừa dán cốc giữ nhiệt, chai lọ thủy tinh</span>
                  </td>
                  <td rowSpan={4} className="px-3 py-4 text-center text-text-muted font-semibold border border-card-border align-middle">
                    chiếc
                  </td>
                  <td className="px-4 md:px-6 py-3 border border-card-border">20–49</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">4.000</td>
                  <td rowSpan={4} className="px-4 md:px-6 py-4 text-xs text-text-muted text-right font-medium border border-card-border align-middle">
                    MOQ tối thiểu 20 chiếc
                  </td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">50–199</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">2.800</td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">200–999</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">1.900</td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">≥ 1.000</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">1.300</td>
                </tr>

                {/* Tem lớn */}
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td rowSpan={4} className="px-4 md:px-6 py-4 font-bold text-foreground border border-card-border align-middle">
                    Tem lớn (6×6–8×8cm) – Cắt bế sẵn
                    <span className="block text-[10px] font-normal text-text-muted mt-0.5">Phù hợp dán nón bảo hiểm, xe máy, laptop</span>
                  </td>
                  <td rowSpan={4} className="px-3 py-4 text-center text-text-muted font-semibold border border-card-border align-middle">
                    chiếc
                  </td>
                  <td className="px-4 md:px-6 py-3 border border-card-border">20–49</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">7.000</td>
                  <td rowSpan={4} className="px-4 md:px-6 py-4 text-xs text-text-muted text-right font-medium border border-card-border align-middle">
                    MOQ tối thiểu 20 chiếc
                  </td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">50–199</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">4.800</td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">200–999</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">3.200</td>
                </tr>
                <tr className="hover:bg-block-bg/20 transition-colors">
                  <td className="px-4 md:px-6 py-3 border border-card-border">≥ 1.000</td>
                  <td className="px-4 md:px-6 py-3 font-semibold text-foreground border border-card-border tabular-nums text-right">2.400</td>
                </tr>

                {/* In theo mét dài */}
                <tr className="bg-[var(--accent-glow)]/40 hover:bg-[var(--accent-glow)]/60 transition-colors">
                  <td className="px-4 md:px-6 py-4 font-bold text-foreground border border-card-border align-middle">
                    In theo mét dài (Khổ 60cm)
                    <span className="block text-[10px] font-normal text-text-muted mt-0.5">Film cuộn in tràn khổ bế mẫu tự do</span>
                  </td>
                  <td className="px-3 py-4 text-center text-text-muted font-semibold border border-card-border align-middle">
                    mét
                  </td>
                  <td className="px-4 md:px-6 py-4 border border-card-border align-middle">Mọi số lượng</td>
                  <td className="px-4 md:px-6 py-4 font-black text-[var(--accent)] border border-card-border align-middle tabular-nums text-right">145.000</td>
                  <td className="px-4 md:px-6 py-4 text-xs text-amber-600 dark:text-amber-400 text-right font-bold border border-card-border align-middle">
                    Khuyến mại từ 10/07/2026 đến 31/07/2027
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-text-muted mt-3 px-1">
            * Đơn giá chưa gồm phí gia công đặc biệt (phủ nhũ vàng/bạc, in hologram, film dạ quang). Liên hệ Hotline / Zalo: 0822.968.412 để nhận báo giá chi tiết.
          </p>
        </div>

        {/* Calculator section */}
        <div id="calculator" className="border-t border-card-border pt-10">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Máy tính báo giá tức thời
            </h2>
            <p className="text-text-muted text-sm mt-1">
              Chọn quy cách in, nhập số lượng mong muốn và nhận báo giá hoặc xuất PDF ngay lập tức
            </p>
          </div>
          
          <div className="p-1 rounded-3xl border border-card-border bg-block-bg/15">
            <PricingCalculator />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border py-8 text-center text-xs text-text-muted bg-block-bg/20">
        © {new Date().getFullYear()} PrinK Tech – GMKT Việt Nam •{' '}
        <a href="https://prinktech.netslive.com" className="hover:text-[var(--accent)] font-semibold transition-colors">
          prinktech.netslive.com
        </a>
      </footer>
    </div>
  );
}
