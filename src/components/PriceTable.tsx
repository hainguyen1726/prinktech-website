'use client';

import { PRODUCTS } from '@/lib/pricing';
import { formatCurrency } from '@/lib/pricing';

export default function PriceTable() {
  return (
    <div className="mb-10">
      <div className="overflow-x-auto rounded-2xl border border-card-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border bg-muted/50">
              <th className="text-left px-6 py-4 font-semibold">Sản phẩm</th>
              <th className="text-center px-4 py-4 font-semibold w-16">ĐVT</th>
              <th className="text-left px-6 py-4 font-semibold">Số lượng → Giá</th>
              <th className="text-right px-6 py-4 font-semibold">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border text-sm">
            {/* In cuộn 60cm - Khuyến mại */}
            <tr className="bg-orange-500/5">
              <td className="px-6 py-4 font-medium">In cuộn mét dài (Khổ 60cm)</td>
              <td className="px-4 py-4 text-center text-muted-foreground">mét</td>
              <td className="px-6 py-4">
                <span className="font-semibold text-emerald-600">Đồng giá 145.000đ/m</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-orange-500 text-white font-bold">KHUYẾN MẠI</span>
                <div className="text-[11px] text-orange-600 mt-0.5">10/07/2026 → 31/07/2027</div>
              </td>
              <td className="px-6 py-4 text-xs text-muted-foreground">Mọi số lượng</td>
            </tr>

            {/* A4 */}
            <tr>
              <td className="px-6 py-4 font-medium">In tờ A4 (20×28cm)</td>
              <td className="px-4 py-4 text-center text-muted-foreground">tờ</td>
              <td className="px-6 py-4 text-sm">
                1–4 tờ: <span className="font-semibold">45.000đ</span> &nbsp;•&nbsp; 
                5–49 tờ: <span className="font-semibold">39.000đ</span> &nbsp;•&nbsp; 
                ≥50 tờ: <span className="font-semibold">28.000đ</span>
              </td>
              <td className="px-6 py-4 text-xs text-muted-foreground">~10 tờ/mét</td>
            </tr>

            {/* A3 */}
            <tr>
              <td className="px-6 py-4 font-medium">In tờ A3 (29×40cm)</td>
              <td className="px-4 py-4 text-center text-muted-foreground">tờ</td>
              <td className="px-6 py-4 text-sm">
                1–4 tờ: <span className="font-semibold">80.000đ</span> &nbsp;•&nbsp; 
                5–49 tờ: <span className="font-semibold">65.000đ</span> &nbsp;•&nbsp; 
                ≥50 tờ: <span className="font-semibold">50.000đ</span>
              </td>
              <td className="px-6 py-4 text-xs text-muted-foreground">~5 tờ/mét</td>
            </tr>

            {/* Tem nhỏ */}
            <tr>
              <td className="px-6 py-4 font-medium">Tem nhỏ (≤3×3cm) – Cắt bế sẵn</td>
              <td className="px-4 py-4 text-center text-muted-foreground">chiếc</td>
              <td className="px-6 py-4 text-sm">
                20–49: <span className="font-semibold">2.500đ</span> &nbsp;•&nbsp; 
                50–100: <span className="font-semibold">1.600đ</span> &nbsp;•&nbsp; 
                200–999: <span className="font-semibold">1.100đ</span> &nbsp;•&nbsp; 
                ≥1.000: <span className="font-semibold">500đ</span>
              </td>
              <td className="px-6 py-4 text-xs text-muted-foreground">MOQ 20 chiếc</td>
            </tr>

            {/* Tem trung bình */}
            <tr>
              <td className="px-6 py-4 font-medium">Tem trung bình (4×4–5×5cm)</td>
              <td className="px-4 py-4 text-center text-muted-foreground">chiếc</td>
              <td className="px-6 py-4 text-sm">
                20–49: <span className="font-semibold">4.000đ</span> &nbsp;•&nbsp; 
                50–199: <span className="font-semibold">2.800đ</span> &nbsp;•&nbsp; 
                200–999: <span className="font-semibold">1.900đ</span> &nbsp;•&nbsp; 
                ≥1.000: <span className="font-semibold">1.300đ</span>
              </td>
              <td className="px-6 py-4 text-xs text-muted-foreground">MOQ 20 chiếc</td>
            </tr>

            {/* Tem lớn */}
            <tr>
              <td className="px-6 py-4 font-medium">Tem lớn (6×6–8×8cm)</td>
              <td className="px-4 py-4 text-center text-muted-foreground">chiếc</td>
              <td className="px-6 py-4 text-sm">
                20–49: <span className="font-semibold">7.000đ</span> &nbsp;•&nbsp; 
                50–199: <span className="font-semibold">4.800đ</span> &nbsp;•&nbsp; 
                200–999: <span className="font-semibold">3.200đ</span> &nbsp;•&nbsp; 
                ≥1.000: <span className="font-semibold">2.400đ</span>
              </td>
              <td className="px-6 py-4 text-xs text-muted-foreground">MOQ 20 chiếc</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 px-1">
        Giá có thể thay đổi tùy chất liệu và độ phức tạp file. Liên hệ Zalo <span className="font-medium">0822 968 412</span>.
      </p>
    </div>
  );
}
