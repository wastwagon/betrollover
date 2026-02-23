import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.marketplace_title', locale),
    description: serverT('seo.marketplace_desc', locale),
    alternates: {
      canonical: `${SITE_URL}/marketplace`,
      languages: getAlternates('/marketplace'),
    },
    openGraph: {
      url: `${SITE_URL}/marketplace`,
      title: serverT('seo.marketplace_title', locale),
      description: serverT('seo.marketplace_desc', locale),
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Marketplace' }],
    },
  };
}

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
