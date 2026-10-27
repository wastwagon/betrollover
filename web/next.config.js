/** @type {import('next').NextConfig} */
/** Set NEXT_BUILD_LOW_MEMORY=1 in Docker/Coolify to limit static-gen parallelism (avoids OOM on small VPS). */
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL?.trim()) {
  throw new Error(
    'NEXT_PUBLIC_APP_URL must be set in production so canonicals, hreflang, JSON-LD, and sitemap do not fall back to localhost.',
  );
}

const lowMemBuild = process.env.NEXT_BUILD_LOW_MEMORY === '1';
const isProd = process.env.NODE_ENV === 'production';

const { HERO_LCP_MOBILE_AVIF, HERO_LCP_DESKTOP_AVIF } = require('./lib/marketing-assets.cjs');

function buildSecurityHeaders() {
  const headers = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    {
      key: 'Content-Security-Policy-Report-Only',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.google.com https://www.gstatic.com https://js.paystack.co https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com",
        "style-src 'self' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com",
        "connect-src 'self' https: http: ws: wss:",
        "frame-src 'self' https://accounts.google.com https://appleid.apple.com https://www.google.com https://js.paystack.co https://www.googletagmanager.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
      ].join('; '),
    },
  ];
  if (isProd) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }
  return headers;
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Smaller Coolify/Docker images: runner copies `.next/standalone` instead of all of node_modules.
  output: 'standalone',
  compiler: isProd
    ? {
        removeConsole: { exclude: ['error', 'warn'] },
      }
    : undefined,
  experimental: {
    ...(isProd ? { optimizeCss: true } : {}),
    optimizePackageImports: ['@tanstack/react-query', 'recharts'],
    ...(lowMemBuild
      ? {
          cpus: 1,
          memoryBasedWorkersCount: true,
        }
      : {}),
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Crests and avatars rarely change. Keep optimized files so crawlers do not re-fetch PNGs.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'api.betrollover.com', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '6001', pathname: '/**' },
      { protocol: 'https', hostname: 'betrollover.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media.api-sports.io', pathname: '/**' },
      // Google OAuth (explicit + wildcard — some deployments mismatch ** only)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh6.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.googleusercontent.com', pathname: '/**' },
    ],
  },
  async headers() {
    const securityHeaders = buildSecurityHeaders();
    const heroPreloadLink = [
      `<${HERO_LCP_MOBILE_AVIF}>; rel=preload; as=image; type=image/avif; fetchpriority=high; media=(max-width: 767px)`,
      `<${HERO_LCP_DESKTOP_AVIF}>; rel=preload; as=image; type=image/avif; fetchpriority=high; media=(min-width: 768px)`,
    ].join(', ');
    const rules = [
      {
        source: '/',
        headers: [
          ...securityHeaders,
          { key: 'Link', value: heroPreloadLink },
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=600, stale-if-error=86400',
          },
        ],
      },
      {
        source: '/fr',
        headers: [
          ...securityHeaders,
          { key: 'Link', value: heroPreloadLink },
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=600, stale-if-error=86400',
          },
        ],
      },
      {
        source: '/images/marketing/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/brand-mark.webp',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      // App Links / Universal Links verification: short cache so cert/bundle updates propagate
      {
        source: '/.well-known/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=600, s-maxage=600' },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
    // In production, /_next/static files have content-hash filenames so immutable
    // caching is safe. In development, filenames are stable (webpack.js, main-app.js
    // etc.) but content changes on every rebuild — applying immutable here would
    // cause browsers to serve stale chunks after a Docker restart, making webpack
    // unable to find module factories (undefined originalFactory crash).
    if (process.env.NODE_ENV === 'production') {
      rules.push({
        source: '/_next/static/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      });
    }
    return rules;
  },
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';
    if (api.startsWith('http') && api.includes('localhost')) {
      return [{ source: '/api-proxy/:path*', destination: `${api}/:path*` }];
    }
    return [];
  },
  /**
   * Canonical host: apex `betrollover.com` (matches WebView HOME_URL / SITE_URL).
   * Set SKIP_WWW_REDIRECT=1 to disable if you must serve www as primary during migration.
   */
  async redirects() {
    const copyRedirects = [
      {
        source: '/guides/escrow-refunds',
        destination: '/guides/purchase-protection',
        permanent: true,
      },
      {
        source: '/fr/guides/escrow-refunds',
        destination: '/fr/guides/purchase-protection',
        permanent: true,
      },
      {
        source: '/tipsters/VipTwoFold',
        destination: '/tipsters/SureTwoFold',
        permanent: true,
      },
      {
        source: '/tipsters/TwoFold',
        destination: '/tipsters/SureTwoFold',
        permanent: true,
      },
      {
        source: '/tipsters/AccaSureTwoFold',
        destination: '/tipsters/SureTwoFold',
        permanent: true,
      },
      {
        source: '/fr/tipsters/VipTwoFold',
        destination: '/fr/tipsters/SureTwoFold',
        permanent: true,
      },
      {
        source: '/fr/tipsters/TwoFold',
        destination: '/fr/tipsters/SureTwoFold',
        permanent: true,
      },
      {
        source: '/fr/tipsters/AccaSureTwoFold',
        destination: '/fr/tipsters/SureTwoFold',
        permanent: true,
      },
    ];
    if (process.env.SKIP_WWW_REDIRECT === '1') return copyRedirects;
    return [
      ...copyRedirects,
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.betrollover.com' }],
        destination: 'https://betrollover.com/:path*',
        permanent: true,
      },
    ];
  },
};

// Wrap with Sentry only when DSN is set (opt-in, zero impact when unset)
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
if (sentryDsn) {
  const { withSentryConfig } = require('@sentry/nextjs');
  module.exports = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG || '',
    project: process.env.SENTRY_PROJECT || '',
    silent: !process.env.CI,
  });
} else {
  module.exports = nextConfig;
}
