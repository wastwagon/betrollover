import { HubCrawlLinks } from '@/components/seo/HubCrawlLinks';
import { getLocale } from '@/lib/i18n';
import { fetchLiveScoresHub } from '@/lib/seo/hub-public-data';
import LiveScoresClient from './LiveScoresClient';

function matchLinks(rows: Record<string, unknown>[]) {
  return rows.flatMap((row) => {
    const id = row.id;
    if (typeof id !== 'number') return [];
    const home = typeof row.homeTeamName === 'string' ? row.homeTeamName : 'Home';
    const away = typeof row.awayTeamName === 'string' ? row.awayTeamName : 'Away';
    return [{ href: `/matches/${id}`, text: `${home} vs ${away}` }];
  });
}

export default async function LiveScoresPage() {
  const [locale, payload] = await Promise.all([getLocale(), fetchLiveScoresHub()]);
  const links = payload
    ? matchLinks([...payload.live, ...payload.upcoming, ...payload.recent])
    : [];

  return (
    <>
      <HubCrawlLinks locale={locale} label="Live scores" links={links} />
      <LiveScoresClient initialPayload={payload} />
    </>
  );
}
