import type { SupportedLanguage } from '@/context/LanguageContext';

/** Stable BCP-47 tags so SSR (Node) and the browser format dates the same way. */
export function intlLocaleForLanguage(lang: SupportedLanguage): string {
  return lang === 'fr' ? 'fr-FR' : 'en-GB';
}

export function formatInteger(n: number, lang: SupportedLanguage): string {
  if (n <= 0) return '0';
  return n.toLocaleString(intlLocaleForLanguage(lang));
}

export function formatDateTime(
  value: string | Date,
  lang: SupportedLanguage,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleString(intlLocaleForLanguage(lang), options);
  } catch {
    return typeof value === 'string' ? value : '';
  }
}

export function formatDateTimeShort(value: string | Date, lang: SupportedLanguage): string {
  return formatDateTime(value, lang, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTimeListRow(value: string | Date, lang: SupportedLanguage): string {
  return formatDateTime(value, lang, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
