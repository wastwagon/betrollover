'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import en, { TranslationKey } from '@/lib/translations/en';
import fr from '@/lib/translations/fr';

export type SupportedLanguage = 'en' | 'fr';

export interface Language {
  code: SupportedLanguage;
  label: string;
  flag: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', label: 'English',  flag: '🇬🇧', nativeLabel: 'English' },
  { code: 'fr', label: 'French',   flag: '🇫🇷', nativeLabel: 'Français' },
];

const MESSAGES: Record<SupportedLanguage, Record<string, string>> = { en, fr };
const LANG_COOKIE = 'br_language';

interface LanguageContextValue {
  lang: SupportedLanguage;
  language: Language;
  languages: Language[];
  setLang: (code: SupportedLanguage) => void;
  /** Translate a key. Supports {variable} interpolation. */
  t: (key: TranslationKey | string, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  language: SUPPORTED_LANGUAGES[0],
  languages: SUPPORTED_LANGUAGES,
  setLang: () => {},
  t: (key) => String(key),
});

/** Read the br_language cookie value on the client (document.cookie). */
function readLangCookie(): SupportedLanguage | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)br_language=([^;]+)/);
    const val = match?.[1] as SupportedLanguage | undefined;
    return val && MESSAGES[val] ? val : null;
  } catch {
    return null;
  }
}

/** Write the br_language cookie so the value is visible to middleware on next request. */
function writeLangCookie(code: SupportedLanguage) {
  try {
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${LANG_COOKIE}=${code};path=/;max-age=${maxAge};samesite=lax`;
  } catch {}
}

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  /**
   * Locale resolved server-side (from br_language cookie via next/headers).
   * Passing this avoids the en→fr flash on first render for returning French visitors.
   */
  initialLocale?: SupportedLanguage;
}) {
  const [lang, setLangState] = useState<SupportedLanguage>(initialLocale ?? 'en');

  // On mount, reconcile with client-side cookie (covers cases where SSR
  // cookie was not available, e.g. the very first visit after a switch).
  useEffect(() => {
    const cookieLang = readLangCookie();
    if (cookieLang && cookieLang !== lang) {
      setLangState(cookieLang);
    }
    // Only run once on mount — we intentionally omit `lang` from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback((code: SupportedLanguage) => {
    setLangState(code);
    writeLangCookie(code);
    // Also write localStorage for legacy/fallback compatibility
    try { localStorage.setItem(LANG_COOKIE, code); } catch {}
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>): string => {
      let str = MESSAGES[lang]?.[key] ?? MESSAGES.en[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        });
      }
      return str;
    },
    [lang],
  );

  const language = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, language, languages: SUPPORTED_LANGUAGES, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Shorthand: returns just the `t` function */
export function useT() {
  return useContext(LanguageContext).t;
}
