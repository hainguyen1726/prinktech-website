'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import PricingCalculator from '@/components/PricingCalculator';
import Header from '@/components/Header';
import { useLanguage } from '@/context/LanguageContext';

const DEFAULT_PRICE_ITEMS = [
  {
    material_name: 'In theo mét dài (Khổ 60cm)',
    unit: 'mét',
    price_sheet: [
      { min: 1, max: 1.9, price: 290000 },
      { min: 2, max: 4.9, price: 250000 },
      { min: 5, max: 14.9, price: 220000 },
      { min: 15, max: 49.9, price: 190000 },
      { min: 50, max: 80, price: 160000 },
      { min: 80.1, max: null, price: 145000 },
    ]
  },
  {
    material_name: 'In tờ A4 (20×28cm)',
    unit: 'tờ',
    price_sheet: [
      { min: 1, max: 4, price: 45000 },
      { min: 5, max: 49, price: 39000 },
      { min: 50, max: null, price: 28000 },
    ]
  },
  {
    material_name: 'In tờ A3 (29×40cm)',
    unit: 'tờ',
    price_sheet: [
      { min: 1, max: 4, price: 80000 },
      { min: 5, max: 49, price: 65000 },
      { min: 50, max: null, price: 50000 },
    ]
  },
  {
    material_name: 'Tem nhỏ (dưới 3×3cm) – Cắt bế sẵn',
    unit: 'chiếc',
    price_sheet: [
      { min: 20, max: 49, price: 2500 },
      { min: 50, max: 100, price: 1600 },
      { min: 200, max: 999, price: 1100 },
      { min: 1000, max: null, price: 500 },
    ]
  },
  {
    material_name: 'Tem trung bình (4×4–5×5cm) – Cắt bế sẵn',
    unit: 'chiếc',
    price_sheet: [
      { min: 20, max: 49, price: 4000 },
      { min: 50, max: 199, price: 2800 },
      { min: 200, max: 999, price: 1900 },
      { min: 1000, max: null, price: 1300 },
    ]
  },
  {
    material_name: 'Tem lớn (6×6–8×8cm) – Cắt bế sẵn',
    unit: 'chiếc',
    price_sheet: [
      { min: 20, max: 49, price: 7000 },
      { min: 50, max: 199, price: 4800 },
      { min: 200, max: 999, price: 3200 },
      { min: 1000, max: null, price: 2400 },
    ]
  }
];

export default function BaoGiaContent({ initialPriceItems = [] }: { initialPriceItems?: any[] }) {
  const { t, locale } = useLanguage();
  const [activeTheme, setActiveTheme] = useState<'tech' | 'creative' | 'elegant'>('elegant');
  const [priceItems, setPriceItems] = useState<any[]>(() => {
    return initialPriceItems.length > 0 ? initialPriceItems : DEFAULT_PRICE_ITEMS;
  });

  // Khởi tạo theme từ localStorage ở client-side
  useEffect(() => {
    const savedTheme = localStorage.getItem('prinktech-theme') || 'elegant';
    if (savedTheme === 'tech' || savedTheme === 'creative' || savedTheme === 'elegant') {
      setActiveTheme(savedTheme);
    }
  }, []);

  // Fetch priceItems if not provided initially
  useEffect(() => {
    if (initialPriceItems.length > 0) {
      setPriceItems(initialPriceItems);
    } else {
      fetch('/api/web/price-items')
        .then(res => res.json())
        .then(data => {
          if (data?.priceItems && data.priceItems.length > 0) {
            setPriceItems(data.priceItems);
          }
        })
        .catch(err => console.error('Lỗi fetch price-items ở bao-gia:', err));
    }
  }, [initialPriceItems]);

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

  const activeItems = priceItems.length > 0 ? priceItems : DEFAULT_PRICE_ITEMS;

  const getTranslatedItemName = (name: string) => {
    if (locale === 'vi') return name;
    if (name.includes('mét')) return 'Roll film printing (60cm width)';
    if (name.includes('A4')) return 'A4 Sheet printing (20×28cm)';
    if (name.includes('A3')) return 'A3 Sheet printing (29×40cm)';
    if (name.includes('Tem nhỏ')) return 'Small stickers (under 3×3cm) – Pre-cut';
    if (name.includes('Tem trung bình')) return 'Medium stickers (4×4–5×5cm) – Pre-cut';
    if (name.includes('Tem lớn')) return 'Large stickers (6×6–8×8cm) – Pre-cut';
    return name;
  };

  const getTranslatedUnit = (unit: string) => {
    if (locale === 'vi') return unit;
    if (unit === 'mét') return t('quote.meterUnit');
    if (unit === 'tờ') return t('quote.sheetUnit');
    if (unit === 'chiếc') return t('quote.pieceUnit');
    return unit;
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* ── Navbar ── */}
      <Header activeTheme={activeTheme} setActiveTheme={setActiveTheme} />

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-xs text-text-muted font-medium">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">{t('common.home')}</Link>
          <ChevronRight size={10} className="text-text-muted/65" />
          <span>{t('quote.title')} & {t('common.pricing')}</span>
        </div>

        {/* Page Title */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {t('quote.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500">
                {t('quote.titleAccent')}
              </span>
            </h1>
            <p className="text-text-muted mt-2 text-sm">
              {t('quote.subTitle')}
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
              {t('quote.createCalculatorBtn')}
            </a>
          </div>
        </div>

        {/* Pricing table */}
        <div className="mb-12">
          <div className="overflow-x-auto rounded-2xl border border-card-border bg-card-bg shadow-sm">
            <table className="w-full text-sm border-collapse border border-card-border">
              <thead>
                <tr className="bg-block-bg/50 text-foreground text-left">
                  <th className="px-4 md:px-6 py-4 font-bold border border-card-border">{t('quote.productHeader')}</th>
                  <th className="text-center px-3 py-4 font-bold w-20 border border-card-border">{t('quote.unitHeader')}</th>
                  <th className="px-4 md:px-6 py-4 font-bold border border-card-border">{t('quote.quantityHeader')}</th>
                  <th className="px-4 md:px-6 py-4 font-bold border border-card-border text-right">{t('quote.priceHeader')}</th>
                  <th className="px-4 md:px-6 py-4 font-bold text-right border border-card-border">{t('quote.noteHeader')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40 text-foreground/90">
                {activeItems.map((item, itemIdx) => {
                  const priceSheet = Array.isArray(item.price_sheet)
                    ? item.price_sheet
                    : (typeof item.price_sheet === 'string' ? JSON.parse(item.price_sheet) : []);
                  const ranges = priceSheet;
                  const isHighlight = item.material_name?.toLowerCase().includes('mét');

                  let subDesc = '';
                  if (item.material_name.includes('A4')) subDesc = t('quote.a4SubDesc');
                  else if (item.material_name.includes('A3')) subDesc = t('quote.a3SubDesc');
                  else if (item.material_name.toLowerCase().includes('nhỏ')) subDesc = t('quote.smallStickerSubDesc');
                  else if (item.material_name.toLowerCase().includes('trung bình')) subDesc = t('quote.midStickerSubDesc');
                  else if (item.material_name.toLowerCase().includes('lớn')) subDesc = t('quote.largeStickerSubDesc');
                  else if (isHighlight) subDesc = t('quote.meterSubDesc');

                  let noteText = '';
                  if (item.material_name.includes('A4')) noteText = t('quote.a4Note');
                  else if (item.material_name.includes('A3')) noteText = t('quote.a3Note');
                  else if (item.material_name.toLowerCase().includes('tem')) noteText = t('quote.stickerNote');
                  else if (isHighlight) noteText = t('quote.meterNote');

                  return ranges.map((range: any, rIdx: number) => {
                    const isFirst = rIdx === 0;
                    const isMax = range.max === null || range.max === undefined || range.max === '' || Number(range.max) >= 99999 || String(range.max).toLowerCase() === 'max';

                    let rangeText = '';
                    if (item.unit === 'mét') {
                      if (isMax) {
                        rangeText = `${t('quote.over')} ${Math.floor(range.min)}m`;
                      } else if (Number(range.min) < 2) {
                        rangeText = `${t('quote.under')} 2m`;
                      } else {
                        rangeText = `${t('quote.from')} ${Math.floor(range.min)} – ${Math.ceil(range.max)}m`;
                      }
                    } else if (isMax) {
                      rangeText = `≥ ${Number(range.min).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}`;
                    } else if (Number(range.min) === Number(range.max)) {
                      rangeText = `${range.min}`;
                    } else {
                      rangeText = `${range.min}–${range.max}`;
                    }

                    return (
                      <tr
                        key={`${itemIdx}-${rIdx}`}
                        className={isHighlight ? "bg-[var(--accent-glow)]/20 hover:bg-[var(--accent-glow)]/40 transition-colors" : "hover:bg-block-bg/20 transition-colors"}
                      >
                        {isFirst && (
                          <>
                            <td rowSpan={ranges.length} className="px-4 md:px-6 py-4 font-bold text-foreground border border-card-border align-middle">
                              {getTranslatedItemName(item.material_name)}
                              {subDesc && <span className="block text-[10px] font-normal text-text-muted mt-0.5">{subDesc}</span>}
                            </td>
                            <td rowSpan={ranges.length} className="px-3 py-4 text-center text-text-muted font-semibold border border-card-border align-middle">
                              {getTranslatedUnit(item.unit)}
                            </td>
                          </>
                        )}
                        <td className={`px-4 md:px-6 py-3 border border-card-border ${isMax && isHighlight ? 'font-bold text-[var(--accent)]' : ''}`}>
                          {rangeText}
                        </td>
                        <td className={`px-4 md:px-6 py-3 border border-card-border tabular-nums text-right ${isMax && isHighlight ? 'font-black text-[var(--accent)]' : 'font-semibold text-foreground'}`}>
                          {Number(range.price).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                        </td>
                        {isFirst && (
                          <td rowSpan={ranges.length} className="px-4 md:px-6 py-4 text-xs text-text-muted text-right font-medium border border-card-border align-middle">
                            {noteText}
                          </td>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-text-muted mt-3 px-1">
            {t('quote.footerDisclaimer')}
          </p>
        </div>

        {/* Calculator section */}
        <div id="calculator" className="border-t border-card-border pt-10">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              {t('calculator.sectionTitle')}
            </h2>
            <p className="text-text-muted text-sm mt-1">
              {t('calculator.sectionSubTitle')}
            </p>
          </div>
          
          <div className="p-1 rounded-3xl border border-card-border bg-block-bg/15">
            <PricingCalculator priceItems={priceItems} />
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
