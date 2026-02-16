import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard',
          '/profile',
          '/wallet',
          '/my-picks',
          '/my-purchases',
          '/notifications',
          '/create-pick',
          '/api-proxy/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard',
          '/profile',
          '/wallet',
          '/my-picks',
          '/my-purchases',
          '/notifications',
          '/create-pick',
          '/api-proxy/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
