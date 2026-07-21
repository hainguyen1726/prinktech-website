'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { Order, formatCurrency } from '@/lib/pricing';
import { Printer, X } from 'lucide-react';

interface QuoteBillModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

// Hàm lọc bỏ thông tin hệ thống khỏi Ghi chú
const getCleanCustomerNote = (note: string | null | undefined): string => {
  if (!note) return '';
  return note
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return (
        !trimmed.startsWith('- Excel Báo giá') &&
        !trimmed.startsWith('- PDF Báo giá') &&
        !trimmed.startsWith('- File thiết kế') &&
        !trimmed.startsWith('- Dữ liệu sản phẩm JSON') &&
        !trimmed.startsWith('- Đơn vị vận chuyển') &&
        !trimmed.startsWith('- Mã vận đơn')
      );
    })
    .join('\n')
    .trim();
};

export default function QuoteBillModal({ order, isOpen, onClose }: QuoteBillModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const isPerMeter = (order as any).pricing_type === 'per_meter' || (order as any).sticker_type === 'dtf_roll';
  const quantityActual = Number((order as any).quantity_actual) || Number((order as any).quantity_expected) || 0;

  // Lấy danh sách mặt hàng và chuẩn hóa Số lượng & ĐVT
  let rawItems: any[] = [];
  
  if (Array.isArray(order.items) && order.items.length > 0) {
    rawItems = order.items.map((it: any) => {
      const u = (it.unit || '').toLowerCase();
      const isMeterUnit = u.includes('mét') || u.includes('met') || u === 'm';
      
      if (isMeterUnit || isPerMeter) {
        const qty = quantityActual > 0 ? quantityActual : Number(it.quantity) || 1;
        const sub = Number(it.subtotal) || order.subtotal || 0;
        const price = Number(it.unit_price) && Number(it.unit_price) > 50000 
          ? Number(it.unit_price) 
          : Math.round(sub / qty);

        return {
          product_label: it.product_label || it.name || 'In tem UV DTF cuộn',
          unit: 'm',
          quantity: qty,
          unit_price: price,
          subtotal: sub,
        };
      }

      return {
        product_label: it.product_label || it.name || 'In tem UV DTF',
        unit: u.includes('tờ') ? 'tờ' : 'cái',
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        subtotal: Number(it.subtotal) || 0,
      };
    });
  } else {
    // Trường hợp đơn cũ không lưu mảng items
    const sub = order.subtotal || (order as any).total_amount || 0;
    if (isPerMeter && quantityActual > 0) {
      rawItems = [
        {
          product_label: 'In tem UV DTF cuộn',
          unit: 'm',
          quantity: quantityActual,
          unit_price: Math.round(sub / quantityActual),
          subtotal: sub,
        }
      ];
    } else {
      rawItems = [
        {
          product_label: 'In tem UV DTF',
          unit: 'cái',
          quantity: quantityActual || 1,
          unit_price: sub,
          subtotal: sub,
        }
      ];
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const subtotal = order.subtotal || rawItems.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
  const shippingFee = Number(order.shipping_fee) || 0;
  const discount = Number(order.discount) || 0;
  const hasVat = Boolean(order.has_vat || order.tags?.includes('VAT 8%'));

  // Tính tổng tiền & làm tròn số đẹp
  let finalTotal = order.total || (subtotal + shippingFee - discount);
  if (hasVat && !order.total) {
    finalTotal = Math.round((subtotal + shippingFee - discount) * 1.08);
  }
  const vatAmount = hasVat ? (finalTotal - subtotal - shippingFee + discount) : 0;

  const cleanNote = getCleanCustomerNote(order.customer_note || (order as any).note);

  const dateStr = new Date(order.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Container Dialog */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
        
        {/* Action Bar (Ẩn khi In) */}
        <div className="print:hidden bg-slate-900 text-white px-5 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-extrabold text-sm">🧾 BÁO GIÁ ĐƠN HÀNG</span>
            <span className="text-slate-400 text-xs font-mono">({order.order_number})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer size={15} /> In Báo Giá / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BÁO GIÁ XƯỞNG IN (Printable Content) */}
        <div className="p-6 md:p-8 overflow-y-auto bg-white text-slate-900 print:p-0 print:overflow-visible" ref={printRef}>
          
          {/* Header Báo giá */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo_prinktech.png"
                  alt="Prink Tech Logo"
                  width={150}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
              <p className="text-[11px] font-bold text-slate-700 mt-1">Xưởng In Tem UV DTF & Sticker Chuyên Nghiệp</p>
              <p className="text-xs text-slate-800 font-bold">
                Hotline / Zalo: <span className="text-purple-700 font-extrabold">0822.968.412</span>
              </p>
              <p className="text-xs text-slate-700">
                Website: <span className="text-purple-700 font-bold">https://prinktech.netslive.com</span>
              </p>
            </div>

            <div className="text-right space-y-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">BÁO GIÁ</h1>
              <p className="text-xs font-bold text-slate-700">
                Số: <span className="font-mono text-purple-700 font-black text-sm">{order.order_number}</span>
              </p>
              <p className="text-xs text-slate-600">Ngày lập: <span className="font-bold text-slate-800">{dateStr}</span></p>
            </div>
          </div>

          {/* Thông tin Khách hàng */}
          <div className="border border-slate-400 rounded-lg p-3.5 mb-5 bg-slate-50/50">
            <h3 className="text-[11px] font-extrabold uppercase text-slate-600 tracking-wider mb-2">Thông tin Khách hàng</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-600">Khách hàng: </span>
                <strong className="text-slate-900 font-bold text-sm">{order.customer_name}</strong>
              </div>
              <div>
                <span className="text-slate-600">Số điện thoại: </span>
                <strong className="text-slate-900 font-bold">{order.customer_phone}</strong>
              </div>
              <div className="md:col-span-2 pt-1 border-t border-slate-200/80">
                <span className="text-slate-600">Địa chỉ giao hàng: </span>
                <span className="text-slate-900 font-semibold">{order.customer_address || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </div>

          {/* Bảng Mặt hàng - Phong cách Xưởng in chuẩn */}
          <div className="mb-5">
            <table className="w-full text-xs text-left border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-200 text-slate-800 border-b border-slate-400 font-extrabold uppercase text-[11px]">
                  <th className="py-2.5 px-3 border-r border-slate-400 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3 border-r border-slate-400">Tên sản phẩm / Dịch vụ</th>
                  <th className="py-2.5 px-3 border-r border-slate-400 text-center w-16">ĐVT</th>
                  <th className="py-2.5 px-3 border-r border-slate-400 text-right w-20">Số lượng</th>
                  <th className="py-2.5 px-3 border-r border-slate-400 text-right w-28">Đơn giá</th>
                  <th className="py-2.5 px-3 text-right w-28">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {rawItems.map((item: any, idx: number) => {
                  const qty = item.quantity;
                  const price = item.unit_price;
                  const sub = item.subtotal;

                  return (
                    <tr key={idx} className="bg-white">
                      <td className="py-3 px-3 border-r border-slate-300 text-center font-bold text-slate-600">{idx + 1}</td>
                      <td className="py-3 px-3 border-r border-slate-300 font-bold text-slate-900">
                        {item.product_label}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-300 text-center font-bold text-slate-700 uppercase">{item.unit}</td>
                      <td className="py-3 px-3 border-r border-slate-300 text-right font-bold text-slate-900">{qty}</td>
                      <td className="py-3 px-3 border-r border-slate-300 text-right font-semibold text-slate-800">{formatCurrency(price)}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-slate-900">{formatCurrency(sub)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tổng cộng & Ghi chú */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pt-2">
            {/* Ghi chú */}
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold uppercase text-slate-600">Ghi chú đơn hàng:</p>
              <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-300 font-medium whitespace-pre-wrap min-h-[70px]">
                {cleanNote || 'Không có ghi chú thêm.'}
              </div>
            </div>

            {/* Bảng Tính Tiền */}
            <div className="space-y-2 text-xs border border-slate-400 rounded-lg p-3 bg-slate-50/50">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Tạm tính tiền hàng:</span>
                <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>

              {shippingFee > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Phí vận chuyển (Phí ship):</span>
                  <span className="font-bold text-slate-900">{formatCurrency(shippingFee)}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-200 text-rose-600">
                  <span className="font-medium">Chiết khấu:</span>
                  <span className="font-bold">-{formatCurrency(discount)}</span>
                </div>
              )}

              {hasVat && (
                <div className="flex justify-between py-1 border-b border-slate-200 text-amber-800">
                  <span className="font-bold">Thuế VAT (8%):</span>
                  <span className="font-bold">{formatCurrency(vatAmount)}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-extrabold mt-1">
                <span className="text-slate-900">TỔNG THANH TOÁN:</span>
                <span className="text-purple-700 text-base font-black">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* Chữ ký Xưởng & Khách hàng */}
          <div className="grid grid-cols-2 gap-4 text-center mt-8 pt-4 border-t border-slate-300 text-xs">
            <div>
              <p className="font-extrabold uppercase text-slate-800">KHÁCH HÀNG</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
            </div>
            <div>
              <p className="font-extrabold uppercase text-slate-800">NGƯỜI LẬP BÁO GIÁ</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-extrabold text-purple-700">Prink Tech Team</p>
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
