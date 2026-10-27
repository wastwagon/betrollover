/**
 * Locale-routing middleware (Next.js App Router)
 *
 * URL contract (hreflang / SEO):
 *   https://betrollover.com/            → English (always)
 *   https://betrollover.com/fr/         → French
 *   https://betrollover.com/en/…        → 301 to unprefixed English
 *
 * Unprefixed paths never pick language from Accept-Language. Googlebot therefore
 * always sees English on English URLs. Returning French users who click an
 * in-app (same-origin) link are 302'd to /fr/… so footer/nav hrefs without a
 * prefix stay in French.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'fr'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_COOKIE = 'br_language';
const CRAWLER_UA =
  /Googlebot|Google-InspectionTool|bingbot|BingPreview|DuckDuckBot|Baiduspider|Yandex(Bot|Images|Render)|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|WhatsApp|Applebot|SemrushBot|AhrefsBot|DotBot|MJ12bot|PetalBot/i;

function isSupportedLocale(v: string): v is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

function isCrawler(req: NextRequest): boolean {
  return CRAWLER_UA.test(req.headers.get('user-agent') || '');
}

function isSameOriginReferer(req: NextRequest): boolean {
  const ref = req.headers.get('referer');
  if (!ref) return false;
  try {
    return new URL(ref).origin === req.nextUrl.origin;
  } catch {
    return false;
  }
}

/** Edge-cacheable marketing home (CrUX TTFB). Vary by URL (/ vs /fr), not cookies. */
function applyMarketingHomeCache(res: NextResponse, req: NextRequest, pathname: string) {
  const method = req.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return res;
  if (pathname !== '/' && pathname !== '/fr') return res;
  res.headers.set(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=600, stale-if-error=86400',
  );
  return res;
}

function withLocaleHeader(req: NextRequest, locale: Locale, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-locale', locale);
  const response = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  });
  applyMarketingHomeCache(response, req, req.nextUrl.pathname);
  return response;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.[\w]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split('/');
  const firstSeg = segments[1] ?? '';

  if (isSupportedLocale(firstSeg)) {
    const stripped = '/' + segments.slice(2).join('/');
    const newPath = stripped === '/' ? '/' : stripped.replace(/\/$/, '') || '/';

    if (firstSeg === 'en') {
      const url = req.nextUrl.clone();
      url.pathname = newPath;
      return NextResponse.redirect(url, 301);
    }

    return withLocaleHeader(req, 'fr', newPath);
  }

  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value ?? '';
  const method = req.method.toUpperCase();
  if (
    (method === 'GET' || method === 'HEAD') &&
    cookieLocale === 'fr' &&
    !isCrawler(req) &&
    isSameOriginReferer(req)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === '/' ? '/fr' : `/fr${pathname}`;
    return NextResponse.redirect(url, 302);
  }

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-locale', 'en');
  const response = NextResponse.next({ request: { headers: reqHeaders } });
  applyMarketingHomeCache(response, req, pathname);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
