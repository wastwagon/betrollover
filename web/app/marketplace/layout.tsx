import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const footballOnly = isFootballOnlyDiscovery();
  const titleKey = footballOnly ? 'seo.marketplace_title' : 'seo.marketplace_title_multisport';
  const descKey = footballOnly ? 'seo.marketplace_desc' : 'seo.marketplace_desc_multisport';
  const title = serverT(titleKey, locale);
  const description = serverT(descKey, locale);
  return {
    title,
    description,
    alternates: seoAlternates('/marketplace', locale),
    openGraph: {
      url: localizedUrl('/marketplace', locale),
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Marketplace' }],
    },
  };
}

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
