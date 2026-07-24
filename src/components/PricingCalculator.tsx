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
import { useLanguage } from '@/context/LanguageContext';

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
  const { locale, t } = useLanguage();
  const minPrice = Math.min(...product.tiers.filter(t => t.price > 0).map(t => t.price));
  const fromText = locale === 'en' ? 'From' : 'Từ';
  const unitText = locale === 'en'
    ? (product.unitLabel === 'mét' ? 'm' : product.unitLabel === 'tờ' ? 'sheet' : 'pcs')
    : product.unitLabel;

  const shortLabel = locale === 'en'
    ? (product.shortLabel.includes('mét') ? 'Roll (60cm)' : product.shortLabel.includes('A4') ? 'A4 Sheet' : product.shortLabel.includes('A3') ? 'A3 Sheet' : product.shortLabel.includes('nhỏ') ? 'Small Sticker' : product.shortLabel.includes('trung') ? 'Medium Sticker' : product.shortLabel.includes('lớn') ? 'Large Sticker' : product.shortLabel)
    : product.shortLabel;

  const description = locale === 'en'
    ? (product.description.includes('khổ 60cm') ? 'Roll film print with custom gang sheet' : product.description.includes('20×28cm') ? 'A4 free layout arrangement' : product.description.includes('29×40cm') ? 'A3 sheet double the size of A4' : product.description.includes('3×3cm') ? 'Caps & small logo labels' : product.description.includes('5×5cm') ? 'For tumblers, glass & mugs' : product.description.includes('8×8cm') ? 'For helmets, motorbikes & laptops' : product.description)
    : product.description;

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
            {shortLabel}
          </p>
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{description}</p>
          <p className="text-xs text-[var(--accent)] font-semibold mt-1.5">
            {fromText} {formatCurrency(minPrice)}/{unitText}
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
  const { locale } = useLanguage();
  const tier = getActiveTier(product, qty);
  if (!tier || tier.price === 0) return null;
  const unitText = locale === 'en'
    ? (product.unitLabel === 'mét' ? 'm' : product.unitLabel === 'tờ' ? 'sheet' : 'pcs')
    : product.unitLabel;

  let labelText = tier.label;
  if (locale === 'en') {
    if (labelText.includes('Trên')) labelText = labelText.replace('Trên', 'Over ');
    if (labelText.includes('Dưới')) labelText = labelText.replace('Dưới', 'Under ');
    if (labelText.includes('Từ')) labelText = labelText.replace('Từ', 'From ');
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--accent-glow)] border border-[var(--accent)]/30 text-[var(--accent)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
      {labelText} — {formatCurrency(tier.price)}/{unitText}
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
  const { t, locale } = useLanguage();
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

    let productLabel = selectedProduct.label;
    if (locale === 'en') {
      if (productLabel.includes('mét')) productLabel = 'Roll film printing (60cm width)';
      else if (productLabel.includes('A4')) productLabel = 'A4 Sheet printing (20×28cm)';
      else if (productLabel.includes('A3')) productLabel = 'A3 Sheet printing (29×40cm)';
      else if (productLabel.includes('small') || productLabel.includes('nhỏ')) productLabel = 'Small stickers (under 3×3cm)';
      else if (productLabel.includes('medium') || productLabel.includes('trung')) productLabel = 'Medium stickers (4×4–5×5cm)';
      else if (productLabel.includes('large') || productLabel.includes('lớn')) productLabel = 'Large stickers (6×6–8×8cm)';
    }

    const unitName = locale === 'en'
      ? (selectedProduct.unit === 'mét' ? 'm' : selectedProduct.unit === 'tờ' ? 'sheet' : 'pcs')
      : selectedProduct.unit;

    const item: CartItem = {
      id: uid(),
      product_type: selectedProduct.type,
      product_label: productLabel,
      size_label: tier?.label ?? '',
      quantity: qty,
      unit: unitName,
      unit_price: unitPrice,
      subtotal,
      image_url: null,
      design_url: null,
      note: itemNote.trim() || null,
    };
    setCart(prev => [...prev, item]);
    setQuantity('1');
    setItemNote('');
  }, [qty, unitPrice, selectedProduct, subtotal, itemNote, locale]);

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const handlePrint = () => {
    setPrintLoading(true);
    setTimeout(() => {
      const printWin = window.open('', '_blank', 'width=900,height=700');
      if (!printWin) { setPrintLoading(false); return; }
      const locStr = locale === 'vi' ? 'vi-VN' : 'en-US';
      const date = new Date().toLocaleDateString(locStr, { day: '2-digit', month: '2-digit', year: 'numeric' });
      const expiry = new Date(Date.now() + 30 * 86400e3).toLocaleDateString(locStr, { day: '2-digit', month: '2-digit', year: 'numeric' });
      const fmt = (n: number) => new Intl.NumberFormat(locStr).format(n) + ' ₫';
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
      printWin.document.write(`<!DOCTYPE html><html lang="${locale}"><head>
        <meta charset="UTF-8"/>
        <title>${t('calculator.printDocTitle')}</title>
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
              <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">${t('calculator.docPublisher')}</p>
              <p style="font-weight:900;font-size:12px;color:#1e293b">${t('calculator.docCompany')}</p>
              <p style="font-size:10px;color:#64748b;margin-top:2px">Zalo / Hotline: <strong style="color:#1e293b">0822.968.412</strong></p>
              <p style="font-size:10px;color:#64748b">Email: gmkt2303@gmail.com</p>
            </div>
          </div>
          <div style="text-align:right">
            <h1 style="font-size:22px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:-0.02em">${t('calculator.printDocTitle')}</h1>
            <p style="font-size:11px;font-weight:700;color:#ec4899;margin-top:2px">${t('calculator.docEstimateNotice')}</p>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:3px">
              <p style="font-size:10px;color:#64748b"><span style="font-weight:700;color:#334155">${t('calculator.docCreateDate')}</span> ${date}</p>
              <p style="font-size:10px;color:#64748b"><span style="font-weight:700;color:#334155">${t('calculator.docExpiryDate')}</span> ${expiry}</p>
            </div>
          </div>
        </div>

        <!-- BẢNG SẢN PHẨM -->
        <div style="padding:0 32px 24px">
          <table style="width:100%;border-collapse:collapse;margin-top:24px">
            <thead>
              <tr style="background:#1e293b;color:#fff">
                <th style="padding:10px;text-align:center;font-weight:700;width:36px">${t('calculator.docItemNo')}</th>
                <th style="padding:10px;text-align:left;font-weight:700">${t('calculator.docProduct')}</th>
                <th style="padding:10px;text-align:center;font-weight:700">${t('calculator.docQty')}</th>
                <th style="padding:10px;text-align:right;font-weight:700">${t('calculator.docPrice')}</th>
                <th style="padding:10px;text-align:right;font-weight:700;background:#db2777">${t('calculator.docSubtotal')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <!-- TỔNG + BANK -->
        <div style="padding:0 32px 32px;display:flex;gap:24px;align-items:flex-start">

          <!-- Thông tin thanh toán -->
          <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px">
            <p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">${t('calculator.docPaymentInfo')}</p>
            <div style="display:flex;gap:8px;margin-bottom:6px">
              <span style="color:#64748b;width:80px;flex-shrink:0;font-size:11px">${t('calculator.docBank')}</span>
              <span style="font-weight:700;color:#1e293b;font-size:11px">Vietinbank</span>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:6px">
              <span style="color:#64748b;width:80px;flex-shrink:0;font-size:11px">${t('calculator.docAccountNo')}</span>
              <span style="font-weight:900;color:#ec4899;font-size:14px;letter-spacing:0.06em">110602191866</span>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <span style="color:#64748b;width:80px;flex-shrink:0;font-size:11px">${t('calculator.docAccountName')}</span>
              <span style="font-weight:700;color:#1e293b;text-transform:uppercase;font-size:11px">CÔNG TY TNHH GMKT VIỆT NAM</span>
            </div>
            <p style="font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;line-height:1.6">
              ✅ ${t('calculator.freeShipSub')}<br/>
              📋 ${t('common.vatExcludeNotice')}.<br/>
              🎨 Format: AI, PDF, CDR, EPS. Max width 58cm (60cm film).<br/>
              ⚡ Fast dispatch within 24h.
            </p>
          </div>

          <!-- Bảng tổng -->
          <div style="width:260px">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px">
              <span style="color:#64748b">${t('calculator.subtotal')} (${cart.length} items):</span>
              <span style="font-weight:600;color:#1e293b">${fmt(cartSubtotal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:12px">
              <span style="color:#64748b">${t('calculator.shippingFee')}:</span>
              <span style="font-weight:600;color:${freeShip ? '#16a34a' : '#1e293b'}">${freeShip ? t('calculator.free') : fmt(shippingFee)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e293b;color:#fff;border-radius:12px;margin-top:12px">
              <span style="font-weight:700;font-size:13px">${t('calculator.docTotalPayable')}</span>
              <span style="font-weight:900;font-size:18px;color:#f9a8d4">${fmt(total)}</span>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="background:#1e293b;padding:14px 32px;display:flex;justify-content:space-between;align-items:center">
          <p style="color:#94a3b8;font-size:10px">UV DTF Workshop – PrinK Tech · gmkt2303@gmail.com</p>
          <p style="color:#94a3b8;font-size:10px">Hotline: 0822.968.412</p>
          <p style="color:#94a3b8;font-size:10px">${t('calculator.docThanks')}</p>
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
            {t('calculator.step1Title')}
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
            {t('calculator.step2Title')}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1">
              <label htmlFor="quantity-input" className="sr-only">{t('calculator.quantityInputLabel')}</label>
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
                  {locale === 'en' ? (selectedProduct.unitLabel === 'mét' ? 'm' : selectedProduct.unitLabel === 'tờ' ? 'sheet' : 'pcs') : selectedProduct.unitLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-block-bg px-4 h-11 rounded-xl border border-card-border shrink-0">
              <span className="text-xs font-medium text-text-muted">{t('calculator.unitPriceLabel')}</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {unitPrice > 0 ? `${formatCurrency(unitPrice)}/${locale === 'en' ? (selectedProduct.unitLabel === 'mét' ? 'm' : selectedProduct.unitLabel === 'tờ' ? 'sheet' : 'pcs') : selectedProduct.unitLabel}` : '—'}
              </span>
            </div>
          </div>

          {/* Tier badge */}
          <div className="mt-3.5 flex flex-wrap gap-2 items-center">
            <TierBadge product={selectedProduct} qty={qty} />
            {qty < selectedProduct.minQty && (
              <span className="text-xs text-red-500 font-medium">
                {t('calculator.minQtyWarning', { min: selectedProduct.minQty, unit: locale === 'en' ? (selectedProduct.unitLabel === 'mét' ? 'm' : selectedProduct.unitLabel === 'tờ' ? 'sheet' : 'pcs') : selectedProduct.unitLabel })}
              </span>
            )}
          </div>
        </div>

        {/* Note & Add to cart */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
            {t('calculator.step3Title')}
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="item-note" className="sr-only">Note</label>
              <input
                id="item-note"
                type="text"
                value={itemNote}
                onChange={e => setItemNote(e.target.value)}
                placeholder={t('calculator.notePlaceholder')}
                className="w-full h-11 px-4 rounded-xl border border-card-border bg-block-bg text-sm text-foreground focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              onClick={addToCart}
              disabled={isInvalid}
              className="w-full h-11 rounded-xl text-sm font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md shadow-[var(--accent)]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {t('calculator.addToListBtn')}
            </button>
          </div>
        </div>

        {/* Tier table */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
            {t('calculator.tierTableTitle', { product: locale === 'en' ? (selectedProduct.shortLabel.includes('mét') ? 'Roll (60cm)' : selectedProduct.shortLabel.includes('A4') ? 'A4 Sheet' : selectedProduct.shortLabel.includes('A3') ? 'A3 Sheet' : selectedProduct.shortLabel) : selectedProduct.shortLabel })}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left pb-2.5 text-xs text-text-muted font-bold">{t('calculator.tierQtyHeader')}</th>
                  <th className="text-right pb-2.5 text-xs text-text-muted font-bold">{t('calculator.tierPriceHeader')}</th>
                  <th className="text-right pb-2.5 text-xs text-text-muted font-bold">{t('calculator.tierStatusHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {selectedProduct.tiers.map((tier, i) => {
                  const isActive = getActiveTier(selectedProduct, qty)?.min === tier.min;
                  let tierLabel = tier.label;
                  if (locale === 'en') {
                    if (tierLabel.includes('Trên')) tierLabel = tierLabel.replace('Trên', 'Over ');
                    if (tierLabel.includes('Dưới')) tierLabel = tierLabel.replace('Dưới', 'Under ');
                    if (tierLabel.includes('Từ')) tierLabel = tierLabel.replace('Từ', 'From ');
                  }

                  return (
                    <tr
                      key={i}
                      className={`border-b border-card-border/40 last:border-0 transition-colors ${isActive ? 'bg-[var(--accent-glow)]' : i % 2 === 1 ? 'bg-block-bg/30' : ''}`}
                    >
                      <td className={`py-2.5 pr-4 ${isActive ? 'text-[var(--accent)] font-bold' : 'text-text-muted font-medium'}`}>
                        {tierLabel}
                      </td>
                      <td className={`py-2.5 text-right tabular-nums ${isActive ? 'text-foreground font-black' : 'text-foreground/80 font-semibold'}`}>
                        {tier.price > 0 ? `${formatCurrency(tier.price)}/${locale === 'en' ? (selectedProduct.unitLabel === 'mét' ? 'm' : selectedProduct.unitLabel === 'tờ' ? 'sheet' : 'pcs') : selectedProduct.unitLabel}` : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {isActive ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 font-semibold">
                            {t('calculator.tierApplied')}
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
              {t('calculator.cartTitle', { count: cart.length })}
            </h2>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-text-muted hover:text-red-500 font-bold transition-colors cursor-pointer"
              >
                {t('calculator.clearAll')}
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-text-muted text-sm font-medium">{t('calculator.emptyCartTitle')}</p>
              <p className="text-text-muted/70 text-xs mt-1">{t('calculator.emptyCartSub')}</p>
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
                  <span className="text-text-muted font-medium">{t('calculator.subtotal')}</span>
                  <span className="text-foreground font-bold tabular-nums">{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted font-medium">{t('calculator.shippingFee')}</span>
                  {freeShip ? (
                    <span className="text-green-500 font-semibold">{t('calculator.free')}</span>
                  ) : (
                    <span className="text-foreground font-semibold tabular-nums">{cartSubtotal > 0 ? formatCurrency(shippingFee) : '—'}</span>
                  )}
                </div>
                {!freeShip && cartSubtotal > 0 && (
                  <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 font-medium">
                    {t('calculator.addMoreForFreeShip', { amount: formatCurrency(FREE_SHIP_THRESHOLD - cartSubtotal) })}
                  </p>
                )}
                <div className="flex justify-between pt-2 border-t border-card-border">
                  <span className="font-bold text-foreground">{t('calculator.total')}</span>
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
                    {printLoading ? t('calculator.exportingPdf') : t('calculator.exportPdfBtn')}
                  </button>
                  <p className="text-[10px] text-amber-500 text-center italic mt-1.5 md:hidden">
                    {t('calculator.pdfMobileNotice')}
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
                  {t('calculator.orderNowBtn')}
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
              {t('calculator.freeShipTitle')}
            </p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              {t('calculator.freeShipSub')}
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-xl border border-card-border bg-block-bg p-3.5 text-xs text-text-muted space-y-1 shadow-sm">
          <p className="text-foreground font-bold">{t('common.supportTitle')}</p>
          <p>💬 Zalo / WhatsApp: <a href="https://zalo.me/0822968412" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] font-bold hover:underline">0822.968.412</a></p>
          <p>📞 Hotline: <a href="tel:0822968412" className="text-slate-500 font-bold hover:underline">0822.968.412</a></p>
          <p className="text-[10px] text-text-muted/80">{t('common.vatExcludeNotice')}</p>
        </div>
      </div>

    </div>
  );
}


