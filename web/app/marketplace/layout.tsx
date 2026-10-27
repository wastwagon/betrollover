import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { getLocale, serverT } from '@/lib/i18n';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const footballOnly = isFootballOnlyDiscovery();
  const titleKey = footballOnly ? 'seo.marketplace_title' : 'seo.marketplace_title_multisport';
  const descKey = footballOnly ? 'seo.marketplace_desc' : 'seo.marketplace_desc_multisport';
  const title = serverT(titleKey, locale);
  const description = serverT(descKey, locale);
  const kwKey = footballOnly ? 'seo.marketplace_keywords' : 'seo.marketplace_keywords_multisport';
  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(serverT(kwKey, locale)),
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
