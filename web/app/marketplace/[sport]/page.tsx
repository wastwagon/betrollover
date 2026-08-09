import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-config';

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
 * Keeps shareable sport URLs while the main page owns sticky discovery chrome.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
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
  if (normalized && (VALID_SPORTS as readonly string[]).includes(normalized)) {
    redirect(`/marketplace?sport=${encodeURIComponent(normalized)}`);
  }
  redirect('/marketplace');
}
