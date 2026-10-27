import {
  firstMatchPathInSitemapXml,
  validateSportsEventJsonLdInHtml,
} from './gsc-sports-event-jsonld.util';

describe('validateSportsEventJsonLdInHtml', () => {
  const goodPayload = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: 'A vs B',
    startDate: '2026-10-27T18:00:00.000Z',
    endDate: '2026-10-27T19:45:00.000Z',
    description: 'Match centre',
    image: ['https://betrollover.com/og-image.png'],
    eventStatus: 'https://schema.org/EventScheduled',
    organizer: { '@type': 'Organization', name: 'BetRollover' },
    location: {
      '@type': 'Place',
      name: 'Premier League',
      address: { '@type': 'PostalAddress', addressLocality: 'England', addressCountry: 'GB' },
    },
  };

  it('passes a complete SportsEvent', () => {
    const html = `<script type="application/ld+json">${JSON.stringify(goodPayload)}</script>`;
    expect(validateSportsEventJsonLdInHtml(html).ok).toBe(true);
  });

  it('fails when location has no address', () => {
    const bad = {
      ...goodPayload,
      location: { '@type': 'Place', name: 'International' },
    };
    const html = `<script type="application/ld+json">${JSON.stringify(bad)}</script>`;
    const r = validateSportsEventJsonLdInHtml(html);
    expect(r.ok).toBe(false);
    expect(r.detail).toMatch(/location\.address/);
  });

  it('fails on nested superEvent SportsEvent', () => {
    const bad = {
      ...goodPayload,
      superEvent: { '@type': 'SportsEvent', name: 'League' },
    };
    const html = `<script type="application/ld+json">${JSON.stringify(bad)}</script>`;
    const r = validateSportsEventJsonLdInHtml(html);
    expect(r.ok).toBe(false);
    expect(r.detail).toMatch(/superEvent/);
  });
});

describe('firstMatchPathInSitemapXml', () => {
  it('extracts first match path', () => {
    const xml = `<urlset><url><loc>https://betrollover.com/matches/2065892</loc></url></urlset>`;
    expect(firstMatchPathInSitemapXml(xml)).toBe('/matches/2065892');
  });
});
