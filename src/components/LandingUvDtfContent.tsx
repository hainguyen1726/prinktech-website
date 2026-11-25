'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Droplets,
  ShieldCheck,
  Sparkles,
  Truck,
  MessageCircle,
  Facebook,
  Calculator,
  Send,
  Play,
  ArrowRight,
  Building2,
  Baby,
} from 'lucide-react';
import Header from '@/components/Header';
import { createEventId, getAttributionParams, trackContact, trackEvent } from '@/lib/analytics';

interface PriceRange {
  min: number;
  max: number | null;
  price: number;
}

interface PriceItem {
  id?: string;
  material_name: string;
  unit: string;
  price_sheet: PriceRange[] | string;
}

interface VideoItem {
  id: string;
  title: string;
  description: string;
  platform: string;
  video_url: string;
}

const FALLBACK_PACKAGES = [
  {
    key: 'a4',
    title: 'Gói Dùng Thử — In Tờ A4 (20×28cm)',
    badge: 'Phổ biến nhất',
    priceText: '45.000đ / tờ',
    subPrice: 'Từ 5 tờ chỉ 39.000đ · Từ 50 tờ chỉ 28.000đ',
    desc: 'Tự do ghép nhiều mẫu logo hoặc tem tên trên cùng 1 tờ A4 (~80–100 tem nhỏ).',
    productType: 'a4',
    productLabel: 'In tờ A4 (20×28cm)',
    defaultQty: 2,
    unit: 'tờ',
    unitPrice: 45000,
  },
  {
    key: 'tem-nho',
    title: 'Tem Logo Cắt Bế Sẵn (≤ 3×3cm)',
    badge: 'Cho Shop & F&B',
    priceText: 'Từ 500đ / tem',
    subPrice: '20 tem: 2.500đ · 50 tem: 1.600đ · 200 tem: 1.100đ',
    desc: 'Cắt bế sẵn từng chiếc, chỉ việc bóc và dán lên ly trà sữa, chai mỹ phẩm, hộp quà.',
    productType: 'tem-nho',
    productLabel: 'Tem nhỏ (dưới 3×3cm) – Cắt bế sẵn',
    defaultQty: 50,
    unit: 'chiếc',
    unitPrice: 1600,
  },
  {
    key: 'cuon',
    title: 'In Cuộn Mét Dài (Khổ Rộng 60cm)',
    badge: 'Giá tận xưởng',
    priceText: 'Từ 145.000đ / mét',
    subPrice: '1m: 290.000đ · 2m: 250.000đ · 5m+: 220.000đ',
    desc: 'Tối ưu chi phí cho thương hiệu, xưởng sản xuất, chuỗi F&B in số lượng lớn.',
    productType: 'cuon',
    productLabel: 'In theo mét dài (Khổ 60cm)',
    defaultQty: 1,
    unit: 'mét',
    unitPrice: 290000,
  },
];

function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];
  const regMatch = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return regMatch && regMatch[2]?.length === 11 ? regMatch[2] : null;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

export default function LandingUvDtfContent({
  priceItems = [],
  videos = [],
}: {
  priceItems?: PriceItem[];
  videos?: VideoItem[];
}) {
  const [segment, setSegment] = useState<'shop' | 'personal'>('shop');
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    material_type: 'In tờ A4 (20×28cm)',
    quantity: '2',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    trackEvent({
      eventName: 'ViewContent',
      params: {
        content_name: 'Landing Page In Tem UV DTF 3D',
        content_category: 'uv_dtf_landing',
        currency: 'VND',
      },
      sendServerCapi: true,
    });
  }, []);

  const packages = FALLBACK_PACKAGES.map((pkg) => {
    const matched = priceItems.find((item) => {
      const name = item.material_name.toLowerCase();
      if (pkg.key === 'a4') return name.includes('a4');
      if (pkg.key === 'tem-nho') return name.includes('nhỏ');
      return name.includes('mét');
    });
    if (!matched) return pkg;
    const sheet: PriceRange[] = Array.isArray(matched.price_sheet)
      ? matched.price_sheet
      : JSON.parse(matched.price_sheet || '[]');
    if (sheet.length === 0) return pkg;
    const minPrice = Math.min(...sheet.map((r) => Number(r.price)));
    const firstPrice = Number(sheet[0].price);
    return {
      ...pkg,
      productLabel: matched.material_name,
      priceText:
        pkg.key === 'a4'
          ? `${formatVnd(firstPrice)} / tờ`
          : `Từ ${formatVnd(minPrice)} / ${matched.unit}`,
    };
  });

  const buildQuickOrderHref = (pkg: (typeof packages)[number]) => {
    const quotePayload = [
      {
        product_type: pkg.productType,
        product_label: pkg.productLabel,
        size_label: '',
        quantity: pkg.defaultQty,
        unit: pkg.unit,
        unit_price: pkg.unitPrice,
        subtotal: pkg.defaultQty * pkg.unitPrice,
        image_url: null,
        design_url: null,
        note: 'Đặt nhanh từ Landing Page UV DTF',
      },
    ];
    return `/dat-hang?quote=${encodeURIComponent(JSON.stringify(quotePayload))}`;
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.phone.trim()) {
      setSubmitError('Vui lòng nhập tên và số điện thoại để xưởng gửi mẫu & báo giá.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    const eventId = createEventId('lead');
    const attribution = getAttributionParams();

    try {
      const res = await fetch('/api/web/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.customer_name.trim(),
          phone: formData.phone.trim(),
          material_type: formData.material_type,
          quantity: Number(formData.quantity) || 1,
          notes: formData.notes.trim() || `Nhu cầu: ${segment === 'shop' ? 'Shop/Doanh nghiệp' : 'Cá nhân/Tem tên'}`,
          event_id: eventId,
          event_source_url: typeof window !== 'undefined' ? window.location.href : undefined,
          utm_source: attribution.utm_source || null,
          utm_campaign: attribution.utm_campaign || null,
          utm_content: attribution.utm_content || null,
          fbp: attribution.fbp || null,
          fbc: attribution.fbc || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể gửi yêu cầu');

      trackEvent({
        eventName: 'Lead',
        eventId,
        params: {
          content_name: formData.material_type,
          currency: 'VND',
        },
        userData: {
          name: formData.customer_name.trim(),
          phone: formData.phone.trim(),
        },
        sendServerCapi: false, // Đã gửi CAPI trực tiếp từ POST /api/web/quote-requests
      });

      setSubmitDone(true);
      setFormData({
        customer_name: '',
        phone: '',
        material_type: 'In tờ A4 (20×28cm)',
        quantity: '2',
        notes: '',
      });
    } catch (err) {
      setSubmitError((err as Error).message || 'Có lỗi xảy ra, vui lòng thử lại hoặc nhắn Zalo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24 md:pb-12">
      <Header />

      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-10 space-y-14">
        {/* 1. HERO ABOVE THE FOLD */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-xs font-bold text-sky-500">
              <Sparkles size={14} /> Xưởng In Trực Tiếp PrinK Tech — Nhận In Từ 1 Tờ A4
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.12]">
              In Tem UV DTF Nổi 3D{' '}
              <span className="bg-gradient-to-r from-sky-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">
                Siêu Bền – Chống Nước 100%
              </span>
            </h1>

            <p className="text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
              Bóc là dán lên <strong>ly nhựa, bình giữ nhiệt, chai thủy tinh, mũ bảo hiểm, hộp quà, đồ da</strong>.
              Mực UV nổi 3D phủ bóng gương sang trọng — <strong>không bong tróc, không phai màu khi rửa nước</strong>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold">
              <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center gap-2">
                <Droplets size={16} className="text-sky-500 shrink-0" />
                <span>Chống nước &amp; cồn</span>
              </div>
              <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span>Keo bám vĩnh viễn</span>
              </div>
              <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center gap-2">
                <Sparkles size={16} className="text-pink-500 shrink-0" />
                <span>Từ 45.000đ / tờ A4</span>
              </div>
              <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center gap-2">
                <Truck size={16} className="text-amber-500 shrink-0" />
                <span>In &amp; giao trong 24h</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="#bao-gia-nhanh"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-95 text-white font-black text-sm shadow-lg shadow-sky-500/20 flex items-center gap-2 transition"
              >
                <Calculator size={17} /> Xem giá &amp; Đặt in ngay
              </a>
              <a
                href="https://m.me/1254340327752311"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackContact('messenger', 'landing_hero')}
                className="px-5 py-3.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center gap-2 transition"
              >
                <Facebook size={17} /> Gửi mẫu qua Messenger
              </a>
              <a
                href="https://zalo.me/0822968412"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackContact('zalo', 'landing_hero')}
                className="px-5 py-3.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-sky-400 font-bold text-sm flex items-center gap-2 transition"
              >
                <MessageCircle size={17} className="text-sky-500" /> Chat Zalo 0822.968.412
              </a>
            </div>
          </div>

          {/* Right: Quick Lead Form */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xl space-y-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--accent)]">
                  Nhận tư vấn &amp; báo giá trong 5 phút
                </span>
                <h2 className="text-xl font-black mt-1">Gửi nhu cầu in tem UV DTF</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Chưa có file thiết kế? Để lại SĐT, kỹ thuật viên sẽ lên demo bố cục miễn phí.
                </p>
              </div>

              {submitDone ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-center space-y-3">
                  <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                  <h3 className="font-bold text-base">Đã nhận yêu cầu của bạn!</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Đội ngũ PrinK Tech sẽ liên hệ tư vấn &amp; báo giá chi tiết qua Zalo/SĐT trong ít phút.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitDone(false)}
                    className="text-xs font-bold text-[var(--accent)] underline cursor-pointer"
                  >
                    Gửi thêm yêu cầu khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Họ tên / Tên shop *</label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData((p) => ({ ...p, customer_name: e.target.value }))}
                      placeholder="VD: Minh Anh / Tiệm Trà Sữa..."
                      className="w-full h-10 px-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Số điện thoại / Zalo *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="09xx xxx xxx"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Số lượng dự kiến</label>
                      <input
                        type="number"
                        min={1}
                        value={formData.quantity}
                        onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Gói in quan tâm</label>
                    <select
                      value={formData.material_type}
                      onChange={(e) => setFormData((p) => ({ ...p, material_type: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="In tờ A4 (20×28cm)">In tờ A4 (từ 45.000đ/tờ)</option>
                      <option value="Tem nhỏ (dưới 3×3cm) – Cắt bế sẵn">Tem cắt bế sẵn (từ 500đ/tem)</option>
                      <option value="In theo mét dài (Khổ 60cm)">In cuộn mét dài khổ 60cm (từ 145.000đ/m)</option>
                      <option value="Combo tem tên cho bé / Sticker cá nhân">Combo tem tên cá nhân hóa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Ghi chú bề mặt dán / kích thước</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="VD: Dán bình giữ nhiệt, logo 4x4cm..."
                      className="w-full p-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  {submitError && (
                    <p className="text-xs text-red-500 font-medium">{submitError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 cursor-pointer disabled:opacity-60 transition"
                  >
                    <Send size={16} />
                    {submitting ? 'Đang gửi yêu cầu...' : 'Nhận báo giá & Tư vấn miễn phí'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* 2. USE CASE SEGMENT SWITCHER */}
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Chọn đúng giải pháp theo nhu cầu của bạn</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Công nghệ UV DTF linh hoạt cho cả đơn hàng thương hiệu số lượng lớn và đơn cá nhân số lượng ít.
              </p>
            </div>
            <div className="inline-flex rounded-xl p-1 border border-[var(--card-border)] bg-[var(--background)]">
              <button
                type="button"
                onClick={() => setSegment('shop')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                  segment === 'shop'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <Building2 size={14} /> Shop / F&amp;B / Doanh nghiệp
              </button>
              <button
                type="button"
                onClick={() => setSegment('personal')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                  segment === 'personal'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <Baby size={14} /> Cá nhân / Tem tên cho bé
              </button>
            </div>
          </div>

          {segment === 'shop' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--card-border)] space-y-1.5">
                <p className="font-bold">☕ Quán Cafe, Trà Sữa &amp; Quà Tặng</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Dán logo nổi 3D trực tiếp lên ly thủy tinh, bình giữ nhiệt, hộp thiếc mà không cần in lụa tối thiểu hàng nghìn chiếc.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--card-border)] space-y-1.5">
                <p className="font-bold">🧴 Mỹ Phẩm, Nước Hoa &amp; Thực Phẩm</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Không viền nền thừa, chỉ giữ lại chữ và biểu tượng sắc nét như in trực tiếp lên thân chai, chống nước &amp; tinh dầu.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--card-border)] space-y-1.5">
                <p className="font-bold">🏭 Giá sỉ tận xưởng — Xuất VAT 8%</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Đơn từ 5m hoặc 50 tờ có chiết khấu sâu, hỗ trợ ghép file tối ưu diện tích và xuất hóa đơn VAT đầy đủ.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--card-border)] space-y-1.5">
                <p className="font-bold">🎒 Tem tên cho bé đi học</p>
                <p className="text-xs text-[var(--text-muted)]">
                  In tên bé + hình hoạt hình yêu thích trên tờ A4 (~80–100 tem/tờ), dán bình nước, hộp bút, sách vở không sợ bong khi rửa.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--card-border)] space-y-1.5">
                <p className="font-bold">🏍️ Dán mũ bảo hiểm, laptop, xe máy</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Sticker hiệu ứng nổi 3D bóng gương, chịu nắng mưa ngoài trời và vệ sinh lau chùi hàng ngày.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--card-border)] space-y-1.5">
                <p className="font-bold">⚡ Nhận in lẻ chỉ từ 1 tờ A4</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Chi phí chỉ 45.000đ/tờ (2 tờ chỉ 90.000đ). Giao hàng toàn quốc, kiểm tra hàng trước khi thanh toán.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 3. PRICING PACKAGES */}
        <section id="bao-gia-nhanh" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black">Bảng giá công khai — Chọn gói đặt nhanh</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ.
              </p>
            </div>
            <Link
              href="/bao-gia"
              className="text-sm font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              Mở máy tính giá chi tiết <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {packages.map((pkg) => (
              <div
                key={pkg.key}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 flex flex-col justify-between space-y-5 shadow-sm hover:border-[var(--accent)]/60 transition"
              >
                <div className="space-y-2.5">
                  <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--accent)]/10 text-[var(--accent)]">
                    {pkg.badge}
                  </span>
                  <h3 className="text-lg font-black">{pkg.title}</h3>
                  <p className="text-2xl font-black text-[var(--accent)]">{pkg.priceText}</p>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">{pkg.subPrice}</p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1">{pkg.desc}</p>
                </div>

                <div className="space-y-2">
                  <Link
                    href={buildQuickOrderHref(pkg)}
                    className="w-full h-10 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition"
                  >
                    Đặt nhanh gói này <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. REAL DURABILITY VIDEOS */}
        {videos.length > 0 && (
          <section className="space-y-5">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Play size={22} className="text-[var(--accent)]" /> Video kiểm chứng độ bền thực tế tại xưởng
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Xem trực tiếp quy trình in UV DTF và bài test chống nước, chống bong tróc.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {videos.slice(0, 4).map((video) => {
                const ytId = extractYoutubeId(video.video_url);
                return (
                  <a
                    key={video.id}
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden hover:border-[var(--accent)]/60 transition"
                  >
                    <div className="aspect-video bg-slate-900 relative overflow-hidden">
                      {ytId && (
                        <img
                          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="w-11 h-11 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg">
                          <Play size={18} fill="currentColor" />
                        </span>
                      </div>
                    </div>
                    <div className="p-3.5">
                      <p className="font-bold text-xs line-clamp-2">{video.title}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
