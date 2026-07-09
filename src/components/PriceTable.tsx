'use client';

import { PRODUCTS } from '@/lib/pricing';
import { formatCurrency } from '@/lib/pricing';

export default function PriceTable() {
  return (
    <div className="mb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            Bảng Giá In UV DTF
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Cập nhật <span className="font-medium text-slate-300">09/07/2026</span> • Giá đã bao gồm VAT
          </p>
        </div>
        <a href="#calculator" className="text-sm text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1">
          Tính giá nhanh ↓
        </a>
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70">
              <th className="text-left px-8 py-5 font-bold text-slate-200">Sản phẩm</th>
              <th className="text-center px-4 py-5 font-bold text-slate-200 w-20">ĐVT</th>
              <th className="text-left px-6 py-5 font-bold text-slate-200">Số lượng</th>
              <th className="text-right px-8 py-5 font-bold text-slate-200">Đơn giá</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {PRODUCTS.map((product, index) => {
              const isPromotion = !!product.promotion;
              return (
                <tr key={index} className={`hover:bg-slate-800/60 transition-colors group ${isPromotion ? 'bg-orange-500/5' : ''}`}>
                  <td className="px-8 py-6 align-top">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl mt-0.5 opacity-90 group-hover:scale-110 transition-transform">{product.icon}</span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-3 text-[15px]">
                          {product.label}
                          {isPromotion && <span className="inline-block text-[10px] font-black tracking-wider px-3 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white">KHUYẾN MẠI</span>}
                        </div>
                        {isPromotion && product.promotion && (
                          <div className="mt-2 text-xs bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3 py-1.5 rounded-xl max-w-[420px]">
                            {product.promotion.message}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-1.5 pr-4">{product.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-center text-slate-400 font-medium align-top">{product.unitLabel}</td>
                  <td className="px-6 py-6 align-top">
                    <div className="space-y-[7px] text-sm">
                      {product.tiers.map((tier, i) => {
                        const qtyLabel = tier.max ? `${tier.min} – ${tier.max}` : tier.min === 0 ? 'Mọi số lượng' : `≥ ${tier.min}`;
                        return (
                          <div key={i} className="flex justify-between items-center text-slate-300">
                            <span className="text-slate-400 pr-4">{qtyLabel}</span>
                            <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                              {tier.price > 0 ? formatCurrency(tier.price) : 'Liên hệ'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-400 align-top max-w-[260px]">{product.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards (< md) */}
      <div className="md:hidden space-y-4">
        {PRODUCTS.map((product, index) => {
          const isPromotion = !!product.promotion;
          return (
            <div key={index} className={`rounded-3xl border p-5 ${isPromotion ? 'border-orange-500/40 bg-orange-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
              <div className="flex items-start gap-4 mb-4">
                <span className="text-3xl mt-0.5">{product.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white flex items-center gap-2 text-[15px]">
                    {product.label}
                    {isPromotion && <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white">KHUYẾN MẠI</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{product.description}</div>
                </div>
              </div>

              {isPromotion && product.promotion && (
                <div className="mb-4 text-xs bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3 py-2 rounded-2xl">
                  {product.promotion.message}
                </div>
              )}

              <div className="space-y-2 text-sm">
                {product.tiers.map((tier, i) => {
                  const qtyLabel = tier.max ? `${tier.min} – ${tier.max}` : tier.min === 0 ? 'Mọi số lượng' : `≥ ${tier.min}`;
                  return (
                    <div key={i} className="flex justify-between items-center bg-slate-950/60 px-4 py-2.5 rounded-2xl">
                      <span className="text-slate-400">{qtyLabel}</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {tier.price > 0 ? formatCurrency(tier.price) : 'Liên hệ'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {product.note && <div className="mt-3 text-xs text-slate-400 opacity-80">{product.note}</div>}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 mt-4 px-2">
        * Giá có thể thay đổi tùy chất liệu và độ phức tạp file. Liên hệ Zalo 0822 968 412 để được báo giá chính xác.
      </p>
    </div>
  );
}
