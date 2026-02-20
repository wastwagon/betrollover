import type { Metadata } from 'next';
import { SITE_URL, getAfricaAlternates } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Football News, Transfers & Betting Guides',
  description:
    'Discover the latest football news, transfer rumours, confirmed deals, and betting guides. Expert tips and strategies to sharpen your edge. Ghana, Nigeria, Kenya, South Africa.',
  alternates: {
    canonical: `${SITE_URL}/discover`,
    languages: getAfricaAlternates('/discover'),
  },
  openGraph: {
    url: `${SITE_URL}/discover`,
    title: 'Discover | BetRollover',
    description: 'Football news, transfer updates, and betting guides.',
  },
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
