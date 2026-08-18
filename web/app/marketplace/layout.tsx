import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.marketplace_title', locale),
    description: serverT('seo.marketplace_desc', locale),
    alternates: seoAlternates('/marketplace', locale),
    openGraph: {
      url: localizedUrl('/marketplace', locale),
      title: serverT('seo.marketplace_title', locale),
      description: serverT('seo.marketplace_desc', locale),
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Marketplace' }],
    },
  };
}

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
