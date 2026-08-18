import { HubCrawlLinks } from '@/components/seo/HubCrawlLinks';
import { getLocale } from '@/lib/i18n';
import { fetchLeaderboardHub } from '@/lib/seo/hub-public-data';
import LeaderboardClient from './LeaderboardClient';

export default async function LeaderboardPage() {
  const [locale, entries] = await Promise.all([getLocale(), fetchLeaderboardHub()]);

  return (
    <>
      <HubCrawlLinks
        locale={locale}
        label="Leaderboard"
        links={entries.flatMap((row) => {
          const username = typeof row.username === 'string' ? row.username : '';
          if (!username) return [];
          const name =
            typeof row.display_name === 'string' && row.display_name.trim()
              ? row.display_name
              : username;
          return [{ href: `/tipsters/${username}`, text: name }];
        })}
      />
      <LeaderboardClient initialEntries={entries} />
    </>
  );
}
