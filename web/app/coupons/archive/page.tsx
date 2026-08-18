import { HubCrawlLinks } from '@/components/seo/HubCrawlLinks';
import { getLocale } from '@/lib/i18n';
import { fetchArchiveHub } from '@/lib/seo/hub-public-data';
import ArchiveClient from './ArchiveClient';

export default async function CouponsArchivePage() {
  const [locale, items] = await Promise.all([getLocale(), fetchArchiveHub()]);

  return (
    <>
      <HubCrawlLinks
        locale={locale}
        label="Picks archive"
        links={items.flatMap((item) => {
          const id = item.id;
          if (typeof id !== 'number') return [];
          const title = typeof item.title === 'string' && item.title.trim() ? item.title : `Pick ${id}`;
          return [{ href: `/coupons/${id}`, text: title }];
        })}
      />
      <ArchiveClient initialCoupons={items} />
    </>
  );
}
