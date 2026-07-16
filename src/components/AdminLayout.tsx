'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  ShoppingBag, Users, FileText, PenTool, BarChart, 
  Layers, Calculator, PhoneCall, Video, Globe, LogOut, Sun, Moon, TrendingUp
} from 'lucide-react';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active tab state dynamically parsed from URL query (?tab=)
  const activeTab = searchParams.get('tab') || 'posts';

  // Authentication state
  const [adminUser, setAdminUser] = useState<{ name: string } | null>(null);

  // Theme states
  const [activeTheme, setActiveTheme] = useState<'tech' | 'elegant'>('elegant');
  const [logoSrc, setLogoSrc] = useState('/logo-horizontal-dark-text.png');

  // Fetch admin user profile on load
  useEffect(() => {
    async function getProfile() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setAdminUser(data.user);
        }
      } catch (err) {
        console.error('Lỗi fetch admin profile:', err);
      }
    }
    getProfile();
  }, []);

  // Sync theme status and set logo path dynamically
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('theme-tech') || 
                      document.body.classList.contains('theme-tech');
      setActiveTheme(isDark ? 'tech' : 'elegant');
      setLogoSrc(isDark ? '/logo-horizontal.png' : '/logo-horizontal-dark-text.png');
    };

    checkTheme();

    // Listen for theme class changes in document element
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const changeTheme = (theme: 'tech' | 'elegant') => {
    setActiveTheme(theme);
    localStorage.setItem('prinktech-theme', theme);
    document.documentElement.classList.remove('theme-tech', 'theme-creative');
    document.body.classList.remove('theme-tech', 'theme-creative');
    if (theme === 'tech') {
      document.documentElement.classList.add('theme-tech');
      document.body.classList.add('theme-tech');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  // Helper function to render active states for sidebar links
  const isLinkActive = (path: string, tab?: string) => {
    if (pathname !== path) return false;
    if (tab && activeTab !== tab) return false;
    return true;
  };

  const renderSidebarItem = (
    label: string, 
    icon: React.ReactNode, 
    href: string, 
    tab?: 'posts' | 'products' | 'pricing' | 'quotes' | 'videos'
  ) => {
    const isWebsitePage = pathname === '/admin/website';
    const isActive = isWebsitePage && tab ? activeTab === tab : isLinkActive(href);

    const baseClass = "w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left transition cursor-pointer border";
    const activeClass = "bg-sky-500/10 text-sky-400 border-sky-500/20";
    const inactiveClass = "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/30 border-transparent";

    return (
      <Link
        key={label}
        href={tab ? `/admin/website?tab=${tab}` : href}
        className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
      >
        {icon} {label}
      </Link>
    );
  };

  return (
    <div className="admin-panel min-h-screen bg-[#f8fafc] dark:bg-[#070b13] text-slate-950 dark:text-slate-50 flex flex-col transition-colors duration-300">
      
      {/* Top Header */}
      <header className="admin-header border-b border-slate-200 dark:border-slate-800/80 py-3 px-4 sm:py-4 sm:px-6 sticky top-0 z-30 bg-white/95 dark:bg-[#0b1322]/95 backdrop-blur-md flex justify-between items-center w-full shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/admin/website">
            <img src={logoSrc} alt="PrinK Tech" className="h-7 sm:h-10 object-contain max-w-[120px] sm:max-w-none transition-all duration-300" />
          </Link>
          <span className="hidden md:block h-4 w-px bg-slate-200 dark:bg-slate-800"></span>
          <h2 className="hidden md:block font-bold text-xs sm:text-sm tracking-wider text-slate-800 dark:text-slate-200 uppercase">Quản trị Website PrinK Tech</h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle Button */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 sm:p-1">
            <button
              onClick={() => changeTheme('elegant')}
              className={`p-1 rounded text-xs transition-all cursor-pointer ${
                activeTheme === 'elegant'
                  ? 'bg-amber-600/10 text-amber-600 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Giao diện Sáng"
            >
              <Sun size={14} />
            </button>
            <button
              onClick={() => changeTheme('tech')}
              className={`p-1 rounded text-xs transition-all cursor-pointer ${
                activeTheme === 'tech'
                  ? 'bg-purple-600/20 text-purple-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
              title="Giao diện Tối"
            >
              <Moon size={14} />
            </button>
          </div>

          <span className="hidden sm:inline text-xs font-semibold text-slate-600 dark:text-slate-400">
            Chào, <strong className="text-slate-900 dark:text-white font-bold">{adminUser?.name || 'Admin'}</strong>
          </span>
          <Link href="/" target="_blank" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition flex items-center gap-1">
            <Globe size={14} /> <span className="hidden sm:inline">Xem Website</span>
          </Link>
          <button onClick={handleLogout} className="p-1.5 sm:p-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg transition cursor-pointer" title="Đăng xuất">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Body Grid */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-full p-4 lg:p-6 gap-6 z-10 pb-20 lg:pb-6">
        
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-60 shrink-0">
          <div className="glass-card p-3 lg:p-4 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 lg:gap-1.5 bg-white/40 dark:bg-[#0f172a]/20 border border-slate-200 dark:border-slate-800/80 rounded-xl scrollbar-none whitespace-nowrap">
            {renderSidebarItem("Quản lý Đơn hàng", <ShoppingBag size={16} className="text-emerald-500" />, "/admin/don-hang")}
            {renderSidebarItem("Quản lý Khách hàng", <Users size={16} className="text-purple-500" />, "/admin/khach-hang")}
            {renderSidebarItem("Sale Online", <TrendingUp size={16} className="text-rose-500" />, "/admin/sale-online")}
            
            <span className="hidden lg:block h-px bg-slate-200 dark:bg-slate-800 my-2"></span>

            {renderSidebarItem("Quản lý Bài viết", <FileText size={16} className="text-sky-500" />, "/admin/website", "posts")}
            {renderSidebarItem("Viết bài (Công cụ SEO)", <PenTool size={16} className="text-amber-500" />, "/admin/viet-bai")}
            {renderSidebarItem("SEO Audit Center", <BarChart size={16} className="text-teal-500" />, "/admin/seo")}
            
            {renderSidebarItem("Quản lý Sản phẩm", <Layers size={16} className="text-indigo-500" />, "/admin/website", "products")}
            {renderSidebarItem("Cấu hình Bảng giá", <Calculator size={16} className="text-pink-500" />, "/admin/website", "pricing")}
            {renderSidebarItem("Yêu cầu Báo giá", <PhoneCall size={16} className="text-orange-500" />, "/admin/website", "quotes")}
            {renderSidebarItem("Quản lý Video", <Video size={16} className="text-red-500" />, "/admin/website", "videos")}

            <span className="hidden lg:block h-px bg-slate-200 dark:bg-slate-800 my-2"></span>
            
            <Link
              href="/marketing"
              className="w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-2.5 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs font-bold text-left text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/30 border border-transparent transition cursor-pointer"
            >
              <BarChart size={16} className="text-sky-500" /> Kênh Marketing Ads
            </Link>
          </div>
        </aside>

        {/* Content Section */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Admin Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#0b1322]/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md flex justify-around items-center h-16 px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link 
          href="/admin/don-hang" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname === '/admin/don-hang' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <ShoppingBag size={18} />
          <span>Đơn hàng</span>
        </Link>
        <Link 
          href="/admin/khach-hang" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname === '/admin/khach-hang' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Users size={18} />
          <span>Khách hàng</span>
        </Link>
        <Link 
          href="/admin/website" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname === '/admin/website' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Layers size={18} />
          <span>Website</span>
        </Link>
        <Link 
          href="/admin/viet-bai" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname === '/admin/viet-bai' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <PenTool size={18} />
          <span>Viết bài</span>
        </Link>
        <Link 
          href="/admin/seo" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${pathname === '/admin/seo' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <BarChart size={18} />
          <span>SEO</span>
        </Link>
      </div>

    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}


