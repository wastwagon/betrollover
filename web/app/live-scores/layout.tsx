import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';

const TITLE = 'Live Football Scores | Match Centre';
const DESCRIPTION =
  'Follow live football scores, kickoff times, and match status. Jump from headline fixtures to marketplace picks on BetRollover.';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: seoAlternates('/live-scores', locale),
    openGraph: {
      url: localizedUrl('/live-scores', locale),
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Live Scores' }],
    },
  };
}

export default function LiveScoresLayout({ children }: { children: React.ReactNode }) {
  return children;
}
