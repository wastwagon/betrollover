import { SITE_URL, localizedUrl } from '@/lib/site-config';
import type { PublicFixtureDetail } from '@/lib/match-detail';
import { matchMetaDescription } from '@/lib/match-detail';

const MATCH_DURATION_MS = 105 * 60 * 1000;

function toIsoDate(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function absoluteImageUrl(path: string | null | undefined): string | undefined {
  if (!path?.trim()) return undefined;
  if (path.startsWith('http')) return path;
  const base = SITE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Place + PostalAddress — GSC requires `location` with nested `address`. */
function eventPlace(match: PublicFixtureDetail) {
  const country = (match.country || '').trim();
  const locality = country || match.leagueName?.trim() || 'International';
  return {
    '@type': 'Place' as const,
    name: match.leagueName?.trim() || `${match.homeTeamName} vs ${match.awayTeamName}`,
    address: {
      '@type': 'PostalAddress' as const,
      addressLocality: locality,
      ...(country.length >= 2 && country.length <= 3
        ? { addressCountry: country.toUpperCase() }
        : country
          ? { addressCountry: country }
          : {}),
    },
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
  const start = toIsoDate(match.matchDate);
  if (!start) return null;

  const end = new Date(start.getTime() + MATCH_DURATION_MS);
  const image =
    absoluteImageUrl(match.homeTeamLogo) ||
    absoluteImageUrl(match.awayTeamLogo) ||
    `${SITE_URL.replace(/\/$/, '')}/og-image.png`;

  const payload = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeTeamName} vs ${match.awayTeamName}`,
    description: matchMetaDescription(match),
    sport: 'Soccer',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    eventStatus:
      match.status === 'FT' || match.status === 'AET' || match.status === 'PEN'
        ? 'https://schema.org/EventCompleted'
        : match.status === 'PST' || match.status === 'CANC'
          ? 'https://schema.org/EventCancelled'
          : 'https://schema.org/EventScheduled',
    location: eventPlace(match),
    image: [image],
    performer: [
      { '@type': 'SportsTeam', name: match.homeTeamName },
      { '@type': 'SportsTeam', name: match.awayTeamName },
    ],
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
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: pageUrl,
      description: 'Free match centre — live score and tipster picks on BetRollover',
    },
    ...(match.leagueName
      ? {
          /** League context without a second nested Event (that caused duplicate GSC errors). */
          keywords: match.leagueName,
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
