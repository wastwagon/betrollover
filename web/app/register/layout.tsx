import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = serverT('seo.register_title', locale);
  const description = serverT('seo.register_desc', locale);
  const ogAlt = serverT('seo.register_og_alt', locale);
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/register`,
      languages: getAlternates('/register'),
    },
    openGraph: {
      url: `${SITE_URL}/register`,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: '/og-image.png', alt: ogAlt }],
    },
    robots: { index: true, follow: true },
  };
}

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
