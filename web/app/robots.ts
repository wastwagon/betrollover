import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';

const PRIVATE_PATHS = [
  '/admin/',
  '/fr/admin/',
  '/dashboard',
  '/fr/dashboard',
  '/profile',
  '/fr/profile',
  '/wallet',
  '/fr/wallet',
  '/my-picks',
  '/fr/my-picks',
  '/my-purchases',
  '/fr/my-purchases',
  '/notifications',
  '/fr/notifications',
  '/create-pick',
  '/fr/create-pick',
  '/earnings',
  '/fr/earnings',
  '/forgot-password',
  '/fr/forgot-password',
  '/verify-email',
  '/fr/verify-email',
  '/api-proxy/',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
