/**
 * Sanitize user-generated content for safe storage and display.
 * Strips HTML tags and limits length to prevent XSS and abuse.
 */

/** Remove any HTML/script tags from a string. */
function stripHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe.replace(/<[^>]*>/g, '').trim();
}

/** Normalize whitespace: collapse multiple spaces/newlines to single space. */
function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Sanitize plain-text UGC (bio, comment, support message, etc.).
 * - Strips HTML tags
 * - Normalizes whitespace
 * - Truncates to maxLength (default 5000)
 */
export function sanitizeText(input: string | null | undefined, maxLength = 5000): string {
  if (input == null || typeof input !== 'string') return '';
  const stripped = stripHtml(input);
  const normalized = normalizeWhitespace(stripped);
  if (maxLength <= 0) return normalized;
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

/**
 * Sanitize short text (subject, title) — stricter length.
 */
export function sanitizeShortText(input: string | null | undefined, maxLength = 255): string {
  return sanitizeText(input, maxLength);
}
