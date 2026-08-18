import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';

const TITLE = 'Football League Tables & Top Scorers';
const DESCRIPTION =
  'Browse football league standings and top scorers by country and competition. Track form before you build or buy picks on BetRollover.';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: seoAlternates('/league-tables', locale),
    openGraph: {
      url: localizedUrl('/league-tables', locale),
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover League Tables' }],
    },
  };
}

export default function LeagueTablesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
