'use client';

import { PRODUCTS } from '@/lib/pricing';
import { formatCurrency } from '@/lib/pricing';

export default function PriceTable() {
  const promotionProduct = PRODUCTS.find(p => p.promotion);

  return (
    <div className="mb-12">
      {/* Tiêu đề */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
          Bảng Giá In UV DTF PrinK Tech
        </h2>
        <p className="text-slate-400 text-sm">
          Cập nhật ngày <span className="font-semibold text-slate-300">09/07/2026</span> • Giá đã bao gồm VAT
        </p>
      </div>

      {/* Bảng giá */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60">
              <th className="text-left px-6 py-4 font-bold text-slate-200">Sản phẩm</th>
              <th className="text-center px-4 py-4 font-bold text-slate-200">ĐVT</th>
              <th className="text-center px-4 py-4 font-bold text-slate-200">Số lượng</th>
              <th className="text-right px-6 py-4 font-bold text-slate-200">Đơn giá</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {PRODUCTS.map((product, index) => {
              const isPromotion = !!product.promotion;
              
              return (
                <tr 
                  key={index} 
                  className={`hover:bg-slate-800/40 transition-colors ${isPromotion ? 'bg-orange-500/5' : ''}`}
                >
                  {/* Tên sản phẩm */}
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{product.icon}</span>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {product.label}
                          {isPromotion && (
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500 text-white">
                              KHUYẾN MẠI
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{product.description}</div>
                        
                        {/* Khuyến mại badge */}
                        {isPromotion && product.promotion && (
                          <div className="mt-2 text-xs bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3 py-1.5 rounded-lg">
                            🎉 <strong>{product.promotion.message}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ĐVT */}
                  <td className="px-4 py-5 text-center text-slate-400 font-medium">
                    {product.unitLabel}
                  </td>

                  {/* Số lượng + Giá */}
                  <td className="px-4 py-5">
                    <div className="space-y-1.5 text-xs">
                      {product.tiers.map((tier, i) => {
                        const qtyLabel = tier.max 
                          ? `${tier.min} – ${tier.max}` 
                          : tier.min === 0 
                            ? 'Mọi số lượng' 
                            : `≥ ${tier.min}`;
                        
                        return (
                          <div key={i} className="flex justify-between items-center gap-3 text-slate-300">
                            <span className="text-slate-400">{qtyLabel}</span>
                            <span className="font-mono font-semibold text-emerald-400">
                              {tier.price > 0 ? formatCurrency(tier.price) : 'Liên hệ'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Ghi chú */}
                  <td className="px-6 py-5 text-xs text-slate-400 align-top">
                    {product.note && (
                      <div className="leading-snug">{product.note}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ghi chú cuối bảng */}
      <div className="mt-4 text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 px-1">
        <span>• Giá trên đã bao gồm VAT</span>
        <span>• Giá có thể thay đổi tùy thuộc vào chất liệu và độ khó file</span>
        <span>• Liên hệ Zalo 0822 968 412 để được báo giá chính xác nhất</span>
      </div>
    </div>
  );
}
