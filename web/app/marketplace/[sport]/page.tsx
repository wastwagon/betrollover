import { redirect } from 'next/navigation';
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
      title: `Football Predictions & Escrow-Protected Picks | ${SITE_NAME}`,
      description: `Football predictions from verified tipsters. Escrow-protected picks for a global match audience — strong across Africa. Refunded if tips lose.`,
      robots: { index: false, follow: true },
    };
  }
  const { sport } = await params;
  const normalized = sport?.toLowerCase().trim() as (typeof VALID_SPORTS)[number];
  const label = SPORT_LABELS[normalized];
  if (!label) return { title: `Marketplace | ${SITE_NAME}` };
  return {
    title: `${label} picks | ${SITE_NAME}`,
    description: `Browse escrow-protected ${label.toLowerCase()} tips from verified tipsters on ${SITE_NAME}.`,
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
      redirect(`/marketplace?sport=${FOOTBALL_SPORT_KEY}`);
    }
    redirect('/marketplace');
  }

  if (normalized && (VALID_SPORTS as readonly string[]).includes(normalized)) {
    redirect(`/marketplace?sport=${encodeURIComponent(normalized)}`);
  }
  redirect('/marketplace');
}
