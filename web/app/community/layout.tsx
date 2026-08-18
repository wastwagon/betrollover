import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { getLocale } from '@/lib/i18n';

const footballOnly = isFootballOnlyDiscovery();

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = 'Community Chat';
  const description = footballOnly
    ? 'Join the BetRollover community. Discuss football predictions and escrow-protected picks with verified tipsters — Africa and global match fans welcome.'
    : 'Join the BetRollover community. Discuss football, basketball, tennis, and all sports with verified tipsters and fellow enthusiasts in real time.';
  return {
    title,
    description,
    alternates: seoAlternates('/community', locale),
    openGraph: {
      title,
      description: footballOnly
        ? 'Real-time chat for football predictions and tipsters across Africa and worldwide.'
        : 'Real-time chat rooms for every sport. Join the conversation with tipsters and members.',
      url: localizedUrl('/community', locale),
      type: 'website',
    },
    robots: { index: false, follow: true },
  };
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
