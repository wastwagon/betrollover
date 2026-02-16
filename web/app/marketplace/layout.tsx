import type { Metadata } from 'next';
import { SITE_URL, getAfricaAlternates } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Marketplace',
  description:
    'Browse verified football tips and predictions from top tipsters. Free and premium picks with escrow protection. Ghana, Nigeria, Kenya, South Africa.',
  alternates: {
    canonical: `${SITE_URL}/marketplace`,
    languages: getAfricaAlternates('/marketplace'),
  },
  openGraph: {
    url: `${SITE_URL}/marketplace`,
    title: 'Tipster Marketplace | BetRollover',
    description:
      'Browse verified football tips from top tipsters. Escrow-protected purchases—win or get your money back.',
  },
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
