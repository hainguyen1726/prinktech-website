'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  PRODUCTS,
  Product,
  OrderItem,
  FREE_SHIP_THRESHOLD,
  SHIPPING_FEE_STANDARD,
  getUnitPrice,
  getActiveTier,
  formatCurrency,
  convertPriceItemsToProducts,
} from '@/lib/pricing';

/* ─── Types ─────────────────────────────────────────────── */
type CartItem = OrderItem & { id: string };

/* ─── Helpers ────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/* ─── Sub-components ─────────────────────────────────────── */
function ProductCard({
  product,
  active,
  onClick,
}: {
  product: Product;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left p-4 rounded-2xl border transition-all duration-200 group cursor-pointer
        ${active
          ? 'border-[var(--accent)] bg-[var(--accent-glow)] shadow-lg shadow-purple-500/10'
          : 'border-card-border bg-block-bg hover:border-[var(--accent)]/40 hover:bg-card-bg'
        }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{product.icon}</span>
        <div className="min-w-0">
          <p className={`font-semibold text-sm leading-snug ${active ? 'text-[var(--accent)] font-bold' : 'text-foreground'}`}>
            {product.shortLabel}
          </p>
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{product.description}</p>
          <p className="text-xs text-[var(--accent)] font-semibold mt-1.5">
            Từ {formatCurrency(Math.min(...product.tiers.filter(t => t.price > 0).map(t => t.price)))}/{product.unitLabel}
          </p>
        </div>
      </div>
      {active && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--accent)] shadow shadow-purple-400/60" />
      )}
    </button>
  );
}

function TierBadge({ product, qty }: { product: Product; qty: number }) {
  const tier = getActiveTier(product, qty);
  if (!tier || tier.price === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--accent-glow)] border border-[var(--accent)]/30 text-[var(--accent)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
      {tier.label} — {formatCurrency(tier.price)}/{product.unitLabel}
    </span>
  );
}

function CartRow({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-card-border last:border-0 group">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{item.product_label}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
          {item.note ? ` · ${item.note}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-bold text-[var(--accent)] tabular-nums">
          {formatCurrency(item.subtotal)}
        </span>
        <button
          onClick={() => onRemove(item.id)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer shrink-0"
          aria-label="Xoá sản phẩm khỏi báo giá"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function PricingCalculator({ priceItems }: { priceItems?: any[] }) {
  const [activeProducts, setActiveProducts] = useState<Product[]>(() => {
    return priceItems && priceItems.length > 0 ? convertPriceItemsToProducts(priceItems) : PRODUCTS;
  });

  useEffect(() => {
    if (priceItems && priceItems.length > 0) {
      setActiveProducts(convertPriceItemsToProducts(priceItems));
    } else {
      fetch('/api/web/price-items')
        .then(res => res.json())
        .then(data => {
          if (data?.priceItems && data.priceItems.length > 0) {
            setActiveProducts(convertPriceItemsToProducts(data.priceItems));
          }
        })
        .catch(() => {});
    }
  }, [priceItems]);

  const [selectedProduct, setSelectedProduct] = useState<Product>(activeProducts[0] || PRODUCTS[0]);

  useEffect(() => {
    if (activeProducts.length > 0) {
      const match = activeProducts.find(p => p.type === selectedProduct.type) || activeProducts[0];
      setSelectedProduct(match);
    }
  }, [activeProducts]);

  const [quantity, setQuantity] = useState<string>('1');
  const [itemNote, setItemNote] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [printLoading, setPrintLoading] = useState(false);


  const qty = parseFloat(quantity) || 0;
  const unitPrice = getUnitPrice(selectedProduct, qty);
  const subtotal = unitPrice * qty;

  const cartSubtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const freeShip = cartSubtotal >= FREE_SHIP_THRESHOLD;
  const shippingFee = freeShip ? 0 : cartSubtotal > 0 ? SHIPPING_FEE_STANDARD : 0;
  const total = cartSubtotal + shippingFee;

  const addToCart = useCallback(() => {
    if (qty <= 0 || unitPrice === 0) return;
    const tier = getActiveTier(selectedProduct, qty);
    const item: CartItem = {
      id: uid(),
      product_type: selectedProduct.type,
      product_label: selectedProduct.label,
      size_label: tier?.label ?? '',
      quantity: qty,
      unit: selectedProduct.unit,
      unit_price: unitPrice,
      subtotal,
      image_url: null,
      design_url: null,
      note: itemNote.trim() || null,
    };
    setCart(prev => [...prev, item]);
    setQuantity('1');
    setItemNote('');
  }, [qty, unitPrice, selectedProduct, subtotal, itemNote]);

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const handlePrint = () => {
    setPrintLoading(true);
    setTimeout(() => {
      const printWin = window.open('', '_blank', 'width=900,height=700');
      if (!printWin) { setPrintLoading(false); return; }
      const date = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const expiry = new Date(Date.now() + 30 * 86400e3).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
      const rows = cart.map((item, i) => `
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
        <meta charset="UTF-8"/>
        <title>Báo giá – PrinK Tech</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Inter',Arial,sans-serif;background:#f8fafc;color:#1e293b;font-size:12px}
          .doc{max-width:820px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12)}
          @media print{body{background:#fff}.doc{margin:0;border-radius:0;box-shadow:none;max-width:100%}@page{size:A4;margin:12mm 10mm}}
        </style>
      </head><body><div class="doc">

        <!-- HEADER -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:28px 32px 20px;border-bottom:2.5px solid #ec4899">
          <div style="display:flex;align-items:flex-start;gap:16px">
            <img src="${window.location.origin}/logo-horizontal-dark-text.png" alt="PrinK Tech" style="height:48px;object-fit:contain" onerror="this.style.display='none'"/>
            <div style="border-left:2px solid #e2e8f0;padding-left:14px;margin-left:4px">
              <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Đơn vị phát hành</p>
              <p style="font-weight:900;font-size:12px;color:#1e293b">XƯỞNG IN UV DTF – PRINK TECH</p>
              <p style="font-size:10px;color:#64748b;margin-top:2px">Zalo (Ưu tiên) / Hotline: <strong style="color:#1e293b">0822.968.412</strong></p>
              <p style="font-size:10px;color:#64748b">Email: gmkt2303@gmail.com</p>
            </div>
          </div>
          <div style="text-align:right">
            <h1 style="font-size:22px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:-0.02em">BÁO GIÁ</h1>
            <p style="font-size:11px;font-weight:700;color:#ec4899;margin-top:2px">Yêu cầu thanh toán dự kiến</p>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:3px">
              <p style="font-size:10px;color:#64748b"><span style="font-weight:700;color:#334155">Ngày lập:</span> ${date}</p>
              <p style="font-size:10px;color:#64748b"><span style="font-weight:700;color:#334155">Hiệu lực đến:</span> ${expiry}</p>
            </div>
          </div>
        </div>

        <!-- BẢNG SẢN PHẨM -->
        <div style="padding:0 32px 24px">
          <table style="width:100%;border-collapse:collapse;margin-top:24px">
            <thead>
              <tr style="background:#1e293b;color:#fff">
                <th style="padding:10px;text-align:center;font-weight:700;width:36px">STT</th>
                <th style="padding:10px;text-align:left;font-weight:700">Sản phẩm</th>
                <th style="padding:10px;text-align:center;font-weight:700">Số lượng</th>
                <th style="padding:10px;text-align:right;font-weight:700">Đơn giá</th>
                <th style="padding:10px;text-align:right;font-weight:700;background:#db2777">Thành tiền</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <!-- TỔNG + BANK -->
        <div style="padding:0 32px 32px;display:flex;gap:24px;align-items:flex-start">

          <!-- Thông tin thanh toán -->
          <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px">
            <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Thông tin thanh toán</p>
            <div style="display:flex;gap:8px;margin-bottom:6px">
              <span style="color:#64748b;width:80px;flex-shrink:0;font-size:11px">Ngân hàng:</span>
              <span style="font-weight:700;color:#1e293b;font-size:11px">Vietinbank</span>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:6px">
              <span style="color:#64748b;width:80px;flex-shrink:0;font-size:11px">Số TK:</span>
              <span style="font-weight:900;color:#ec4899;font-size:14px;letter-spacing:0.06em">110602191866</span>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <span style="color:#64748b;width:80px;flex-shrink:0;font-size:11px">Chủ TK:</span>
              <span style="font-weight:700;color:#1e293b;text-transform:uppercase;font-size:11px">CÔNG TY TNHH GMKT VIỆT NAM</span>
            </div>
            <p style="font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;line-height:1.6">
              ✅ Miễn phí vận chuyển toàn quốc cho đơn từ {formatCurrency(FREE_SHIP_THRESHOLD)}<br/>
              📋 Giá chưa bao gồm VAT 8%. Hóa đơn VAT xuất theo yêu cầu.<br/>
              🎨 File thiết kế: AI, PDF, CDR, EPS. Khổ ghép 58cm (film 60cm).<br/>
              ⚡ Cam kết hoàn thành trong 24h từ khi chốt file thiết kế.
            </p>
          </div>

          <!-- Bảng tổng -->
          <div style="width:260px">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px">
              <span style="color:#64748b">Tạm tính (${cart.length} sản phẩm):</span>
              <span style="font-weight:600;color:#1e293b">${fmt(cartSubtotal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px">
              <span style="color:#64748b">Phí vận chuyển:</span>
              <span style="font-weight:600;color:${freeShip ? '#16a34a' : '#1e293b'}">${freeShip ? 'Miễn phí 🎉' : fmt(shippingFee)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e293b;color:#fff;border-radius:12px;margin-top:12px">
              <span style="font-weight:700;font-size:13px">TỔNG PHẢI TRẢ:</span>
              <span style="font-weight:900;font-size:18px;color:#f9a8d4">${fmt(total)}</span>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="background:#1e293b;padding:14px 32px;display:flex;justify-content:space-between;align-items:center">
          <p style="color:#94a3b8;font-size:10px">Xưởng in UV DTF – PrinK Tech · gmkt2303@gmail.com</p>
          <p style="color:#94a3b8;font-size:10px">Hotline: 0822.968.412</p>
          <p style="color:#94a3b8;font-size:10px">Chân thành cảm ơn quý khách! 🙏</p>
        </div>

      </div>
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
      printWin.document.close();
      setPrintLoading(false);
    }, 300);
  };

  const isInvalid = qty < selectedProduct.minQty || unitPrice === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

      {/* ── LEFT: Configurator ── */}
      <div className="space-y-6">

        {/* Product selector */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
            1 — Chọn loại sản phẩm
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeProducts.map(p => (
              <ProductCard
                key={p.type}
                product={p}
                active={selectedProduct.type === p.type}
                onClick={() => {
                  setSelectedProduct(p);
                  setQuantity(String(p.minQty));
                }}
              />
            ))}
          </div>
        </div>

        {/* Quantity + Price */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
            2 — Nhập số lượng
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1">
              <label htmlFor="quantity-input" className="sr-only">Số lượng</label>
              <div className="relative">
                <input
                  id="quantity-input"
                  type="number"
                  min={selectedProduct.minQty}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-card-border bg-block-bg text-foreground font-semibold focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted uppercase">
                  {selectedProduct.unitLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-block-bg px-4 h-11 rounded-xl border border-card-border shrink-0">
              <span className="text-xs font-medium text-text-muted">Đơn giá:</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {unitPrice > 0 ? `${formatCurrency(unitPrice)}/${selectedProduct.unitLabel}` : '—'}
              </span>
            </div>
          </div>

          {/* Tier badge */}
          <div className="mt-3.5 flex flex-wrap gap-2 items-center">
            <TierBadge product={selectedProduct} qty={qty} />
            {qty < selectedProduct.minQty && (
              <span className="text-xs text-red-500 font-medium">
                ⚠️ Tối thiểu {selectedProduct.minQty} {selectedProduct.unitLabel}
              </span>
            )}
          </div>
        </div>

        {/* Note & Add to cart */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
            3 — Ghi chú & Thêm vào báo giá
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="item-note" className="sr-only">Ghi chú cho mẫu in</label>
              <input
                id="item-note"
                type="text"
                value={itemNote}
                onChange={e => setItemNote(e.target.value)}
                placeholder="Ví dụ: Decal 3D dán cốc giữ nhiệt, nhũ vàng, cắt sẵn..."
                className="w-full h-11 px-4 rounded-xl border border-card-border bg-block-bg text-sm text-foreground focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              onClick={addToCart}
              disabled={isInvalid}
              className="w-full h-11 rounded-xl text-sm font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md shadow-[var(--accent)]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              ➕ Thêm vào danh sách báo giá
            </button>
          </div>
        </div>

        {/* Tier table */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
            Bảng giá bậc thang — {selectedProduct.shortLabel}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left pb-2.5 text-xs text-text-muted font-bold">Số lượng</th>
                  <th className="text-right pb-2.5 text-xs text-text-muted font-bold">Đơn giá</th>
                  <th className="text-right pb-2.5 text-xs text-text-muted font-bold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {selectedProduct.tiers.map((tier, i) => {
                  const isActive = getActiveTier(selectedProduct, qty)?.min === tier.min;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-card-border/40 last:border-0 transition-colors ${isActive ? 'bg-[var(--accent-glow)]' : i % 2 === 1 ? 'bg-block-bg/30' : ''}`}
                    >
                      <td className={`py-2.5 pr-4 ${isActive ? 'text-[var(--accent)] font-bold' : 'text-text-muted font-medium'}`}>
                        {tier.label}
                      </td>
                      <td className={`py-2.5 text-right tabular-nums ${isActive ? 'text-foreground font-black' : 'text-foreground/80 font-semibold'}`}>
                        {tier.price > 0 ? `${formatCurrency(tier.price)}/${selectedProduct.unitLabel}` : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {isActive ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 font-semibold">
                            Đang áp dụng
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedProduct.note && (
            <p className="mt-3 text-xs text-text-muted italic">* {selectedProduct.note}</p>
          )}
        </div>

      </div>

      {/* ── RIGHT: Summary Cart ── */}
      <div className="lg:sticky lg:top-20 space-y-6">
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Báo giá của bạn ({cart.length})
            </h2>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-text-muted hover:text-red-500 font-bold transition-colors cursor-pointer"
              >
                Xoá tất cả
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-text-muted text-sm font-medium">Chưa có sản phẩm nào</p>
              <p className="text-text-muted/70 text-xs mt-1">Thêm sản phẩm từ bên trái</p>
            </div>
          ) : (
            <>
              <div className="max-h-[300px] overflow-y-auto pr-1">
                {cart.map(item => (
                  <CartRow key={item.id} item={item} onRemove={removeItem} />
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-card-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted font-medium">Tạm tính</span>
                  <span className="text-foreground font-bold tabular-nums">{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted font-medium">Phí vận chuyển</span>
                  {freeShip ? (
                    <span className="text-green-500 font-semibold">Miễn phí 🎉</span>
                  ) : (
                    <span className="text-foreground font-semibold tabular-nums">{cartSubtotal > 0 ? formatCurrency(shippingFee) : '—'}</span>
                  )}
                </div>
                {!freeShip && cartSubtotal > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 font-medium">
                    Thêm {formatCurrency(FREE_SHIP_THRESHOLD - cartSubtotal)} nữa để được miễn ship 🚀
                  </p>
                )}
                <div className="flex justify-between pt-2 border-t border-card-border">
                  <span className="font-bold text-foreground">Tổng cộng</span>
                  <span className="font-black text-lg text-[var(--accent)] tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 space-y-2.5">
                <div>
                  <button
                    onClick={handlePrint}
                    disabled={printLoading}
                    className="w-full h-10 rounded-xl text-sm font-bold cursor-pointer
                      bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500
                      text-white shadow-md shadow-purple-500/20 transition-all disabled:opacity-60 animate-pulse"
                  >
                    {printLoading ? 'Đang xuất...' : '⬇ Xuất báo giá PDF'}
                  </button>
                  <p className="text-[10px] text-amber-500 text-center italic mt-1.5 md:hidden">
                    * Lưu ý di động: Hãy cho phép hiển thị popup/cửa sổ bật lên để xem bản PDF.
                  </p>
                </div>
                <Link
                  href={{
                    pathname: '/dat-hang',
                    query: { quote: encodeURIComponent(JSON.stringify(cart)) },
                  }}
                  className="w-full h-10 rounded-xl text-sm font-bold border border-[var(--accent)]/40
                    text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all flex items-center justify-center"
                >
                  Đặt hàng ngay →
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Free ship notice */}
        <div className="rounded-xl border border-green-500/30 bg-green-550/5 p-3.5 flex items-start gap-2.5 shadow-sm">
          <span className="text-xl shrink-0">🚀</span>
          <div>
            <p className="text-xs font-bold text-green-600">
              MIỄN PHÍ VẬN CHUYỂN TOÀN QUỐC
            </p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Đơn hàng từ {formatCurrency(FREE_SHIP_THRESHOLD)} · COD toàn quốc · Giao trong 24h
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-xl border border-card-border bg-block-bg p-3.5 text-xs text-text-muted space-y-1 shadow-sm">
          <p className="text-foreground font-bold">Cần hỗ trợ tư vấn?</p>
          <p>💬 Zalo (Ưu tiên): <a href="https://zalo.me/0822968412" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] font-bold hover:underline">0822.968.412</a></p>
          <p>📞 Hotline: <a href="tel:0822968412" className="text-slate-500 font-bold hover:underline">0822.968.412</a> (Gọi khi cần gấp)</p>
          <p className="text-[10px] text-text-muted/80">Giá chưa bao gồm VAT 8%</p>
        </div>
      </div>

    </div>
  );
}


