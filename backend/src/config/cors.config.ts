import type { Request, Response } from 'express';

/** Canonical production frontends — always allowed so mis-set APP_URL does not break the live site. */
const PRODUCTION_CANONICAL_ORIGINS = ['https://betrollover.com', 'https://www.betrollover.com'];

export const CORS_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
export const CORS_ALLOWED_HEADERS =
  'Content-Type, Authorization, X-Session-Id, X-Tipster-Id, X-Requested-With, Accept, Accept-Language, sentry-trace, baggage';

export function buildAllowedOrigins(isProduction: boolean): (string | RegExp)[] {
  const allowedOrigins: (string | RegExp)[] = [];

  const addOriginWithWwwVariants = (raw: string) => {
    const clean = raw.replace(/\/$/, '');
    if (!clean) return;
    allowedOrigins.push(clean);
    if (clean.includes('//www.')) {
      allowedOrigins.push(clean.replace('//www.', '//'));
    } else if (clean.includes('://')) {
      const parts = clean.split('://');
      allowedOrigins.push(`${parts[0]}://www.${parts[1]}`);
    }
  };

  if (isProduction) {
    PRODUCTION_CANONICAL_ORIGINS.forEach(addOriginWithWwwVariants);
    const appUrl = process.env.APP_URL?.trim();
    if (appUrl) addOriginWithWwwVariants(appUrl);
  } else {
    allowedOrigins.push(
      'http://localhost:6000',
      'http://localhost:6001',
      'http://localhost:6002',
      'http://localhost:3000',
      'http://localhost:3001',
      /^https?:\/\/localhost:(6000|6001|6002|3000|3001|5173|8080)$/,
    );
    const devAppUrl = process.env.APP_URL?.trim();
    if (devAppUrl) addOriginWithWwwVariants(devAppUrl);
  }

  const extraOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];
  extraOrigins.forEach((o) => addOriginWithWwwVariants(o));

  return allowedOrigins;
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: (string | RegExp)[],
): boolean {
  if (!origin) return false;
  return allowedOrigins.some((o) => (typeof o === 'string' ? o === origin : o.test(origin)));
}

/** Set CORS response headers when Origin is whitelisted. Returns true if headers were applied. */
export function applyCorsHeaders(
  req: Request,
  res: Response,
  allowedOrigins: (string | RegExp)[],
): boolean {
  const origin = req.headers.origin;
  if (!origin || !isOriginAllowed(origin, allowedOrigins)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  return true;
}

export function getUniqueStringOrigins(allowedOrigins: (string | RegExp)[]): string[] {
  return [...new Set(allowedOrigins.filter((o): o is string => typeof o === 'string'))];
}
