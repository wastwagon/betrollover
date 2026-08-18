import { HubCrawlLinks } from '@/components/seo/HubCrawlLinks';
import { getLocale } from '@/lib/i18n';
import { fetchTipstersHub, firstSearchParam } from '@/lib/seo/hub-public-data';
import TipstersClient from './TipstersClient';

export default async function TipstersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const tipsters = await fetchTipstersHub({
    search: firstSearchParam(sp, 'search'),
  });

  return (
    <>
      <HubCrawlLinks
        locale={locale}
        label="Tipsters"
        links={tipsters.flatMap((row) => {
          const username = typeof row.username === 'string' ? row.username : '';
          if (!username) return [];
          const name =
            typeof row.display_name === 'string' && row.display_name.trim()
              ? row.display_name
              : username;
          return [{ href: `/tipsters/${username}`, text: name }];
        })}
      />
      <TipstersClient initialTipsters={tipsters} />
    </>
  );
}
