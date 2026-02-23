import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Community Chat — BetRollover',
  description:
    'Join the BetRollover community. Discuss football, basketball, tennis, and all sports with verified tipsters and fellow enthusiasts in real time.',
  openGraph: {
    title: 'Community Chat — BetRollover',
    description: 'Real-time chat rooms for every sport. Join the conversation with tipsters and members.',
    url: `${SITE_URL}/community`,
    type: 'website',
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
