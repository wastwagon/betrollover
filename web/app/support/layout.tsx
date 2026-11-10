import type { Metadata } from 'next';
import { seoAlternates, localizedUrl } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('support.title');
  const description =
    locale === 'fr'
      ? 'Contact support et litiges BetRollover : support@betrollover.com, tickets sur /support, règle de remboursement. Pas un bookmaker. 18+.'
      : 'BetRollover support and disputes: support@betrollover.com, tickets on /support, refund rule links. Tipster marketplace — not a bookmaker. 18+.';
  return {
    title,
    description,
    alternates: seoAlternates('/support', locale),
    openGraph: {
      url: localizedUrl('/support', locale),
      title,
      description,
      type: 'website',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
