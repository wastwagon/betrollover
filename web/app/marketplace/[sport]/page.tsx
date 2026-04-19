import { redirect } from 'next/navigation';

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
];

/**
 * Friendly URL: /marketplace/rugby → redirects to /marketplace?sport=rugby
 * so the main marketplace page can read the filter and show that sport's picks.
 */
export default async function MarketplaceSportPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const normalized = sport?.toLowerCase().trim();
  if (normalized && VALID_SPORTS.includes(normalized)) {
    redirect(`/marketplace?sport=${encodeURIComponent(normalized)}`);
  }
  redirect('/marketplace');
}
