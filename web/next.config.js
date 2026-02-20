/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      { protocol: 'https', hostname: 'api.betrollover.com', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '6001', pathname: '/**' },
      { protocol: 'https', hostname: 'betrollover.com', pathname: '/**' },
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
    ];
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
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
