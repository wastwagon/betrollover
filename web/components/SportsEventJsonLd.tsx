import { SITE_URL } from '@/lib/site-config';
import type { PublicFixtureDetail } from '@/lib/match-detail';

export function SportsEventJsonLd({ match }: { match: PublicFixtureDetail }) {
  const url = `${SITE_URL}/matches/${match.id}`;
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeTeamName} vs ${match.awayTeamName}`,
    startDate: match.matchDate,
    eventStatus:
      match.status === 'FT'
        ? 'https://schema.org/EventScheduled'
        : 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: match.leagueName || match.country || 'Football',
    },
    homeTeam: {
      '@type': 'SportsTeam',
      name: match.homeTeamName,
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: match.awayTeamName,
    },
    url,
    organizer: {
      '@type': 'Organization',
      name: 'BetRollover',
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
