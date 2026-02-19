import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/** Allowed country codes (ISO 3166-1 alpha-2). Default: Ghana only. */
const DEFAULT_ALLOWED = ['GH'];

const SKIP_PATHS = [
  '/health',
  '/api/v1/health',
  '/wallet/paystack-webhook',
  '/api/v1/wallet/paystack-webhook',
  '/docs',
  '/docs-json',
];

@Injectable()
export class GeoRestrictionMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const path = req.path || req.url?.split('?')[0] || '';
    if (SKIP_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
      return next();
    }
    const isProd = process.env.NODE_ENV === 'production';
    const enabled =
      process.env.GEO_RESTRICTION_ENABLED === 'true' ||
      (isProd && process.env.GEO_RESTRICTION_ENABLED !== 'false');
    const allowedStr = process.env.GEO_ALLOWED_COUNTRIES || 'GH';
    const allowed = allowedStr.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
    const countries = allowed.length > 0 ? allowed : DEFAULT_ALLOWED;

    if (!enabled) {
      return next();
    }

    const ip = this.getClientIp(req);
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return next();
    }

    try {
      const country = await this.lookupCountry(ip);
      if (country && countries.includes(country.toUpperCase())) {
        return next();
      }
      res.status(403).json({
        statusCode: 403,
        code: 'GEO_RESTRICTED',
        message: 'This service is not available in your region.',
      });
    } catch {
      next();
    }
  }

  private getClientIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
      return first?.trim() || null;
    }
    return req.headers['x-real-ip'] as string || req.socket?.remoteAddress || null;
  }

  private async lookupCountry(ip: string): Promise<string | null> {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.countryCode || null;
  }
}
