'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { X, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import {
  PRODUCTS,
  Product,
  OrderItem,
  FREE_SHIP_THRESHOLD,
  SHIPPING_FEE_STANDARD,
  getUnitPrice,
  getActiveTier,
  formatCurrency,
} from '@/lib/pricing';

/* ─── Types ─────────────────────────────────────────────── */
type CartItem = OrderItem & { id: string };

type CustomerForm = {
  name: string;
  phone: string;
  address: string;
  email: string;
  note: string;
  payment_method: 'cod' | 'transfer';
  design_url: string;
  request_vat: boolean;
  vat_company_name: string;
  vat_tax_code: string;
  vat_company_address: string;
  vat_email: string;
};

/* ─── Helpers ────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }

/* ─── Item Add Form ──────────────────────────────────────── */
function AddItemForm({ onAdd }: { onAdd: (item: CartItem) => void }) {
  const [product, setProduct] = useState<Product>(PRODUCTS[0]);
  const [qty, setQty] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [designUrl, setDesignUrl] = useState('');
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);

  const qtyNum = parseFloat(qty) || 0;
  const unitPrice = getUnitPrice(product, qtyNum);
  const subtotal = unitPrice * qtyNum;
  const tier = getActiveTier(product, qtyNum);

  const handleAdd = () => {
    if (qtyNum <= 0 || unitPrice === 0) return;
    onAdd({
      id: uid(),
      product_type: product.type,
      product_label: product.label,
      size_label: tier?.label ?? '',
      quantity: qtyNum,
      unit: product.unit,
      unit_price: unitPrice,
      subtotal,
      image_url: imageUrl.trim() || null,
      design_url: designUrl.trim() || null,
      note: note.trim() || null,
    });
    setQty('1');
    setImageUrl('');
    setDesignUrl('');
    setNote('');
    setOpen(false);
  };

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full h-10 rounded-xl border border-dashed border-[var(--accent)]/45 text-[var(--accent)] text-sm cursor-pointer font-bold
          hover:bg-[var(--accent)]/8 hover:border-[var(--accent)] transition-all flex items-center justify-center gap-2"
      >
        <span className="text-lg">+</span> Thêm sản phẩm đặt in
      </button>

      {open && (
        <div className="mt-3 p-4 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-glow)] space-y-4 shadow-inner">
          {/* Product select */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">Loại sản phẩm</label>
            <select
              value={product.type}
              onChange={e => {
                const p = PRODUCTS.find(x => x.type === e.target.value)!;
                setProduct(p);
                setQty(String(p.minQty));
              }}
              className="w-full h-9 px-3 rounded-xl border border-card-border bg-background text-foreground text-sm font-semibold focus:outline-none focus:border-[var(--accent)]"
            >
              {PRODUCTS.map(p => (
                <option key={p.type} value={p.type} className="bg-card-bg text-foreground">{p.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">Số lượng ({product.unitLabel})</label>
              <input
                type="number"
                min={product.minQty}
                step={product.unit === 'mét' ? 0.5 : (product.unit === 'tờ' ? 1 : 50)}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-card-border bg-background text-foreground text-sm font-bold focus:outline-none focus:border-[var(--accent)]"
              />
              {tier && <p className="text-xs text-[var(--accent)] font-semibold mt-1">{tier.label} — {formatCurrency(unitPrice)}/{product.unitLabel}</p>}
            </div>

            {/* Preview price */}
            <div className="flex flex-col justify-end">
              <div className="h-9 px-3 rounded-xl border border-[var(--accent)]/25 bg-background flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium">Thành tiền:</span>
                <span className="text-sm font-bold text-[var(--accent)] tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">
              Link ảnh sản phẩm / mẫu in <span className="text-text-muted/70 font-normal">(Drive, Zalo, tùy chọn)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full h-9 px-3 rounded-xl border border-card-border bg-background text-foreground text-sm placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Design URL */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">
              Link file thiết kế (AI, PDF, CDR…) <span className="text-text-muted/70 font-normal">(tùy chọn)</span>
            </label>
            <input
              type="url"
              value={designUrl}
              onChange={e => setDesignUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full h-9 px-3 rounded-xl border border-card-border bg-background text-foreground text-sm placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">Ghi chú cho sản phẩm này</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Màu sắc đặc biệt, kích thước chính xác..."
              className="w-full h-9 px-3 rounded-xl border border-card-border bg-background text-foreground text-sm placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={qtyNum < product.minQty || unitPrice === 0}
              className="flex-1 h-9 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white cursor-pointer hover:from-purple-500 hover:to-fuchsia-500 transition-all"
            >
              Thêm vào đơn
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 h-9 rounded-xl text-sm text-text-muted border border-card-border hover:bg-block-bg transition-all cursor-pointer font-medium"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function OrderForm() {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerForm>({
    name: '', phone: '', address: '', email: '', note: '',
    payment_method: 'cod', design_url: '',
    request_vat: false,
    vat_company_name: '',
    vat_tax_code: '',
    vat_company_address: '',
    vat_email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; order_number?: string; error?: string } | null>(null);
  const [activeTheme, setActiveTheme] = useState<'tech' | 'creative' | 'elegant'>('elegant');

  // Load theme từ localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('prinktech-theme') || 'elegant';
    setActiveTheme(savedTheme as any);
    
    document.documentElement.classList.remove('theme-tech', 'theme-creative');
    document.body.classList.remove('theme-tech', 'theme-creative');
    if (savedTheme === 'tech') {
      document.documentElement.classList.add('theme-tech');
      document.body.classList.add('theme-tech');
    } else if (savedTheme === 'creative') {
      document.documentElement.classList.add('theme-creative');
      document.body.classList.add('theme-creative');
    }
  }, []);

  const changeTheme = (theme: 'tech' | 'creative' | 'elegant') => {
    setActiveTheme(theme);
    localStorage.setItem('prinktech-theme', theme);
    document.documentElement.classList.remove('theme-tech', 'theme-creative');
    document.body.classList.remove('theme-tech', 'theme-creative');
    if (theme === 'tech') {
      document.documentElement.classList.add('theme-tech');
      document.body.classList.add('theme-tech');
    } else if (theme === 'creative') {
      document.documentElement.classList.add('theme-creative');
      document.body.classList.add('theme-creative');
    }
  };

  // Pre-fill cart từ trang tính giá (nếu có)
  useEffect(() => {
    const quote = searchParams.get('quote');
    if (quote) {
      try {
        const parsed = JSON.parse(decodeURIComponent(quote));
        if (Array.isArray(parsed)) setItems(parsed.map(i => ({ ...i, id: uid() })));
      } catch { /* bỏ qua */ }
    }
  }, [searchParams]);

  const set = (field: keyof CustomerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setCustomer(prev => ({ ...prev, [field]: e.target.value }));

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const freeShip = subtotal >= FREE_SHIP_THRESHOLD;
  const shippingFee = freeShip ? 0 : items.length > 0 ? SHIPPING_FEE_STANDARD : 0;
  const total = subtotal + shippingFee;

  const errors = {
    name: !customer.name.trim(),
    phone: !customer.phone.trim() || !/^[0-9]{10,11}$/.test(customer.phone.replace(/\s/g, '')),
    address: !customer.address.trim(),
    items: items.length === 0,
  };
  const isValid = !Object.values(errors).some(Boolean);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_address: customer.address,
          customer_email: customer.email || null,
          customer_note: customer.note || null,
          items,
          subtotal,
          shipping_fee: shippingFee,
          discount: 0,
          total,
          free_shipping: freeShip,
          payment_method: customer.payment_method,
          design_url: customer.design_url || null,
          request_vat: customer.request_vat,
          vat_company_name: customer.request_vat ? customer.vat_company_name.trim() : null,
          vat_tax_code: customer.request_vat ? customer.vat_tax_code.trim() : null,
          vat_company_address: customer.request_vat ? customer.vat_company_address.trim() : null,
          vat_email: customer.request_vat ? customer.vat_email.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
      setResult({ success: true, order_number: data.order_number });
    } catch (e) {
      setResult({ success: false, error: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success screen (Order Confirmation Bill) ── */
  if (result?.success) {
    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
    const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const handlePrintConfirm = () => {
      const printWin = window.open('', '_blank', 'width=900,height=700');
      if (!printWin) return;
      const rows = items.map((item, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
          <td style="padding:9px 10px;text-align:center;color:#94a3b8;border-bottom:1px solid #f1f5f9">${i + 1}</td>
          <td style="padding:9px 10px;font-weight:700;color:#1e293b;border-bottom:1px solid #f1f5f9">
            ${item.product_label}
            ${item.note ? `<br/><span style="color:#94a3b8;font-size:10px;font-weight:400">${item.note}</span>` : ''}
          </td>
          <td style="padding:9px 10px;text-align:center;color:#475569;border-bottom:1px solid #f1f5f9">${item.quantity} ${item.unit}</td>
          <td style="padding:9px 10px;text-align:right;color:#475569;border-bottom:1px solid #f1f5f9">${fmt(item.unit_price)}</td>
          <td style="padding:9px 10px;text-align:right;font-weight:700;color:#1e293b;background:#fff0f6;border-bottom:1px solid #f1f5f9">${fmt(item.subtotal)}</td>
        </tr>`).join('');
      printWin.document.write(`<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8"/><title>Xác nhận đơn hàng ${result.order_number} – PrinK Tech</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',Arial,sans-serif;background:#f8fafc;color:#1e293b;font-size:12px}.doc{max-width:820px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12)}@media print{body{background:#fff}.doc{margin:0;border-radius:0;box-shadow:none;max-width:100%}@page{size:A4;margin:12mm 10mm}}</style>
      </head><body><div class="doc">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:28px 32px 20px;border-bottom:2.5px solid #ec4899">
          <div style="display:flex;align-items:flex-start;gap:16px">
            <img src="${window.location.origin}/logo-horizontal-dark-text.png" alt="PrinK Tech" style="height:48px;object-fit:contain" onerror="this.style.display='none'"/>
            <div style="border-left:2px solid #e2e8f0;padding-left:14px;margin-left:4px">
              <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Đơn vị thực hiện</p>
              <p style="font-weight:900;font-size:12px;color:#1e293b">XƯỞNG IN UV DTF – PRINK TECH</p>
              <p style="font-size:10px;color:#64748b;margin-top:2px">Zalo (Ưu tiên) / Hotline: <strong style="color:#1e293b">0822.968.412</strong></p>
            </div>
          </div>
          <div style="text-align:right">
            <h1 style="font-size:20px;font-weight:900;color:#1e293b;text-transform:uppercase">XÁC NHẬN ĐƠN HÀNG</h1>
            <p style="font-size:14px;font-weight:700;color:#ec4899;margin-top:4px;font-family:monospace">${result.order_number}</p>
            <p style="font-size:10px;color:#64748b;margin-top:6px"><span style="font-weight:700;color:#334155">Ngày đặt:</span> ${today}</p>
            <p style="font-size:10px;color:#64748b"><span style="font-weight:700;color:#334155">Thanh toán:</span> ${customer.payment_method === 'cod' ? 'COD – Thu khi nhận' : 'Chuyển khoản trước'}</p>
          </div>
        </div>
        <div style="padding:14px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
          <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Thông tin khách hàng</p>
          <p style="font-weight:900;font-size:14px;color:#1e293b">${customer.name}</p>
          <p style="font-size:11px;color:#64748b;margin-top:3px">📞 ${customer.phone}${customer.email ? ` · ✉️ ${customer.email}` : ''}</p>
          <p style="font-size:11px;color:#64748b">📍 ${customer.address}</p>
          ${customer.note ? `<p style="font-size:11px;color:#64748b;margin-top:3px;font-style:italic">💬 ${customer.note}</p>` : ''}
        </div>
        <div style="padding:0 32px 24px">
          <table style="width:100%;border-collapse:collapse;margin-top:24px">
            <thead><tr style="background:#1e293b;color:#fff">
              <th style="padding:10px;text-align:center;font-weight:700;width:36px">STT</th>
              <th style="padding:10px;text-align:left;font-weight:700">Sản phẩm</th>
              <th style="padding:10px;text-align:center;font-weight:700">Số lượng</th>
              <th style="padding:10px;text-align:right;font-weight:700">Đơn giá</th>
              <th style="padding:10px;text-align:right;font-weight:700;background:#db2777">Thành tiền</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="padding:0 32px 32px;display:flex;gap:24px;align-items:flex-start">
          <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px">
            <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Thông tin thanh toán</p>
            <div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#64748b;width:80px;flex-shrink:0;font-size:11px">Ngân hàng:</span><span style="font-weight:700;color:#1e293b;font-size:11px">Vietinbank</span></div>
            <div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#64748b;width:80px;flex-shrink:0;font-size:11px">Số TK:</span><span style="font-weight:900;color:#ec4899;font-size:14px;letter-spacing:0.06em">110602191866</span></div>
            <div style="display:flex;gap:8px;margin-bottom:12px"><span style="color:#64748b;width:80px;flex-shrink:0;font-size:11px">Chủ TK:</span><span style="font-weight:700;color:#1e293b;text-transform:uppercase;font-size:11px">CÔNG TY TNHH GMKT VIỆT NAM</span></div>
            <p style="font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;line-height:1.7">✅ Miễn phí vận chuyển cho đơn từ 150.000 ₫<br/>⚡ Hoàn thành trong 24h sau khi chốt file<br/>💬 Xác nhận qua Zalo (Ưu tiên): <strong>0822.968.412</strong></p>
          </div>
          <div style="width:260px">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px"><span style="color:#64748b">Tạm tính (${items.length} sp):</span><span style="font-weight:600;color:#1e293b">${fmt(subtotal)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px"><span style="color:#64748b">Phí vận chuyển:</span><span style="font-weight:600;color:${freeShip ? '#16a34a' : '#1e293b'}">${freeShip ? 'Miễn phí 🎉' : fmt(shippingFee)}</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e293b;color:#fff;border-radius:12px;margin-top:12px"><span style="font-weight:700;font-size:13px">TỔNG PHẢI TRẢ:</span><span style="font-weight:900;font-size:18px;color:#f9a8d4">${fmt(total)}</span></div>
          </div>
        </div>
        <div style="background:#1e293b;padding:14px 32px;display:flex;justify-content:space-between;align-items:center">
          <p style="color:#94a3b8;font-size:10px">Xưởng in UV DTF – PrinK Tech · gmkt2303@gmail.com</p>
          <p style="color:#94a3b8;font-size:10px">Mã đơn: ${result.order_number}</p>
          <p style="color:#94a3b8;font-size:10px">Cảm ơn quý khách! 🙏</p>
        </div>
      </div>
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
      printWin.document.close();
    };

    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8">
        {/* Bill Document */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start p-6 md:p-7 pb-5 gap-6 md:gap-4 border-b-[2.5px] border-pink-500 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <img src="/logo-horizontal-dark-text.png" alt="PrinK Tech" className="h-12 object-contain" onError={e => (e.currentTarget.style.display='none')} />
              <div className="border-t sm:border-t-0 sm:border-l-2 border-slate-200 pt-3 sm:pt-0 sm:pl-4 sm:ml-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Đơn vị thực hiện</p>
                <p className="font-black text-slate-800 text-sm">XƯỞNG IN UV DTF – PRINK TECH</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Zalo (Ưu tiên) / Hotline: <strong className="text-slate-700">0822.968.412</strong></p>
              </div>
            </div>
            <div className="text-center md:text-right flex flex-col items-center md:items-end">
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đặt hàng thành công
              </div>
              <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">XÁC NHẬN ĐƠN HÀNG</h1>
              <p className="text-base font-black text-pink-600 mt-0.5 font-mono">{result.order_number}</p>
              <p className="text-[11px] text-slate-500 mt-1.5"><span className="font-bold text-slate-700">Ngày đặt:</span> {today}</p>
              <p className="text-[11px] text-slate-500"><span className="font-bold text-slate-700">Thanh toán:</span> {customer.payment_method === 'cod' ? 'COD – Thu khi nhận' : 'Chuyển khoản trước'}</p>
            </div>
          </div>

          {/* Thông tin khách hàng */}
          <div className="px-7 py-4 bg-slate-50 border-b border-slate-200">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Thông tin khách hàng</p>
            <p className="font-black text-slate-800 text-base">{customer.name}</p>
            <p className="text-[12px] text-slate-600 mt-0.5">📞 {customer.phone}{customer.email ? ` · ✉️ ${customer.email}` : ''}</p>
            <p className="text-[12px] text-slate-600">📍 {customer.address}</p>
            {customer.note && <p className="text-[11px] text-slate-500 mt-1 italic">💬 {customer.note}</p>}
          </div>

          {/* Bảng sản phẩm */}
          <div className="px-7 py-5">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="py-2.5 px-3 font-bold text-center w-8">STT</th>
                  <th className="py-2.5 px-3 font-bold">Sản phẩm</th>
                  <th className="py-2.5 px-3 font-bold text-center">Số lượng</th>
                  <th className="py-2.5 px-3 font-bold text-right">Đơn giá</th>
                  <th className="py-2.5 px-3 font-bold text-right bg-pink-600">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-2.5 px-3 text-center text-slate-400 border-b border-slate-100">{i + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 border-b border-slate-100">
                      {item.product_label}
                      {item.note && <span className="block text-[10px] font-normal text-slate-400">{item.note}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 border-b border-slate-100">{item.quantity} {item.unit}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 border-b border-slate-100">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-pink-50 border-b border-slate-100">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tổng + Bank */}
          <div className="px-7 pb-7 flex flex-col md:flex-row gap-5 items-start">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Thông tin thanh toán</p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">Ngân hàng:</span><span className="font-bold text-slate-800">Vietinbank</span></div>
                <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">Số TK:</span><span className="font-black text-pink-600 text-base tracking-widest">110602191866</span></div>
                <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">Chủ TK:</span><span className="font-bold text-slate-700 uppercase text-[11px]">CÔNG TY TNHH GMKT VIỆT NAM</span></div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-200 leading-relaxed">
                ✅ Miễn phí vận chuyển cho đơn từ 150.000 ₫<br/>
                ⚡ Hoàn thành trong 24h sau khi chốt file<br/>
                💬 Xác nhận qua Zalo (Ưu tiên): <strong className="text-slate-700">0822.968.412</strong>
              </p>
            </div>
            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between text-[13px] py-2 border-b border-slate-200">
                <span className="text-slate-600">Tạm tính ({items.length} sp):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] py-2 border-b border-slate-200">
                <span className="text-slate-600">Phí vận chuyển:</span>
                <span className={`font-semibold ${freeShip ? 'text-green-600' : 'text-slate-800'}`}>
                  {freeShip ? 'Miễn phí 🎉' : formatCurrency(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 px-4 bg-slate-800 text-white rounded-xl mt-2">
                <span className="font-bold text-sm">TỔNG PHẢI TRẢ:</span>
                <span className="font-black text-lg text-pink-300">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-800 px-7 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-1 text-[11px] text-slate-400">
            <p>Xưởng in UV DTF – PrinK Tech · gmkt2303@gmail.com</p>
            <p>Mã đơn: {result.order_number}</p>
            <p>Cảm ơn quý khách! 🙏</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="max-w-3xl mx-auto mt-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handlePrintConfirm}
            className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            🖨 In xác nhận đơn hàng
          </button>
          <Link
            href={`/tra-cuu?phone=${customer.phone}&order=${result.order_number}`}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md"
          >
            📦 Theo dõi đơn hàng
          </Link>
          <Link
            href="/"
            className="flex-1 h-11 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            ← Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">

      {/* ── Nav bar đầy đủ ── */}
      <Header activeTheme={activeTheme} setActiveTheme={changeTheme} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground">
            Đặt hàng{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">
              in UV DTF 3D
            </span>
          </h1>
          <p className="text-text-muted mt-2 text-sm">Điền thông tin đầy đủ để xưởng xác nhận và sản xuất trong 24h</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* LEFT: Forms */}
          <div className="space-y-6">

            {/* Customer info */}
            <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
              <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                Thông tin khách hàng
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={set('name')}
                    placeholder="Nguyễn Văn A"
                    className={`w-full h-10 px-3 rounded-xl border bg-block-bg text-foreground text-sm font-semibold placeholder-text-muted/40 focus:outline-none transition-all
                      ${errors.name && customer.name !== '' ? 'border-red-500/50 focus:border-red-500' : 'border-card-border focus:border-[var(--accent)]'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={set('phone')}
                    placeholder="0822 968 412"
                    className={`w-full h-10 px-3 rounded-xl border bg-block-bg text-foreground text-sm font-semibold placeholder-text-muted/40 focus:outline-none transition-all
                      ${errors.phone && customer.phone !== '' ? 'border-red-500/50 focus:border-red-500' : 'border-card-border focus:border-[var(--accent)]'}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Địa chỉ giao hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customer.address}
                    onChange={set('address')}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                    className={`w-full h-10 px-3 rounded-xl border bg-block-bg text-foreground text-sm font-semibold placeholder-text-muted/40 focus:outline-none transition-all
                      ${errors.address && customer.address !== '' ? 'border-red-500/50 focus:border-red-500' : 'border-card-border focus:border-[var(--accent)]'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Email <span className="text-text-muted/70 font-normal">(tùy chọn)</span></label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={set('email')}
                    placeholder="email@example.com"
                    className="w-full h-10 px-3 rounded-xl border border-card-border bg-block-bg text-foreground text-sm placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Hình thức thanh toán</label>
                  <select
                    value={customer.payment_method}
                    onChange={set('payment_method')}
                    className="w-full h-10 px-3 rounded-xl border border-card-border bg-block-bg text-foreground text-sm font-semibold focus:outline-none focus:border-[var(--accent)] transition-all"
                  >
                    <option value="cod" className="bg-card-bg text-foreground">💵 COD — Thanh toán khi nhận hàng</option>
                    <option value="transfer" className="bg-card-bg text-foreground">🏦 Chuyển khoản trước</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">
                    Link file thiết kế chung <span className="text-text-muted/70 font-normal">(Google Drive, Dropbox… tùy chọn)</span>
                  </label>
                  <input
                    type="url"
                    value={customer.design_url}
                    onChange={set('design_url')}
                    placeholder="https://drive.google.com/..."
                    className="w-full h-10 px-3 rounded-xl border border-card-border bg-block-bg text-foreground text-sm placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Ghi chú đơn hàng</label>
                  <textarea
                    value={customer.note}
                    onChange={set('note')}
                    rows={2}
                    placeholder="Yêu cầu đặc biệt, thời gian cần giao, ghi chú cho shipper..."
                    className="w-full px-3 py-2.5 rounded-xl border border-card-border bg-block-bg text-foreground text-sm placeholder-text-muted/40 focus:outline-none focus:border-[var(--accent)] resize-none transition-all font-semibold"
                  />
                </div>

                <div className="sm:col-span-2 border-t border-card-border/40 pt-4 mt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={customer.request_vat}
                      onChange={(e) => setCustomer(prev => ({ ...prev, request_vat: e.target.checked }))}
                      className="w-4 h-4 rounded text-purple-600 border-card-border bg-block-bg focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-foreground">Yêu cầu xuất hóa đơn VAT (GTGT)</span>
                  </label>
                </div>

                {customer.request_vat && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Tên công ty / Đơn vị mua hàng <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={customer.vat_company_name}
                        onChange={(e) => setCustomer(prev => ({ ...prev, vat_company_name: e.target.value }))}
                        placeholder="Công ty TNHH Giải pháp Công nghệ ABC"
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-block-bg text-foreground text-sm font-semibold focus:outline-none focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Mã số thuế <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={customer.vat_tax_code}
                        onChange={(e) => setCustomer(prev => ({ ...prev, vat_tax_code: e.target.value }))}
                        placeholder="0102345678"
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-block-bg text-foreground text-sm font-semibold focus:outline-none focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Email nhận hóa đơn điện tử <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        required
                        value={customer.vat_email}
                        onChange={(e) => setCustomer(prev => ({ ...prev, vat_email: e.target.value }))}
                        placeholder="invoice@company.com"
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-block-bg text-foreground text-sm font-semibold focus:outline-none focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Địa chỉ đăng ký kinh doanh công ty <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={customer.vat_company_address}
                        onChange={(e) => setCustomer(prev => ({ ...prev, vat_company_address: e.target.value }))}
                        placeholder="Số 123, đường Nguyễn Trãi, Thanh Xuân, Hà Nội"
                        className="w-full h-10 px-3 rounded-xl border border-card-border bg-block-bg text-foreground text-sm font-semibold focus:outline-none focus:border-[var(--accent)] transition-all"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Products */}
            <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
              <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                Sản phẩm đặt in
              </h2>

              {items.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4 font-medium">Chưa có sản phẩm nào</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {items.map((item, i) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-block-bg border border-card-border">
                      <span className="text-xs text-text-muted w-5 shrink-0 pt-0.5 font-bold">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{item.product_label}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {item.quantity} {item.unit} · {formatCurrency(item.unit_price)}/{item.unit}
                          {item.note ? ` · ${item.note}` : ''}
                        </p>
                        {item.image_url && (
                          <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline mt-1.5 font-semibold flex items-center gap-1">
                            🖼 Xem ảnh mẫu
                          </a>
                        )}
                        {item.design_url && (
                          <a href={item.design_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1.5 font-semibold flex items-center gap-1">
                            📁 Xem file thiết kế
                          </a>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end justify-between h-full min-h-[60px]">
                        <p className="text-sm font-bold text-[var(--accent)] tabular-nums">{formatCurrency(item.subtotal)}</p>
                        <button
                          onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))}
                          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer shrink-0 mt-1"
                          title="Xoá sản phẩm"
                          aria-label="Xoá sản phẩm"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <AddItemForm onAdd={item => setItems(prev => [...prev, item])} />
            </div>

            {/* Error summary */}
            {result?.success === false && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-3.5 text-sm text-red-500 font-semibold">
                ⚠ {result.error}
              </div>
            )}
          </div>

          {/* RIGHT: Summary */}
          <div className="lg:sticky lg:top-20 space-y-4">
            <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
              <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                Tóm tắt đơn hàng
              </h2>

              {items.length === 0 ? (
                <p className="text-text-muted text-xs text-center py-6">Chưa có sản phẩm</p>
              ) : (
                <>
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs py-1.5 border-b border-card-border/40 last:border-0">
                      <span className="text-text-muted truncate mr-2 font-medium">{item.quantity} {item.unit} {item.product_label.split('(')[0]}</span>
                      <span className="text-foreground font-bold tabular-nums shrink-0">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-card-border space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted font-medium">Tạm tính</span>
                      <span className="text-foreground font-bold tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted font-medium">Vận chuyển</span>
                      {freeShip
                        ? <span className="text-green-600 font-bold text-xs">Miễn phí 🎉</span>
                        : <span className="text-foreground font-bold tabular-nums">{items.length > 0 ? formatCurrency(shippingFee) : '—'}</span>
                      }
                    </div>
                    {!freeShip && subtotal > 0 && (
                      <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 font-medium">
                        Thêm {formatCurrency(FREE_SHIP_THRESHOLD - subtotal)} để freeship 🚀
                      </p>
                    )}
                    <div className="flex justify-between pt-2 border-t border-card-border">
                      <span className="font-bold text-foreground">Tổng cộng</span>
                      <span className="font-black text-lg text-[var(--accent)] tabular-nums">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Validate hints */}
            <div className="rounded-xl border border-card-border bg-block-bg p-3.5 space-y-1.5 shadow-sm">
              {[
                { ok: !!customer.name.trim(), label: 'Tên khách hàng' },
                { ok: /^[0-9]{10,11}$/.test(customer.phone.replace(/\s/g, '')), label: 'Số điện thoại hợp lệ' },
                { ok: !!customer.address.trim(), label: 'Địa chỉ giao hàng' },
                { ok: items.length > 0, label: 'Ít nhất 1 sản phẩm' },
              ].map(({ ok, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className={ok ? 'text-green-500 font-bold' : 'text-slate-500'}>{ok ? '✓' : '○'}</span>
                  <span className={ok ? 'text-foreground/90 font-semibold' : 'text-slate-500 font-medium'}>{label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full h-12 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer
                bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500
                text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40
                disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang gửi...
                </span>
              ) : '🚀 Gửi đơn hàng'}
            </button>

            <div className="text-xs text-text-muted text-center space-y-1">
              <p>Giá chưa bao gồm VAT 8%</p>
              <p>Zalo (Ưu tiên): <a href="https://zalo.me/0822968412" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] font-bold hover:underline">0822.968.412</a></p>
              <p className="text-[10px]">Hotline: <a href="tel:0822968412" className="text-slate-500 hover:underline">0822.968.412</a> (Gọi khi cần gấp)</p>
            </div>
          </div>
        </div>
      </div>
      {/* Sticky Bottom Bar cho mobile khi điền form đặt hàng */}
      {items.length > 0 && !result && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-card-border p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe-bottom">
          <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
            <div>
              <span className="text-[10px] text-text-muted font-bold block uppercase">Tổng tiền đơn</span>
              <span className="font-black text-base text-[var(--accent)] tabular-nums">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="flex-1 max-w-[200px] h-10 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-650 to-fuchsia-650 text-white shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              {submitting ? 'Đang gửi...' : '🚀 Gửi đơn hàng'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
