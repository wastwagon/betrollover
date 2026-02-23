/**
 * Locale-routing middleware (Next.js App Router)
 *
 * Responsibilities:
 *  1. Handle language-prefixed URLs:  /fr/marketplace → rewrites to /marketplace
 *     and stamps the x-locale request header so Server Components can read it.
 *  2. Detect locale for un-prefixed paths from (a) br_language cookie then
 *     (b) Accept-Language header, (c) falls back to 'en'.
 *  3. Always injects x-locale into the forwarded request so
 *     `headers().get('x-locale')` works in any Server Component.
 *
 * URL contract (for hreflang / SEO):
 *   https://betrollover.com/            → English canonical
 *   https://betrollover.com/fr/         → French canonical
 *   https://betrollover.com/fr/marketplace → French marketplace
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'fr'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: Locale = 'en';
const LOCALE_COOKIE = 'br_language';

function isSupportedLocale(v: string): v is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

function detectLocale(req: NextRequest): Locale {
  // 1. Saved user preference (cookie)
  const cookieVal = req.cookies.get(LOCALE_COOKIE)?.value ?? '';
  if (isSupportedLocale(cookieVal)) return cookieVal;

  // 2. Browser negotiation (Accept-Language)
  const accept = req.headers.get('accept-language') ?? '';
  for (const part of accept.split(',')) {
    const tag = part.trim().split(';')[0].split('-')[0].toLowerCase();
    if (isSupportedLocale(tag)) return tag;
  }

  return DEFAULT_LOCALE;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip: Next.js internals, static assets, API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.[\w]+$/.test(pathname)          // e.g. /favicon.ico, /robots.txt
  ) {
    return NextResponse.next();
  }

  // ── Handle /fr/... or /en/... prefix ─────────────────────────────────────
  const segments = pathname.split('/');          // ['', 'fr', 'marketplace', ...]
  const firstSeg = segments[1] ?? '';

  if (isSupportedLocale(firstSeg)) {
    const locale = firstSeg;
    // Rewrite to strip the prefix so existing pages are found at their original paths
    const newPath = '/' + segments.slice(2).join('/');
    const url = req.nextUrl.clone();
    url.pathname = newPath || '/';

    const reqHeaders = new Headers(req.headers);
    reqHeaders.set('x-locale', locale);

    const response = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });
    return response;
  }

  // ── No prefix: detect locale and inject header ───────────────────────────
  const locale = detectLocale(req);
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-locale', locale);

  return NextResponse.next({ request: { headers: reqHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
