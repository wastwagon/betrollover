import type { Metadata } from 'next';
import { SITE_URL, getAfricaAlternates } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description:
    'Top tipsters ranked by win rate and performance. Find the best football tipsters in Ghana, Nigeria, Kenya, and across Africa.',
  alternates: {
    canonical: `${SITE_URL}/leaderboard`,
    languages: getAfricaAlternates('/leaderboard'),
  },
  openGraph: {
    url: `${SITE_URL}/leaderboard`,
    title: 'Tipster Leaderboard | BetRollover',
    description: 'Ranked list of top-performing tipsters. Verified track records.',
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
