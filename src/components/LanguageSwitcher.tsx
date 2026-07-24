'use client';

import { useLanguage, Locale } from '@/context/LanguageContext';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-0.5 bg-black/10 border border-[var(--card-border)] rounded-lg p-1 backdrop-blur-sm ${className}`}
      aria-label="Language Switcher"
    >
      <button
        type="button"
        onClick={() => setLocale('vi')}
        title="Tiếng Việt"
        aria-label="Chọn Tiếng Việt"
        className={`px-2 py-1 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
          locale === 'vi'
            ? 'bg-red-600 text-white shadow-md'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
        }`}
      >
        <span>🇻🇳</span>
        <span>VI</span>
      </button>

      <button
        type="button"
        onClick={() => setLocale('en')}
        title="English"
        aria-label="Select English"
        className={`px-2 py-1 rounded text-[11px] font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
          locale === 'en'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
        }`}
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
