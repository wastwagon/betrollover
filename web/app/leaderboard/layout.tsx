import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, serverT } from '@/lib/i18n';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = serverT('seo.leaderboard_title', locale);
  const description = serverT('seo.leaderboard_desc', locale);
  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(serverT('seo.leaderboard_keywords', locale)),
    alternates: seoAlternates('/leaderboard', locale),
    openGraph: {
      url: localizedUrl('/leaderboard', locale),
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Leaderboard' }],
    },
  };
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
