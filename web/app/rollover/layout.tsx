import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { getLocale } from '@/lib/i18n';

const TITLE = '7-Day VIP Rollover';
const DESCRIPTION =
  'Follow the VIP · Two-Fold 7-day educational board. Live tips for subscribers; settled history is public so you can decide to join. Not a bookmaker payout. 18+.';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
      'football rollover',
      '7 day vip tips',
      'VIP Two-Fold',
      'BetRollover rollover',
      'football coupon Ghana',
    ],
    alternates: seoAlternates('/rollover', locale),
    openGraph: {
      url: localizedUrl('/rollover', locale),
      title: TITLE,
      description: DESCRIPTION,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover 7-Day VIP Rollover' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
    },
    robots: { index: true, follow: true },
  };
}

const FAQS = [
  {
    question: 'What is the 7-day VIP rollover?',
    answer:
      'It is a public educational board linked to VIP · Two-Fold. Each plan day uses one VIP two-fold. Two slips on the same day become Day N and Day N+1. A win advances the day; a loss starts a new campaign at Day 1. Live tips are for VIP subscribers; settled tips are public. We do not pay odds or credit wallets for this board.',
  },
  {
    question: 'Can I see today’s tip without a VIP subscription?',
    answer:
      'Active (pending) coupons stay locked for non-subscribers — you see a Subscribe CTA, same as marketplace VIP cards. Settled won/lost coupons are fully visible so you can judge form before joining.',
  },
  {
    question: 'Is this betting on the odds?',
    answer:
      'No. BetRollover is not a bookmaker. The coupon is tipster information. Any wager you place with a third-party bookmaker is outside this app.',
  },
  {
    question: 'What do the GHS figures mean?',
    answer:
      'They are a worked example of compounding that campaign’s example stake (default GHS 100) at the board’s target multiplier for every plan day. Day 7 shows the full-run example bank if every coupon hits. They are not payouts.',
  },
];

export default function RolloverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FaqJsonLd faqs={FAQS} />
      {children}
    </>
  );
}
