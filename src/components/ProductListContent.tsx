'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, ChevronRight, MessageCircle, Eye, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/pricing';
import Header from '@/components/Header';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  is_featured: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'UV DTF Thường',
  embossed: 'UV DTF Nổi 3D',
  others: 'Sản phẩm khác',
};

export default function ProductListContent({ products }: { products: Product[] }) {
  const [activeTheme, setActiveTheme] = useState<'tech' | 'creative' | 'elegant'>('elegant');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Load theme từ localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('prinktech-theme') || 'elegant';
    setActiveTheme(savedTheme as any);
    
    document.body.className = '';
    if (savedTheme === 'tech') {
      document.body.classList.add('theme-tech');
    } else if (savedTheme === 'creative') {
      document.body.classList.add('theme-creative');
    }
  }, []);

  const changeTheme = (theme: 'tech' | 'creative' | 'elegant') => {
    setActiveTheme(theme);
    localStorage.setItem('prinktech-theme', theme);
    document.body.className = '';
    if (theme === 'tech') {
      document.body.classList.add('theme-tech');
    } else if (theme === 'creative') {
      document.body.classList.add('theme-creative');
    }
  };

  const filteredProducts = products.filter(p => activeTab === 'all' || p.category === activeTab);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* ── STICKY HEADER ── */}
      <Header activeTheme={activeTheme} setActiveTheme={changeTheme} />

      {/* ── HERO BANNER ── */}
      <section className="py-12 px-6 border-b border-card-border/50 relative z-10 w-full overflow-hidden bg-block-bg/25">
        <div className="max-w-7xl mx-auto w-full text-center space-y-4">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)]">Danh mục in ấn</span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            Sản Phẩm Tem In{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">
              UV DTF 3D Nổi
            </span>
          </h1>
          <p className="text-xs text-text-muted max-w-xl mx-auto leading-relaxed">
            Xem danh mục tem dán chất lượng cao được thiết kế riêng cho cốc thủy tinh, bình giữ nhiệt, mũ bảo hiểm và các dịch vụ in sỉ theo mét dài của PrinK Tech.
          </p>
        </div>
      </section>

      {/* ── PRODUCTS SECTION ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Tab Filters */}
        <div className="flex flex-nowrap overflow-x-auto whitespace-nowrap scrollbar-none justify-start md:justify-center items-center gap-2 mb-10 px-4 -mx-4 pb-2">
          {[
            { id: 'all', label: 'Tất cả sản phẩm' },
            { id: 'embossed', label: 'UV DTF Nổi 3D' },
            { id: 'standard', label: 'UV DTF Thường' },
            { id: 'others', label: 'Mẫu sản phẩm khác' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'btn-primary'
                  : 'bg-block-bg border-card-border text-text-muted hover:text-foreground hover:bg-card-bg'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid Products — layout bất đồng đều để tạo nhịp điệu thị giác */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
          {filteredProducts.map((product, idx) => {
            const label = CATEGORY_LABELS[product.category] || 'UV DTF';
            // Card đầu tiên và thứ 3 (idx 0,2) chiếm 2 cột trên desktop để tạo layout bất đối xứng
            const isFeatured = idx === 0 || idx === 2;
            return (
              <div
                key={product.id}
                className={`glass-card flex flex-col overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                  isFeatured ? 'md:col-span-2 lg:col-span-2' : ''
                }`}
              >
                {/* Image — tỷ lệ khác nhau tùy featured */}
                <div className={`relative w-full overflow-hidden bg-black/10 ${
                  isFeatured ? 'aspect-[21/9]' : 'aspect-video'
                }`}>
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=80'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-[var(--card-bg)]/90 backdrop-blur-sm border border-card-border rounded px-2.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                    {label}
                  </div>
                  {isFeatured && (
                    <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 rounded px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                      ⭐ Nổi bật
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className={`font-bold text-foreground leading-snug group-hover:text-[var(--accent)] transition-colors ${
                      isFeatured ? 'text-lg' : 'text-base'
                    }`}>
                      {product.name}
                    </h3>
                    <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                      {product.description || 'Tem dán UV DTF dập nổi 3D cao cấp bám dính chắc chắn, phủ bóng bảo vệ.'}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-card-border/50">
                    <div>
                      <span className="text-[9px] text-text-muted block font-semibold uppercase">Từ</span>
                      <span className="font-black text-sm text-[var(--accent)] tabular-nums">
                        {product.price ? `${formatCurrency(product.price)}/chiếc` : 'Liên hệ'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/san-pham/${product.slug}`}
                        className="px-3 py-1.5 rounded-lg btn-secondary text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Xem chi tiết sản phẩm"
                      >
                        <Eye size={12} /> Chi tiết
                      </Link>
                      <Link
                        href="/dat-hang"
                        className="px-3 py-1.5 rounded-lg btn-primary text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        Đặt in
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center text-text-muted text-sm font-semibold">
              Hiện chưa có sản phẩm nào thuộc danh mục này.
            </div>
          )}
        </div>

        {/* ── PHÂN LOẠI NHÓM STICKER THEO CHỦ ĐỀ ── */}
        <section className="mt-16 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)]">In mẫu nào?</span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">Phân loại theo chủ đề sticker</h2>
            <p className="text-xs text-text-muted max-w-lg mx-auto">Từ logo thương hiệu nghiêm túc đến hoạt hình dễ thương, chúng tôi in bất kỳ hình gì bạn cần.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { emoji: '🏷️', label: 'Logo Brand', desc: 'Nhãn hàng, thương hiệu', color: 'from-blue-500/20 to-indigo-500/20', border: 'border-blue-400/30' },
              { emoji: '🎨', label: 'Cá nhân hóa', desc: 'Tên, ngày tháng, chân dung', color: 'from-purple-500/20 to-fuchsia-500/20', border: 'border-purple-400/30' },
              { emoji: '✍️', label: 'Chữ ký', desc: 'Signature, handwriting', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-400/30' },
              { emoji: '🐱', label: 'Hoạt hình', desc: 'Cute, anime, cartoon', color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-400/30' },
              { emoji: '📸', label: 'Ảnh thật', desc: 'In ảnh màu sắc nét', color: 'from-green-500/20 to-teal-500/20', border: 'border-green-400/30' },
              { emoji: '😂', label: 'Meme / Funny', desc: 'Nổi bật, gây cười', color: 'from-yellow-500/20 to-orange-500/20', border: 'border-yellow-400/30' },
            ].map((item, i) => (
              <div key={i} className={`rounded-2xl border bg-gradient-to-br ${item.color} ${item.border} p-4 text-center space-y-2 hover:scale-105 transition-transform duration-200 cursor-default`}>
                <div className="text-3xl">{item.emoji}</div>
                <div className="font-black text-xs text-foreground">{item.label}</div>
                <div className="text-[10px] text-text-muted leading-snug">{item.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-text-muted">✅ Tất cả đều in được bằng công nghệ UV DTF • Màu sắc trung thực • Keo siêu bám dính</p>
        </section>
      </main>

      {/* ── Quy cách in ấn (Khối Banner) ── */}
      <section className="py-16 px-6 bg-block-bg border-t border-b border-card-border w-full">
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)]">
              ⚙ Quy cách in chuẩn xưởng
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">Bạn muốn đặt in theo quy cách nào?</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Xưởng hỗ trợ in cuộn dài theo mét hoặc dàn sẵn trên tờ A4, A3. Khách hàng cũng có thể đặt bế sẵn theo chiếc hình tròn, hình vuông để dán nhanh siêu tiện lợi.
            </p>
            <div className="flex gap-3">
              <Link href="/bao-gia" className="px-5 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center gap-2">
                Tính giá cuộn/tờ <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { t: 'In theo mét dài', d: 'Khổ rộng 60cm, in liên tục' },
              { t: 'In theo tờ A3/A4', d: 'Dàn file gọn gàng, bế sẵn' },
              { t: 'Tem bế rời ≤3cm', d: 'Cắt bế rời từng tem nhỏ' },
              { t: 'Tem bế rời khổ lớn', d: 'Thích hợp dán nón bảo hiểm' },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-card-border bg-card-bg shadow-sm">
                <h4 className="font-bold text-xs text-[var(--accent)]">{item.t}</h4>
                <p className="text-[10px] text-text-muted mt-1 leading-normal">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-16 px-6 bg-[#1c1917] text-stone-400 border-t border-stone-800 relative z-10 w-full transition-colors duration-300">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-stone-850">
          
          <div className="space-y-4">
            <img src="/logo-horizontal.png" alt="PrinK Tech" className="h-10 object-contain" />
            <p className="text-xs leading-relaxed text-stone-550">
              PrinK Tech tự hào mang tới các sản phẩm in ấn chất lượng đột phá, lớp phủ bảo vệ hoàn hảo. Chúng tôi phục vụ in ấn nhãn hàng sỉ và dán cốc lẻ tốc độ cao, hỗ trợ giao hàng toàn quốc.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://zalo.me/0822968412"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-black/20 border border-stone-800/60 hover:border-sky-500 text-sky-400 hover:text-white flex items-center justify-center transition focus:outline-none"
                aria-label="Liên hệ Zalo của xưởng"
              >
                <MessageCircle size={18} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase text-white tracking-widest">Cơ sở sản xuất</h4>
            <ul className="space-y-3 text-xs leading-relaxed">
              <li>
                <strong className="text-stone-300 block">Cơ sở Phú Thọ:</strong>
                Khu 9, Phù Ninh, Phú Thọ
              </li>
              <li>
                <strong className="text-stone-300 block">Cơ sở Hà Nội:</strong>
                Nguyễn Tuân, Thanh Xuân, Hà Nội
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase text-white tracking-widest">Hỗ trợ khách hàng</h4>
            <ul className="space-y-3 text-xs">
              <li>
                <span className="text-stone-500">Zalo trực tiếp:</span>{' '}
                <a href="https://zalo.me/0822968412" className="font-bold text-sky-400 hover:underline">0822.968.412</a>
              </li>
              <li>
                <span className="text-stone-500">Hành trình:</span>{' '}
                <Link href="/tra-cuu" className="font-bold text-[var(--accent)] hover:underline">🔍 Tra cứu đơn hàng</Link>
              </li>
              <li>
                <span className="text-stone-500">Chủ quản:</span>{' '}
                <span className="font-semibold text-stone-300">Công ty TNHH GMKT Việt Nam</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto w-full pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-stone-500">
          <p>© 2026 Xưởng in UV DTF PrinK Tech. Dự án thuộc sở hữu của GMKT Việt Nam.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-stone-300 transition">Portal Quản trị</Link>
            <span className="text-stone-700">|</span>
            <span className="text-stone-600">Designed with modern aesthetics</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
