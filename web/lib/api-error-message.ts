/**
 * Nest API returns `message` as a string or string[] (class-validator).
 */
export function getApiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const m = (data as { message?: unknown }).message;
  if (typeof m === 'string' && m.trim()) return m.trim();
  if (Array.isArray(m) && m.length) {
    const parts = m.map((x) => String(x).trim()).filter(Boolean);
    return parts.length ? parts.join(' ') : fallback;
  }
  return fallback;
}
