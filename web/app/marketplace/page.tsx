import { Suspense } from 'react';
import { HubCrawlLinks } from '@/components/seo/HubCrawlLinks';
import { FOOTBALL_SPORT_KEY, isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { getLocale } from '@/lib/i18n';
import { fetchMarketplaceHub, firstSearchParam } from '@/lib/seo/hub-public-data';
import MarketplaceClient from './MarketplaceClient';

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
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
          const title = typeof item.title === 'string' && item.title.trim() ? item.title : `Pick ${id}`;
          return [{ href: `/coupons/${id}`, text: title }];
        })}
      />
      <Suspense fallback={null}>
        <MarketplaceClient
          initialPicks={data.items}
          initialTotal={data.total}
          initialHasMore={data.hasMore}
        />
      </Suspense>
    </>
  );
}
