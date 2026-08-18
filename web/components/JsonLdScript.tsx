import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, TELEGRAM_ADS_URL, PLAY_STORE_URL, APP_STORE_URL } from '@/lib/site-config';

const sameAs = [TELEGRAM_ADS_URL, PLAY_STORE_URL, APP_STORE_URL].filter(Boolean);

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/BetRollover-logo.png` },
    description: SITE_DESCRIPTION,
    areaServed: [
      { '@type': 'Country', name: 'Ghana' },
      { '@type': 'Country', name: 'Nigeria' },
      { '@type': 'Country', name: 'Kenya' },
      { '@type': 'Country', name: 'South Africa' },
      { '@type': 'Country', name: 'United Kingdom' },
      { '@type': 'Country', name: 'United States' },
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
