'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, MessageCircle, Eye, ArrowRight, Menu } from 'lucide-react';

interface SampleItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
}

export default function GalleryContent({ initialSamples }: { initialSamples: SampleItem[] }) {
  const [activeTheme, setActiveTheme] = useState<'tech' | 'elegant'>('elegant');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedSampleUrl, setSelectedSampleUrl] = useState<string | null>(null);

  // Load theme từ localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('prinktech-theme') || 'elegant';
    const finalTheme = savedTheme === 'creative' ? 'elegant' : savedTheme;
    setActiveTheme(finalTheme as any);
    
    document.body.className = '';
    if (finalTheme === 'tech') {
      document.body.classList.add('theme-tech');
    }
  }, []);

  const changeTheme = (theme: 'tech' | 'elegant') => {
    setActiveTheme(theme);
    localStorage.setItem('prinktech-theme', theme);
    document.body.className = '';
    if (theme === 'tech') {
      document.body.classList.add('theme-tech');
    }
  };

  const filteredSamples = initialSamples.filter(
    s => activeCategory === 'Tất cả' || s.category === activeCategory
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-card-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" aria-label="Về trang chủ PrinK Tech">
              <img src="/logo-horizontal.png" alt="PrinK Tech" className="h-9 object-contain" />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6 text-[13px] font-semibold">
            <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
            <Link href="/#products" className="hover:text-white transition-colors">Sản phẩm</Link>
            <Link href="/thu-vien-anh" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-black transition-colors">Thư viện ảnh</Link>
            <Link href="/bao-gia" className="hover:text-white transition-colors">Tính giá</Link>
            <Link href="/tra-cuu" className="hover:text-white transition-colors">Tra cứu đơn</Link>
            <Link href="/dat-hang" className="hover:text-white transition-colors">Đặt hàng</Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <div className="hidden sm:flex items-center gap-1 bg-black/10 border border-card-border rounded-lg p-1 backdrop-blur-sm">
              <button
                onClick={() => changeTheme('tech')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                  activeTheme === 'tech'
                    ? 'bg-purple-650 text-white shadow-md'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                Tối
              </button>
              <button
                onClick={() => changeTheme('elegant')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                  activeTheme === 'elegant'
                    ? 'bg-amber-700 text-white shadow-md'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                Sáng
              </button>
            </div>

            <Link
              href="/dat-hang"
              className="px-4 py-1.5 rounded-xl text-sm font-bold btn-primary"
            >
              Đặt hàng
            </Link>

            {/* Hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-card-border hover:bg-card-border/20 transition-all text-foreground focus:outline-none"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/98 backdrop-blur-md flex flex-col justify-center items-center gap-6 animate-fadeIn transition-all duration-300">
          {/* Close button inside mobile menu */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg border border-card-border hover:bg-card-border/20 transition-all text-foreground"
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>

          <nav className="flex flex-col items-center gap-5 text-base font-bold text-foreground">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition-colors py-1">Trang chủ</Link>
            <Link href="/#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition-colors py-1">Sản phẩm</Link>
            <Link href="/thu-vien-anh" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition-colors py-1">Thư viện ảnh</Link>
            <Link href="/bao-gia" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition-colors py-1">Tính giá</Link>
            <Link href="/tra-cuu" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition-colors py-1">Tra cứu đơn</Link>
            <Link href="/dat-hang" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition-colors py-1">Đặt hàng</Link>
          </nav>

          {/* Theme switcher on mobile */}
          <div className="flex items-center gap-1 bg-black/10 border border-card-border rounded-lg p-1 mt-4">
            <button
              onClick={() => { changeTheme('tech'); setMobileMenuOpen(false); }}
              className={`px-3 py-1.5 rounded text-xs font-bold tracking-wide transition-all ${
                activeTheme === 'tech' ? 'bg-purple-650 text-white shadow-md' : 'text-text-muted hover:text-foreground'
              }`}
            >
              Tối
            </button>
            <button
              onClick={() => { changeTheme('elegant'); setMobileMenuOpen(false); }}
              className={`px-3 py-1.5 rounded text-xs font-bold tracking-wide transition-all ${
                activeTheme === 'elegant' ? 'bg-amber-700 text-white shadow-md' : 'text-text-muted hover:text-foreground'
              }`}
            >
              Sáng
            </button>
          </div>
        </div>
      )}

      {/* ── HERO BANNER ── */}
      <section className="py-12 px-6 border-b border-card-border/50 relative z-10 w-full overflow-hidden bg-block-bg/25">
        <div className="max-w-7xl mx-auto w-full text-center space-y-4">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent)]">Ảnh chụp thực tế</span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            Thư Viện Mẫu{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">
              Tem In Thực Tế
            </span>
          </h1>
          <p className="text-xs text-text-muted max-w-xl mx-auto leading-relaxed">
            Xem cận cảnh các sản phẩm in ấn nhãn tem nổi 3D, tem bóng gương sắc nét bám dính siêu chắc trên ly cốc, mũ bảo hiểm, bình giữ nhiệt tại xưởng PrinK Tech.
          </p>
        </div>
      </section>

      {/* ── GALLERY SECTION ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Categories Tab Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {['Tất cả', 'Tem ly/cốc', 'Tem mũ bảo hiểm', 'Tem bình giữ nhiệt', 'Tem xe máy', 'Tem nhãn sỉ'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer ${
                activeCategory === cat
                  ? 'btn-primary'
                  : 'bg-block-bg border-card-border text-text-muted hover:text-foreground hover:bg-card-bg'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredSamples.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedSampleUrl(item.image_url)}
              className="aspect-square rounded-2xl overflow-hidden border border-card-border bg-card-bg group cursor-pointer relative shadow-sm hover:shadow-md transition-all duration-300"
            >
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <span className="text-[10px] font-mono text-purple-300 font-bold uppercase block">{item.category}</span>
                <span className="font-bold text-xs text-white leading-snug mt-1 truncate">{item.title}</span>
                <span className="text-[10px] text-stone-300/80 mt-1 flex items-center gap-1 font-semibold">
                  🔍 Nhấp để xem lớn
                </span>
              </div>
            </div>
          ))}
          {filteredSamples.length === 0 && (
            <div className="col-span-full py-20 text-center text-text-muted text-sm font-semibold">
              Chưa có hình ảnh mẫu nào cho danh mục này.
            </div>
          )}
        </div>
      </main>

      {/* Lightbox Modal Player Popup */}
      {selectedSampleUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-100 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedSampleUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem chi tiết ảnh sản phẩm mẫu"
        >
          <div 
            className="w-full max-w-xl aspect-square bg-[#1c1917] rounded-2xl border border-stone-850 overflow-hidden shadow-2xl relative flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSampleUrl(null)}
              className="absolute top-4 right-4 z-110 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition focus:outline-none cursor-pointer"
              aria-label="Đóng ảnh"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <img
              src={selectedSampleUrl}
              alt="Mẫu tem in UV DTF thực tế"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

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
