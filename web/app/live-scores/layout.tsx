import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';

const TITLE = 'Live Football Scores | Match Centre';
const DESCRIPTION =
  'Follow live football scores, kickoff times, and match status. Jump from headline fixtures to marketplace picks on BetRollover.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/live-scores`,
    languages: getAlternates('/live-scores'),
  },
  openGraph: {
    url: `${SITE_URL}/live-scores`,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Live Scores' }],
  },
};

export default function LiveScoresLayout({ children }: { children: React.ReactNode }) {
  return children;
}
