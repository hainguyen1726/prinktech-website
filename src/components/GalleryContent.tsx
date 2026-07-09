'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, MessageCircle, Eye, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';

interface SampleItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
}

export default function GalleryContent({ initialSamples }: { initialSamples: SampleItem[] }) {
  const [activeTheme, setActiveTheme] = useState<'tech' | 'creative' | 'elegant'>('elegant');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedSampleUrl, setSelectedSampleUrl] = useState<string | null>(null);

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

  const filteredSamples = initialSamples.filter(
    s => activeCategory === 'Tất cả' || s.category === activeCategory
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* ── STICKY HEADER ── */}
      <Header activeTheme={activeTheme} setActiveTheme={changeTheme} />

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
