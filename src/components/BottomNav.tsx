'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Image, Calculator, Search, ShoppingBag } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Trang chủ',
      path: '/',
      icon: Home,
    },
    {
      label: 'Thư viện',
      path: '/thu-vien-anh',
      icon: Image,
    },
    {
      label: 'Tính giá',
      path: '/bao-gia',
      icon: Calculator,
    },
    {
      label: 'Tra cứu',
      path: '/tra-cuu',
      icon: Search,
    },
    {
      label: 'Đặt hàng',
      path: '/dat-hang',
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-card-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe-bottom">
      <div className="h-16 max-w-md mx-auto px-6 flex items-center justify-between gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          const isOrder = item.path === '/dat-hang';

          if (isOrder) {
            return (
              <Link
                key={item.path}
                href={item.path}
                className="flex flex-col items-center justify-center -translate-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 active:scale-95 transition-transform">
                  <Icon size={20} />
                </div>
                <span className={`text-[10px] font-bold mt-1.5 transition-colors duration-200 ${
                  isActive ? 'text-pink-500 font-extrabold' : 'text-text-muted'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center w-14 h-12 transition-all duration-200"
            >
              <div className={`p-1 rounded-lg transition-colors duration-200 ${
                isActive ? 'text-[var(--accent)]' : 'text-text-muted hover:text-foreground'
              }`}>
                <Icon size={20} />
              </div>
              <span className={`text-[10px] font-bold mt-0.5 transition-colors duration-200 ${
                isActive ? 'text-[var(--accent)] font-extrabold' : 'text-text-muted'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
