import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'League tables & top scorers',
  description: 'Browse football league standings and top scorers by country and competition on BetRollover.',
};

export default function LeagueTablesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
