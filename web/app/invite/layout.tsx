import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `Invite & Earn | ${SITE_NAME}`,
  description: 'Invite friends to BetRollover and earn GHS 5 for every friend who makes their first purchase. Share your unique referral code today.',
  openGraph: {
    title: `Invite & Earn — Share Your Referral Code | ${SITE_NAME}`,
    description: 'Earn rewards by inviting friends to the BetRollover tipster marketplace.',
  },
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
