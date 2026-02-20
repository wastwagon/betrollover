import type { Metadata } from 'next';
import { SITE_URL, getAfricaAlternates } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Discover',
  description:
    'Football news, transfer updates, and betting guides. Stay informed with the latest tips and strategies.',
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
