/** @type {import('next').NextConfig} */
/** Set NEXT_BUILD_LOW_MEMORY=1 in Docker/Coolify to limit static-gen parallelism (avoids OOM on small VPS). */
const lowMemBuild = process.env.NEXT_BUILD_LOW_MEMORY === '1';

const nextConfig = {
  reactStrictMode: true,
  ...(lowMemBuild && {
    experimental: {
      // Fewer parallel workers during static generation — avoids OOM on 2–4GB build hosts (Coolify/Docker)
      cpus: 1,
      memoryBasedWorkersCount: true,
    },
  }),
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      { protocol: 'https', hostname: 'api.betrollover.com', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '6001', pathname: '/**' },
      { protocol: 'https', hostname: 'betrollover.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media.api-sports.io', pathname: '/**' },
      // Google OAuth profile photos (next/image 400 if host not in list)
      { protocol: 'https', hostname: '**.googleusercontent.com', pathname: '/**' },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // CSP report-only: logs violations without blocking. Set CSP_REPORT_URI to collect (e.g. report-uri https://...).
      {
        key: 'Content-Security-Policy-Report-Only',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://js.paystack.co",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' https: wss:",
          "frame-src 'self' https://accounts.google.com https://appleid.apple.com https://js.paystack.co",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data:",
        ].join('; '),
      },
    ];
    const rules = [
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
