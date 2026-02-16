/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';
    if (api.startsWith('http') && api.includes('localhost')) {
      return [{ source: '/api-proxy/:path*', destination: `${api}/:path*` }];
    }
    return [];
  },
};

module.exports = nextConfig;
