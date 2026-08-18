import { SITE_URL, localizedUrl } from '@/lib/site-config';
import type { PublicFixtureDetail } from '@/lib/match-detail';

function eventPlace(match: PublicFixtureDetail) {
  const country = (match.country || '').trim();
  const placeName = country || 'International';
  return {
    '@type': 'Place',
    name: placeName,
    ...(country
      ? {
          address: {
            '@type': 'PostalAddress',
            addressCountry: country,
          },
        }
      : {}),
  };
}

export function SportsEventJsonLd({
  match,
  url,
}: {
  match: PublicFixtureDetail;
  url?: string;
}) {
  const pageUrl = url || localizedUrl(`/matches/${match.id}`);
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeTeamName} vs ${match.awayTeamName}`,
    sport: 'Soccer',
    startDate: match.matchDate,
    eventStatus:
      match.status === 'FT' || match.status === 'AET' || match.status === 'PEN'
        ? 'https://schema.org/EventCompleted'
        : match.status === 'PST' || match.status === 'CANC'
          ? 'https://schema.org/EventCancelled'
          : 'https://schema.org/EventScheduled',
    location: eventPlace(match),
    ...(match.leagueName
      ? {
          superEvent: {
            '@type': 'SportsEvent',
            name: match.leagueName,
          },
        }
      : {}),
    homeTeam: {
      '@type': 'SportsTeam',
      name: match.homeTeamName,
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: match.awayTeamName,
    },
    url: pageUrl,
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
