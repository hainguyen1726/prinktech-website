'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { Order, formatCurrency } from '@/lib/pricing';
import { Printer, Download, X } from 'lucide-react';

interface QuoteBillModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuoteBillModal({ order, isOpen, onClose }: QuoteBillModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  // Lấy danh sách mặt hàng
  const rawItems = Array.isArray(order.items) && order.items.length > 0 ? order.items : [
    {
      product_label: 'In tem UV DTF cuộn',
      product_type: (order as any).sticker_type || 'dtf_roll',
      quantity: (order as any).quantity_actual || (order as any).quantity_expected || 1,
      unit: (order as any).pricing_type === 'per_meter' ? 'm' : 'cái',
      unit_price: (order as any).unit_price || order.subtotal || 0,
      subtotal: order.subtotal || 0,
    }
  ];

  // Chuẩn hóa ĐVT
  const formatUnit = (item: any) => {
    const u = (item.unit || '').toLowerCase();
    if (u.includes('mét') || u.includes('met') || u === 'm') return 'm';
    if (u.includes('tờ') || u.includes('to')) return 'tờ';
    return 'cái';
  };

  const handlePrint = () => {
    window.print();
  };

  const subtotal = order.subtotal || rawItems.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
  const shippingFee = Number(order.shipping_fee) || 0;
  const discount = Number(order.discount) || 0;
  const hasVat = Boolean(order.has_vat || order.tags?.includes('VAT 8%'));
  const vatAmount = hasVat ? Math.round(subtotal * 0.08) : 0;
  const finalTotal = subtotal + shippingFee + vatAmount - discount;

  const dateStr = new Date(order.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Container Dialog */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        
        {/* Action Bar (Ẩn khi In) */}
        <div className="print:hidden bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-extrabold text-sm">🧾 BÁO GIÁ MẪU</span>
            <span className="text-slate-400 text-xs font-mono">({order.order_number})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer size={14} /> In / Tải PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Khung Báo giá / Bill Printable Content */}
        <div className="p-6 md:p-8 overflow-y-auto bg-white text-slate-800 print:p-0 print:overflow-visible" ref={printRef}>
          
          {/* Header Báo giá */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5 mb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo_prinktech.png"
                  alt="Prink Tech Logo"
                  width={140}
                  height={45}
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-[11px] font-medium text-slate-600 mt-1">Xưởng In Tem UV DTF & Sticker Chuyên Nghiệp</p>
              <p className="text-xs text-slate-700 font-bold">
                Hotline / Zalo: <span className="text-purple-700">0964 023 333 - 09668 26879</span>
              </p>
              <p className="text-xs text-slate-600">
                Website: <a href="https://prinktech.netslive.com" target="_blank" rel="noreferrer" className="text-purple-600 font-semibold underline">https://prinktech.netslive.com</a>
              </p>
            </div>

            <div className="text-right space-y-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">BÁO GIÁ</h1>
              <p className="text-xs font-bold text-slate-600">
                Số: <span className="font-mono text-purple-700 font-extrabold text-sm">{order.order_number}</span>
              </p>
              <p className="text-xs text-slate-500">Ngày lập: <span className="font-medium text-slate-800">{dateStr}</span></p>
            </div>
          </div>

          {/* Thông tin Khách hàng */}
          <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-200/80">
            <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">Thông tin Khách hàng</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Khách hàng: </span>
                <strong className="text-slate-900 font-bold">{order.customer_name}</strong>
              </div>
              <div>
                <span className="text-slate-500">Số điện thoại: </span>
                <strong className="text-slate-900 font-bold">{order.customer_phone}</strong>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-500">Địa chỉ giao hàng: </span>
                <span className="text-slate-800 font-medium">{order.customer_address || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </div>

          {/* Bảng Mặt hàng */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-y border-slate-300 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Tên sản phẩm / Dịch vụ</th>
                  <th className="py-2.5 px-3 text-center w-16">ĐVT</th>
                  <th className="py-2.5 px-3 text-right w-20">Số lượng</th>
                  <th className="py-2.5 px-3 text-right w-28">Đơn giá</th>
                  <th className="py-2.5 px-3 text-right w-28">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rawItems.map((item: any, idx: number) => {
                  const qty = Number(item.quantity) || 1;
                  const price = Number(item.unit_price) || 0;
                  const sub = Number(item.subtotal) || Math.round(qty * price);
                  const unitStr = formatUnit(item);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {item.product_label || item.name || 'Tem UV DTF'}
                        {item.width_cm && item.height_cm && (
                          <span className="text-slate-500 font-normal ml-1">({item.width_cm}x{item.height_cm} cm)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-600">{unitStr}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">{qty}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">{formatCurrency(price)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(sub)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tổng cộng & Thanh toán */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 pt-2 border-t border-slate-200">
            {/* Ghi chú */}
            <div className="w-full md:w-1/2 space-y-1">
              <p className="text-[11px] font-bold uppercase text-slate-500">Ghi chú đơn hàng:</p>
              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic whitespace-pre-wrap">
                {order.customer_note || 'Không có ghi chú thêm.'}
              </p>
            </div>

            {/* Bảng Tính Tiền */}
            <div className="w-full md:w-5/12 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Tạm tính tiền hàng:</span>
                <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>

              {shippingFee > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Phí vận chuyển (Phí ship):</span>
                  <span className="font-bold text-slate-900">{formatCurrency(shippingFee)}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                  <span>Chiết khấu:</span>
                  <span className="font-bold">-{formatCurrency(discount)}</span>
                </div>
              )}

              {hasVat && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-amber-700">
                  <span className="font-bold">Thuế VAT (8%):</span>
                  <span className="font-bold">{formatCurrency(vatAmount)}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-extrabold mt-2">
                <span className="text-slate-900">TỔNG THANH TOÁN:</span>
                <span className="text-purple-700 text-base font-black">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* Chữ ký */}
          <div className="grid grid-cols-2 gap-4 text-center mt-8 pt-4 border-t border-slate-200 text-xs">
            <div>
              <p className="font-extrabold uppercase text-slate-800">KHÁCH HÀNG</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
            </div>
            <div>
              <p className="font-extrabold uppercase text-slate-800">NGƯỜI LẬP BÁO GIÁ</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold text-purple-700">Prink Tech Team</p>
            </div>
          </div>

        </div>

      </div>

      {/* Style CSS cho In Ấn */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          div[ref="printRef"], div[ref="printRef"] * {
            visibility: visible;
          }
          div[ref="printRef"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
