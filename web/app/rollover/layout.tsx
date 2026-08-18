import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { getLocale } from '@/lib/i18n';

const TITLE = '30-Day Rollover';
const DESCRIPTION =
  'Follow the public Acca Desk Sure · Over 1.5 30-day run. One free 2-fold per plan day for education — not a bookmaker payout. 18+.';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
      'football rollover',
      '30 day acca',
      'over 1.5 tips Ghana',
      'Acca Desk',
      'BetRollover rollover',
      'free football coupon',
    ],
    alternates: seoAlternates('/rollover', locale),
    openGraph: {
      url: localizedUrl('/rollover', locale),
      title: TITLE,
      description: DESCRIPTION,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover 30-Day Rollover' }],
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
    question: 'What is the 30-day rollover?',
    answer:
      'It is a public educational board. Each plan day we attach one Acca Desk Sure · Over 1.5 two-fold whose combined odds sit between 1.50 and 1.75. A win advances the day; a loss resets the table to a new campaign at Day 1. Admin may attach a later same-day slot as the next plan day. We do not pay odds or credit wallets for this board.',
  },
  {
    question: 'Is this betting on the odds?',
    answer:
      'No. BetRollover is not a bookmaker. The coupon is free tipster information. Any wager you place with a third-party bookmaker is outside this app.',
  },
  {
    question: 'What do the GHS figures mean?',
    answer:
      'They are a worked example of compounding that campaign’s example stake at ×1.60 for the first seven days only. Later days would be huge numbers, so we show ×1.60 instead. They are not payouts. The example stake is set per campaign (for example GHS 100).',
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
