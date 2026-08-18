import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = 'Invite & Earn';
  const description =
    'Invite friends to BetRollover and earn GHS 5 for every friend who makes their first purchase. Share your unique referral code today.';
  return {
    title,
    description,
    alternates: seoAlternates('/invite', locale),
    openGraph: {
      url: localizedUrl('/invite', locale),
      title: 'Invite & Earn — Share Your Referral Code',
      description: 'Earn rewards by inviting friends to the BetRollover tipster marketplace.',
    },
  };
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
