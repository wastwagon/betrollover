import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';

const footballOnly = isFootballOnlyDiscovery();

export const metadata: Metadata = {
  title: 'Community Chat — BetRollover',
  description: footballOnly
    ? 'Join the BetRollover community. Discuss football predictions and escrow-protected picks with verified tipsters — Africa and global match fans welcome.'
    : 'Join the BetRollover community. Discuss football, basketball, tennis, and all sports with verified tipsters and fellow enthusiasts in real time.',
  openGraph: {
    title: 'Community Chat — BetRollover',
    description: footballOnly
      ? 'Real-time chat for football predictions and tipsters across Africa and worldwide.'
      : 'Real-time chat rooms for every sport. Join the conversation with tipsters and members.',
    url: `${SITE_URL}/community`,
    type: 'website',
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
