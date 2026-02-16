import type { Metadata } from 'next';
import { SITE_URL, getAfricaAlternates } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Predictions',
  description:
    'Football predictions and tips from verified tipsters. Daily picks, accumulators, and expert analysis for Ghana, Nigeria, Kenya, South Africa.',
  alternates: {
    canonical: `${SITE_URL}/predictions`,
    languages: getAfricaAlternates('/predictions'),
  },
  openGraph: {
    url: `${SITE_URL}/predictions`,
    title: 'Football Predictions | BetRollover',
    description: 'Daily football predictions from verified tipsters. Escrow-protected—win or refund.',
  },
};

export default function PredictionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
