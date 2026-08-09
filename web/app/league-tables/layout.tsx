import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';

const TITLE = 'Football League Tables & Top Scorers';
const DESCRIPTION =
  'Browse football league standings and top scorers by country and competition. Track form before you build or buy picks on BetRollover.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/league-tables`,
    languages: getAlternates('/league-tables'),
  },
  openGraph: {
    url: `${SITE_URL}/league-tables`,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover League Tables' }],
  },
};

export default function LeagueTablesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
