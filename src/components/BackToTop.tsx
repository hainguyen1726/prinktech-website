'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function BackToTop() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/admin') || pathname === '/login') {
      setIsVisible(false);
      return;
    }
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [pathname]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (pathname?.startsWith('/admin') || pathname === '/login') {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-24 md:bottom-8 right-6 z-45 p-3 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md text-slate-800 dark:text-slate-250 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer ${
        isVisible ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible'
      }`}
      aria-label="Quay lại đầu trang"
    >
      <ArrowUp size={18} className="group-hover:-translate-y-1 transition-transform duration-300" />
    </button>
  );
}
