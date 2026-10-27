/** Pipe-separated keyword lists in i18n (`seo.*_keywords`). */
export function metaKeywordsFromTranslation(raw: string): string[] {
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}
