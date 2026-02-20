import type { Metadata } from 'next';
import { SITE_URL, getAfricaAlternates } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Tipsters',
  description:
    'Browse verified tipsters. Rankings shown on each card. Follow your favorites and track their performance.',
  alternates: {
    canonical: `${SITE_URL}/tipsters`,
    languages: getAfricaAlternates('/tipsters'),
  },
  openGraph: {
    url: `${SITE_URL}/tipsters`,
    title: 'Tipsters | BetRollover',
    description: 'Browse verified tipsters. Rankings on each card.',
  },
};

export default function TipstersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
