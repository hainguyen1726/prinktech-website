'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Phone, Menu, X, MessageCircle } from 'lucide-react';

interface HeaderProps {
  activeTheme?: 'tech' | 'creative' | 'elegant';
  setActiveTheme?: (theme: 'tech' | 'creative' | 'elegant') => void;
  hideSwitcher?: boolean;
}

export default function Header({ activeTheme: propTheme, setActiveTheme: propSetTheme, hideSwitcher = false }: HeaderProps) {
  const pathname = usePathname();
  const [internalTheme, setInternalTheme] = useState<'tech' | 'creative' | 'elegant'>('elegant');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTheme = propTheme !== undefined ? propTheme : internalTheme;

  // Sync theme từ localStorage khi mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('prinktech-theme') as 'tech' | 'creative' | 'elegant';
    if (savedTheme === 'tech' || savedTheme === 'creative' || savedTheme === 'elegant') {
      if (propTheme === undefined) {
        setInternalTheme(savedTheme);
      }
    }
  }, [propTheme]);

  // Tự động apply theme class lên body mỗi khi activeTheme thay đổi
  useEffect(() => {
    document.body.className = '';
    if (activeTheme === 'tech') {
      document.body.classList.add('theme-tech');
    } else if (activeTheme === 'creative') {
      document.body.classList.add('theme-creative');
    }
  }, [activeTheme]);

  const handleThemeChange = (theme: 'tech' | 'creative' | 'elegant') => {
    localStorage.setItem('prinktech-theme', theme);
    if (propSetTheme) {
      propSetTheme(theme);
    } else {
      setInternalTheme(theme);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Đóng mobile menu khi chuyển trang
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: 'Giới thiệu', href: '/#about', isHash: true },
    { name: 'Sản phẩm', href: '/san-pham', isHash: false },
    { name: 'Thư viện ảnh', href: '/thu-vien-anh', isHash: false },
    { name: 'Tính giá', href: '/bao-gia', isHash: false },
    { name: 'Tra cứu đơn', href: '/tra-cuu', isHash: false },
    { name: 'Đặt hàng', href: '/dat-hang', isHash: false },
    { name: 'Cẩm nang', href: '/#blog', isHash: true },
    { name: 'Liên hệ', href: '/#contact', isHash: true },
  ];

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? `py-2 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--card-border)] ${
                activeTheme === 'elegant' ? 'shadow-md shadow-stone-200/40' : 'shadow-lg shadow-black/20'
              }`
            : 'py-3.5 bg-[var(--background)]/75 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" aria-label="Về trang chủ PrinK Tech">
              <img src="/logo-horizontal.png" alt="PrinK Tech - In UV DTF Nổi 3D" className="h-10 object-contain" />
            </Link>
          </div>

          {/* Nav desktop */}
          <nav className="hidden lg:flex items-center gap-5 text-[13px] font-semibold text-[var(--foreground)]">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return link.isHash ? (
                <a
                  key={link.name}
                  href={link.href}
                  className={`hover:text-[var(--accent)] transition-colors ${
                    active ? 'text-[var(--accent)] font-bold' : 'text-[var(--foreground)]/80'
                  }`}
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`hover:text-[var(--accent)] transition-colors ${
                    active ? 'text-[var(--accent)] font-black' : 'text-[var(--foreground)]/80'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right group */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Compact theme switcher — M1, M2 & M3, ẩn nếu hideSwitcher */}
            {!hideSwitcher && (
              <div className="hidden sm:flex items-center gap-1 bg-black/10 border border-[var(--card-border)] rounded-lg p-1 backdrop-blur-sm">
                <button
                  onClick={() => handleThemeChange('tech')}
                  title="Mẫu 1: Công nghệ & Hiện đại"
                  aria-label="Chọn mẫu 1 Công nghệ"
                  className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                    activeTheme === 'tech'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  M1
                </button>
                <button
                  onClick={() => handleThemeChange('creative')}
                  title="Mẫu 2: Sáng tạo & Năng động"
                  aria-label="Chọn mẫu 2 Sáng tạo"
                  className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                    activeTheme === 'creative'
                      ? 'bg-pink-500 text-white shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  M2
                </button>
                <button
                  onClick={() => handleThemeChange('elegant')}
                  title="Mẫu 3: Elegant & Giao diện sáng"
                  aria-label="Chọn mẫu 3 Elegant"
                  className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                    activeTheme === 'elegant'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  M3
                </button>
              </div>
            )}

            {/* Phone CTA -> Zalo CTA */}
            <a
              href="https://zalo.me/0822968412"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-2 px-3.5 rounded-lg text-xs shadow-md transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              aria-label="Chat Zalo 0822968412"
            >
              <MessageCircle size={12} /> Zalo: 0822.968.412
            </a>

            {/* Mobile Zalo icon */}
            <a
              href="https://zalo.me/0822968412"
              target="_blank"
              rel="noopener noreferrer"
              className="md:hidden flex items-center justify-center w-9 h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
              aria-label="Chat Zalo"
            >
              <MessageCircle size={14} />
            </a>

            {/* Hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-lg border border-[var(--card-border)] hover:bg-card-border/20 transition-all text-[var(--foreground)] focus:outline-none cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Khoảng trống đệm chống đè content do header là fixed */}
      <div className="h-16 w-full"></div>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-45 bg-[var(--background)]/98 backdrop-blur-md flex flex-col justify-center items-center gap-6 animate-fadeIn transition-all duration-300">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2.5 rounded-lg border border-[var(--card-border)] hover:bg-card-border/20 transition-all text-[var(--foreground)] focus:outline-none cursor-pointer"
            aria-label="Đóng Menu"
          >
            <X size={22} />
          </button>

          {navLinks.map((link) => {
            const active = isActive(link.href);
            return link.isHash ? (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-bold hover:text-[var(--accent)] transition-colors ${
                  active ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'
                }`}
              >
                {link.name}
              </a>
            ) : (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-bold hover:text-[var(--accent)] transition-colors ${
                  active ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {/* Theme switcher inside mobile drawer */}
          {!hideSwitcher && (
            <div className="flex items-center gap-2 mt-4 bg-black/10 border border-[var(--card-border)] rounded-lg p-1.5 backdrop-blur-sm">
              <button
                onClick={() => { handleThemeChange('tech'); setMobileMenuOpen(false); }}
                className={`px-3 py-1.5 rounded text-xs font-bold tracking-wide transition-all cursor-pointer ${
                  activeTheme === 'tech' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-[var(--text-muted)]'
                }`}
              >
                M1 (Tối)
              </button>
              <button
                onClick={() => { handleThemeChange('creative'); setMobileMenuOpen(false); }}
                className={`px-3 py-1.5 rounded text-xs font-bold tracking-wide transition-all cursor-pointer ${
                  activeTheme === 'creative' ? 'bg-pink-500 text-white shadow-md' : 'text-[var(--text-muted)]'
                }`}
              >
                M2 (Tối)
              </button>
              <button
                onClick={() => { handleThemeChange('elegant'); setMobileMenuOpen(false); }}
                className={`px-3 py-1.5 rounded text-xs font-bold tracking-wide transition-all cursor-pointer ${
                  activeTheme === 'elegant' ? 'bg-amber-600 text-white shadow-md' : 'text-[var(--text-muted)]'
                }`}
              >
                M3 (Sáng)
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
