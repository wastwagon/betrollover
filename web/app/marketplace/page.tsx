import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HubCrawlLinks } from '@/components/seo/HubCrawlLinks';
import { FOOTBALL_SPORT_KEY, isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { getLocale, buildT, serverT } from '@/lib/i18n';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';
import { couponDisplayTitle, type PublicCouponMeta } from '@/lib/seo/public-content';
import { fetchMarketplaceHub, firstSearchParam } from '@/lib/seo/hub-public-data';
import MarketplaceClient from './MarketplaceClient';

function hasThinFilterContent(sp: Record<string, string | string[] | undefined>): boolean {
  const tipster = firstSearchParam(sp, 'tipster');
  const priceFilter = firstSearchParam(sp, 'priceFilter');
  const day = firstSearchParam(sp, 'day');
  const sort = firstSearchParam(sp, 'sort');
  const sport = firstSearchParam(sp, 'sport');
  // Any filter query beyond the bare marketplace gets a self-canonical to /marketplace + noindex
  // so thin filtered shells do not compete with the main hub.
  if (tipster || (priceFilter && priceFilter !== 'all') || (day && day !== 'all')) return true;
  if (sort && sort !== 'newest') return true;
  if (sport && !isFootballOnlyDiscovery()) return true;
  return false;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const footballOnly = isFootballOnlyDiscovery();
  const titleKey = footballOnly ? 'seo.marketplace_title' : 'seo.marketplace_title_multisport';
  const descKey = footballOnly ? 'seo.marketplace_desc' : 'seo.marketplace_desc_multisport';
  const title = serverT(titleKey, locale);
  const description = serverT(descKey, locale);
  const kwKey = footballOnly ? 'seo.marketplace_keywords' : 'seo.marketplace_keywords_multisport';
  const thin = hasThinFilterContent(sp);

  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(serverT(kwKey, locale)),
    alternates: seoAlternates('/marketplace', locale),
    robots: thin
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      url: localizedUrl('/marketplace', locale),
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Marketplace' }],
    },
  };
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const t = buildT(locale);
  const footballOnly = isFootballOnlyDiscovery();
  const sport = footballOnly ? FOOTBALL_SPORT_KEY : firstSearchParam(sp, 'sport');
  const tipster = firstSearchParam(sp, 'tipster');
  const priceFilter = firstSearchParam(sp, 'priceFilter');
  const data = await fetchMarketplaceHub({ sport, tipster, priceFilter });

  return (
    <>
      <HubCrawlLinks
        locale={locale}
        label="Marketplace picks"
        links={data.items.flatMap((item) => {
          const id = item.id;
          if (typeof id !== 'number') return [];
          const title = couponDisplayTitle(item as PublicCouponMeta);
          return [{ href: `/coupons/${id}`, text: title }];
        })}
      />
      <Suspense fallback={null}>
        <MarketplaceClient
          initialPicks={data.items}
          initialTotal={data.total}
          initialHasMore={data.hasMore}
          initialSettledFallback={data.showingSettledFallback === true}
          introText={t('marketplace.seo_intro')}
          pageHeading={t('seo.marketplace_title')}
        />
      </Suspense>
    </>
  );
}
