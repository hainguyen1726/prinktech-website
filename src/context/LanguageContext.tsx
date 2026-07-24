'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { vi, TranslationKeys } from '../i18n/locales/vi';
import { en } from '../i18n/locales/en';

export type Locale = 'vi' | 'en';

const dictionaries: Record<Locale, TranslationKeys> = { vi, en };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('vi');

  useEffect(() => {
    // Reading saved language preference from localStorage or browser navigator
    try {
      const savedLang = localStorage.getItem('prinktech-lang') as Locale;
      if (savedLang === 'vi' || savedLang === 'en') {
        setLocaleState(savedLang);
      } else if (typeof window !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
        setLocaleState('en');
      }
    } catch (e) {
      console.error('Error reading saved language:', e);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('prinktech-lang', newLocale);
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
      document.documentElement.lang = newLocale;
    } catch (e) {
      console.error('Error saving language preference:', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const keys = keyPath.split('.');
    let current: any = dictionaries[locale] || dictionaries['vi'];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to Vietnamese dictionary if key missing in English
        let fallback: any = dictionaries['vi'];
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return keyPath;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return keyPath;
    }

    let result = current;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
