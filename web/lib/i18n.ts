/**
 * Server-side i18n utility  (import ONLY in Server Components / Route Handlers)
 *
 * Usage in a Server Component:
 *   import { getLocale, serverT } from '@/lib/i18n';
 *   const locale = getLocale();
 *   const title = serverT('home.hero_title', locale);
 */
import { headers } from 'next/headers';
import type { SupportedLanguage } from '@/context/LanguageContext';
import en from './translations/en';
import fr from './translations/fr';

export type { SupportedLanguage };

const MESSAGES: Record<SupportedLanguage, Record<string, string>> = { en, fr };

/**
 * Read the current request locale that was injected by middleware.
 * Safe to call in any Server Component; falls back to 'en' if called
 * outside a request context (e.g. during static generation without params).
 */
export async function getLocale(): Promise<SupportedLanguage> {
  try {
    const h = await headers();
    const locale = h.get('x-locale') as SupportedLanguage | null;
    if (locale && MESSAGES[locale]) return locale;
  } catch {
    // headers() throws outside a request scope — that's fine for static pages
  }
  return 'en';
}

/** Return the full translation dictionary for a locale. */
export function getDictionary(locale: SupportedLanguage = 'en'): Record<string, string> {
  return MESSAGES[locale] ?? MESSAGES.en;
}

/**
 * Translate a single key server-side.
 *
 * @param key    - Translation key (e.g. 'home.hero_title')
 * @param locale - Explicit locale; omit to auto-detect from request headers.
 * @param vars   - Optional interpolation map for {variable} placeholders.
 */
export function serverT(
  key: string,
  locale?: SupportedLanguage,
  vars?: Record<string, string>,
): string {
  // When locale is omitted, caller must use getLocale(); we cannot await here in sync context
  const lang = locale ?? 'en';
  const dict = MESSAGES[lang] ?? MESSAGES.en;
  let str = dict[key] ?? MESSAGES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return str;
}

/**
 * Build a bound `t()` shorthand for a specific locale.
 * Useful when a Server Component needs many translations at once.
 *
 * @example
 *   const t = buildT('fr');
 *   const title = t('home.hero_title');
 */
export function buildT(locale: SupportedLanguage) {
  return (key: string, vars?: Record<string, string>) => serverT(key, locale, vars);
}
