import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS, TELEGRAM_ADS_URL } from '@/lib/site-config';

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
    sameAs: [TELEGRAM_ADS_URL].filter(Boolean),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS.join(', '),
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: ['en', 'en-GH', 'en-NG', 'en-ZA', 'en-KE', 'fr'],
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/marketplace?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
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
