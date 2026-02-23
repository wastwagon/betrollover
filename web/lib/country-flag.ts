/** FIFA 3-letter to ISO 3166-1 alpha-2 for flag emoji (Unicode uses alpha-2) */
const FIFA_TO_ALPHA2: Record<string, string> = {
  ENG: 'GB', SCO: 'GB', WAL: 'GB', NIR: 'GB', GBR: 'GB',
  GER: 'DE', DEU: 'DE', FRA: 'FR', ESP: 'ES', ITA: 'IT', PRT: 'PT',
  BRA: 'BR', ARG: 'AR', NED: 'NL', BEL: 'BE', URU: 'UY', SUI: 'CH',
  HRV: 'HR', DNK: 'DK', SWE: 'SE', POL: 'PL', MEX: 'MX', USA: 'US',
  GHA: 'GH', NGA: 'NG', SEN: 'SN', MAR: 'MA', EGY: 'EG', CMR: 'CM',
  CIV: 'CI', TUN: 'TN', IRL: 'IE', JPN: 'JP', KOR: 'KR', AUS: 'AU', CHN: 'CN',
};

/**
 * Converts country code (2-letter ISO or 3-letter FIFA) to flag emoji.
 * Returns null if code is invalid or unsupported.
 */
export function countryCodeToFlagEmoji(code: string | null | undefined): string | null {
  if (!code || typeof code !== 'string' || !code.trim()) return null;
  const raw = code.trim().toUpperCase();
  const alpha2 = raw.length === 2 ? raw : FIFA_TO_ALPHA2[raw] ?? null;
  if (!alpha2 || alpha2.length !== 2) return null;
  const regionalA = 0x1f1e6;
  return alpha2
    .split('')
    .map((c) => String.fromCodePoint(regionalA + (c.charCodeAt(0) - 65)))
    .join('');
}
