import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-config';
import { FOOTBALL_SPORT_KEY, isFootballOnlyDiscovery } from '@/lib/football-only-discovery';

const VALID_SPORTS = [
  'football',
  'basketball',
  'rugby',
  'mma',
  'volleyball',
  'hockey',
  'american_football',
  'tennis',
  'multi',
] as const;

const SPORT_LABELS: Record<(typeof VALID_SPORTS)[number], string> = {
  football: 'Football',
  basketball: 'Basketball',
  rugby: 'Rugby',
  mma: 'MMA',
  volleyball: 'Volleyball',
  hockey: 'Hockey',
  american_football: 'American Football',
  tennis: 'Tennis',
  multi: 'Multi-Sport',
};

/**
 * Friendly sport hub URL: /marketplace/football → filtered marketplace.
 * Multi-sport hubs redirect away while FOOTBALL_ONLY_DISCOVERY is on.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  if (isFootballOnlyDiscovery()) {
    return {
      title: 'Buy Football Tips Today',
      description:
        'Buy today\'s paid football predictions from verified tipsters. Refunded if a paid pick loses. Compare win rate and ROI before you pay.',
      robots: { index: false, follow: true },
    };
  }
  const { sport } = await params;
  const normalized = sport?.toLowerCase().trim() as (typeof VALID_SPORTS)[number];
  const label = SPORT_LABELS[normalized];
  if (!label) return { title: 'Marketplace' };
  return {
    title: `${label} picks`,
    description: `Browse purchase-protected ${label.toLowerCase()} tips from verified tipsters on ${SITE_NAME}.`,
  };
}

export default async function MarketplaceSportPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const normalized = sport?.toLowerCase().trim();

  if (isFootballOnlyDiscovery()) {
    if (normalized === FOOTBALL_SPORT_KEY) {
      permanentRedirect(`/marketplace?sport=${FOOTBALL_SPORT_KEY}`);
    }
    permanentRedirect('/marketplace');
  }

  if (normalized && (VALID_SPORTS as readonly string[]).includes(normalized)) {
    permanentRedirect(`/marketplace?sport=${encodeURIComponent(normalized)}`);
  }
  permanentRedirect('/marketplace');
}
