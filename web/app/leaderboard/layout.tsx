import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: serverT('seo.leaderboard_title', locale),
    description: serverT('seo.leaderboard_desc', locale),
    alternates: {
      canonical: `${SITE_URL}/leaderboard`,
      languages: getAlternates('/leaderboard'),
    },
    openGraph: {
      url: `${SITE_URL}/leaderboard`,
      title: serverT('seo.leaderboard_title', locale),
      description: serverT('seo.leaderboard_desc', locale),
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Leaderboard' }],
    },
  };
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
