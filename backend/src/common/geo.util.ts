/**
 * Resolves client IP to country using ip-api.com (free, no key, 45 req/min).
 * Returns null for localhost, private IPs, or on failure — caller should use default (e.g. Ghana).
 */
export async function resolveIpToCountry(ip: string | undefined): Promise<{ country: string; countryCode: string } | null> {
  if (!ip || typeof ip !== 'string' || !ip.trim()) return null;
  const trimmed = ip.trim();
  // Skip localhost and private ranges
  if (
    trimmed === '127.0.0.1' ||
    trimmed === '::1' ||
    trimmed.startsWith('192.168.') ||
    trimmed.startsWith('10.') ||
    trimmed.startsWith('172.16.') ||
    trimmed.startsWith('172.17.') ||
    trimmed.startsWith('172.18.') ||
    trimmed.startsWith('172.19.') ||
    trimmed.startsWith('172.2') ||
    trimmed.startsWith('172.30.') ||
    trimmed.startsWith('172.31.')
  ) {
    return null;
  }
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(trimmed)}?fields=country,countryCode`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { country?: string; countryCode?: string };
    if (data?.countryCode && data?.country) {
      return { country: data.country, countryCode: data.countryCode };
    }
    return null;
  } catch {
    return null;
  }
}

/** Converts ISO 3166-1 alpha-2 (e.g. GH) to flag emoji. */
export function countryCodeToFlagEmoji(code: string | null | undefined): string | null {
  if (!code || typeof code !== 'string' || code.length < 2) return null;
  const alpha2 = code.trim().toUpperCase().slice(0, 2);
  if (alpha2.length !== 2) return null;
  const regionalA = 0x1f1e6;
  return alpha2
    .split('')
    .map((c) => String.fromCodePoint(regionalA + (c.charCodeAt(0) - 65)))
    .join('');
}
