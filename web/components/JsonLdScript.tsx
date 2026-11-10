import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, TELEGRAM_ADS_URL, PLAY_STORE_URL, APP_STORE_URL } from '@/lib/site-config';

const sameAs = [TELEGRAM_ADS_URL, PLAY_STORE_URL, APP_STORE_URL].filter(Boolean);

/** Tipster marketplace — never mark as Casino / BettingService / Gambling. */
const ORG_DESCRIPTION =
  'BetRollover is a Ghana-based football tipster marketplace operated by OceanCyber. Users buy football predictions from tipsters with public settled records. Purchase-protected paid picks refund the tip price to the buyer wallet if they lose. Not a bookmaker. 18+.';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: 'OceanCyber',
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/BetRollover-logo.png` },
    image: `${SITE_URL}/og-image.png`,
    description: ORG_DESCRIPTION,
    email: 'support@betrollover.com',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@betrollover.com',
        url: `${SITE_URL}/support`,
        availableLanguage: ['English', 'French'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'dispute resolution',
        email: 'support@betrollover.com',
        url: `${SITE_URL}/support`,
        availableLanguage: ['English', 'French'],
      },
    ],
    areaServed: [
      { '@type': 'Country', name: 'Ghana' },
      { '@type': 'Country', name: 'Nigeria' },
      { '@type': 'Country', name: 'Kenya' },
      { '@type': 'Country', name: 'South Africa' },
      { '@type': 'AdministrativeArea', name: 'Francophone Africa' },
      { '@type': 'Country', name: 'United Kingdom' },
      { '@type': 'Country', name: 'United States' },
    ],
    knowsAbout: [
      'Football tipster marketplace',
      'Purchase-protected football predictions',
      'Tipster ROI and win rate leaderboard',
      'Match Winner Tips VIP subscriptions',
      '7-Day Rollover board',
      'Free Accumulator Builder for signed-in users',
      'Ghana Premier League tipster predictions',
      'Both teams to score predictions',
      'Over 2.5 goals predictions',
      'Football tips Ghana',
    ],
    sameAs,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: ['en', 'fr'],
    publisher: { '@id': `${SITE_URL}/#organization` },
    // No SearchAction: the public site has no dedicated site-search URL.
  },
];

export function JsonLdScript() {
  const graphData = {
    '@context': 'https://schema.org',
    '@graph': jsonLd.map(({ '@context': _, ...rest }) => rest),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graphData) }}
    />
  );
}
