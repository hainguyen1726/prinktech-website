'use client';

import React, { useRef } from 'react';
import { Order, formatCurrency } from '@/lib/pricing';
import { Printer, X, MapPin, Phone, Calendar, Globe } from 'lucide-react';

interface QuoteBillModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

// Lọc sạch các dòng ghi chú hệ thống (Excel, PDF, JSON, Vận chuyển...)
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

  // Lấy danh sách mặt hàng và chuẩn hóa Số lượng / ĐVT
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
          product_label: it.product_label || it.name || 'In cuộn DTF',
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
    const sub = order.subtotal || (order as any).total_amount || 0;
    if (isPerMeter && quantityActual > 0) {
      rawItems = [
        {
          product_label: 'In cuộn DTF',
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
  
  // Trích xuất Phí ship chuẩn từ đơn hàng hoặc ghi chú
  let shippingFee = Number(order.shipping_fee) || 0;
  const rawNoteStr = (order.customer_note || '') + '\n' + ((order as any).note || '');
  if (!shippingFee && rawNoteStr) {
    const shipMatch = rawNoteStr.match(/Phí ship:?\s*([\d\.\,]+)k?/i);
    if (shipMatch) {
      let valNum = Number(shipMatch[1].replace(/[\.\,]/g, ''));
      if (valNum < 1000) valNum = valNum * 1000;
      shippingFee = valNum;
    }
  }

  const discount = Number(order.discount) || 0;

  // Trích xuất Thuế VAT chuẩn (từ has_vat, tags, hoặc ghi chú)
  const tags = Array.isArray(order.tags) ? order.tags : [];
  const hasVat = Boolean(
    order.has_vat || 
    tags.some((t: string) => t.toLowerCase().includes('vat')) ||
    rawNoteStr.toLowerCase().includes('vat 8%') ||
    rawNoteStr.toLowerCase().includes('thuế vat')
  );

  const vatAmount = hasVat ? Math.round(subtotal * 0.08) : 0;
  const finalTotal = subtotal + shippingFee + vatAmount - discount;

  const totalRollMeters = rawItems
    .filter(it => it.unit === 'm')
    .reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  const cleanNote = getCleanCustomerNote(order.customer_note || (order as any).note);

  const dateStr = new Date(order.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Container Dialog */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Action Bar Top (Ẩn khi In) */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-pink-500/20 text-pink-400 font-extrabold text-xs rounded-full border border-pink-500/30">🧾 BÁO GIÁ</span>
            <span className="text-slate-300 text-xs font-mono">({order.order_number})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer size={15} /> In Bill
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BILL DOCUMENT — GIỐNG 100% CODE XƯỞNG IN (print.netslive.com) */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 print:p-0 print:overflow-visible" ref={printRef}>
          
          {/* ── Header ── */}
          <div className="flex justify-between items-start pb-6 border-b-2 border-pink-500">
            {/* Logo + thông tin công ty */}
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-horizontal-dark-text.png"
                alt="PrinK Tech"
                className="h-14 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_prinktech.png';
                }}
              />
              <div className="border-l-2 border-slate-200 pl-4 ml-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đơn vị phát hành</p>
                <h2 className="font-black text-slate-800 text-sm leading-tight">PRINK TECH</h2>
                <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                  <Phone size={10} /> Hotline / Zalo: <strong className="text-slate-900 font-bold">0822.968.412</strong>
                </p>
                <p className="text-[11px] text-slate-600 flex items-center gap-1">
                  <Globe size={10} /> Website: <a href="https://prinktech.netslive.com" target="_blank" rel="noreferrer" className="text-pink-600 font-bold underline">https://prinktech.netslive.com</a>
                </p>
              </div>
            </div>

            {/* Tiêu đề bill */}
            <div className="text-right">
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight">
                BÁO GIÁ
              </h1>
              <div className="mt-3 space-y-1">
                <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                  <span className="font-bold text-slate-700">Số:</span>{' '}
                  <span className="font-black text-slate-800">{order.order_number}</span>
                </p>
                <p className="text-[11px] text-slate-500 flex items-center justify-end gap-1 whitespace-nowrap">
                  <Calendar size={10} />
                  <span className="font-bold text-slate-700">Ngày lập:</span>{' '}
                  {dateStr}
                </p>
              </div>
            </div>
          </div>

          {/* ── Thông tin khách hàng ── */}
          <div className="my-6 px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Khách hàng / Bên mua</p>
            <h3 className="font-black text-slate-800 text-base">{order.customer_name}</h3>
            {order.customer_phone && (
              <p className="text-[12px] text-slate-600 mt-0.5 flex items-center gap-1">
                <Phone size={11} /> {order.customer_phone}
              </p>
            )}
            {order.customer_address && (
              <p className="text-[12px] text-slate-600 flex items-center gap-1 mt-0.5">
                <MapPin size={11} /> {order.customer_address}
              </p>
            )}
          </div>

          {/* ── Bảng đơn hàng ── */}
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="py-2.5 px-3 font-bold text-center w-8 whitespace-nowrap">STT</th>
                  <th className="py-2.5 px-3 font-bold whitespace-nowrap">Mã đơn hàng</th>
                  <th className="py-2.5 px-3 font-bold whitespace-nowrap">Tên sản phẩm / Loại in</th>
                  <th className="py-2.5 px-3 font-bold text-center whitespace-nowrap">Ngày</th>
                  <th className="py-2.5 px-3 font-bold text-right whitespace-nowrap">Số lượng</th>
                  <th className="py-2.5 px-3 font-bold text-right whitespace-nowrap">Đơn giá</th>
                  <th className="py-2.5 px-3 font-bold text-center whitespace-nowrap">CK</th>
                  <th className="py-2.5 px-3 font-bold text-right bg-pink-600 whitespace-nowrap">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {rawItems.map((item: any, idx: number) => {
                  const qtyStr = `${item.quantity.toLocaleString('vi-VN')} ${item.unit}`;
                  return (
                    <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium whitespace-nowrap">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">{order.order_number}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">{item.product_label}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">{qtyStr}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2.5 px-3 text-center text-slate-400 whitespace-nowrap">—</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 bg-pink-50 whitespace-nowrap">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Tổng cộng + Ghi chú ── */}
          <div className="pb-6 flex flex-col md:flex-row gap-6 items-start">
            {/* Khối Ghi chú */}
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-5 w-full">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">📋 Ghi chú đơn hàng</p>
              <p className="text-[12px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                {cleanNote || 'Không có ghi chú thêm.'}
              </p>
            </div>

            {/* Bảng tổng */}
            <div className="w-full md:w-72 space-y-2">
              {totalRollMeters > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-slate-200 text-[13px] whitespace-nowrap">
                  <span className="text-slate-600 font-medium">Tổng số mét in:</span>
                  <span className="font-bold text-slate-800">{totalRollMeters.toLocaleString('vi-VN')} m</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b border-slate-200 text-[13px] whitespace-nowrap">
                <span className="text-slate-600 font-medium">Tạm tính:</span>
                <span className="font-extrabold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>

              {hasVat && (
                <div className="flex justify-between items-center py-2 border-b border-slate-200 text-[13px] whitespace-nowrap text-amber-600">
                  <span className="font-semibold">VAT (8%):</span>
                  <span className="font-bold text-rose-600">{formatCurrency(vatAmount)}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-slate-200 text-[13px] whitespace-nowrap text-rose-600">
                  <span className="font-medium">Chiết khấu:</span>
                  <span className="font-bold">-{formatCurrency(discount)}</span>
                </div>
              )}

              {shippingFee > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-slate-200 text-[13px] whitespace-nowrap">
                  <span className="text-slate-600 font-medium">Phí vận chuyển (Phí ship):</span>
                  <span className="font-extrabold text-slate-800">{formatCurrency(shippingFee)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-3 bg-slate-800 text-white rounded-xl px-4 mt-3 whitespace-nowrap shadow-sm">
                <span className="font-bold text-xs uppercase tracking-wider">TỔNG PHẢI TRẢ:</span>
                <span className="font-black text-lg text-pink-400 whitespace-nowrap">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-400 font-medium">
            <span>Xưởng in UV DTF — PrinK Tech</span>
            <span className="italic">Chân thành cảm ơn quý khách!</span>
            <span>Số: {order.order_number}</span>
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
