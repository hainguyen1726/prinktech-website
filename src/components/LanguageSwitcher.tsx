'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-1 bg-black/15 border border-[var(--card-border)] rounded-xl p-1 backdrop-blur-md ${className}`}
      aria-label="Language Switcher"
    >
      <button
        type="button"
        onClick={() => setLocale('vi')}
        title="Tiếng Việt"
        aria-label="Chọn Tiếng Việt"
        className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider transition-all duration-200 cursor-pointer ${
          locale === 'vi'
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 ring-1 ring-purple-400/50 scale-105'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-black/10'
        }`}
      >
        VI
      </button>

      <button
        type="button"
        onClick={() => setLocale('en')}
        title="English"
        aria-label="Select English"
        className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider transition-all duration-200 cursor-pointer ${
          locale === 'en'
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 ring-1 ring-purple-400/50 scale-105'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-black/10'
        }`}
      >
        EN
      </button>
    </div>
  );
}
