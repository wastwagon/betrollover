import type { Metadata } from 'next';
import { SITE_URL, getAlternates } from '@/lib/site-config';
import { FaqJsonLd } from '@/components/FaqJsonLd';

const TITLE = 'Football Acca Generator | Same-Day Accumulator Builder';
const DESCRIPTION =
  'Build same-day football accumulators from synced odds. Choose Safe, Medium, or High risk bands, pick available markets, generate a slip, and publish a free marketplace pick. Educational tool — 18+.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'acca generator',
    'football accumulator builder',
    'same day acca',
    'football tips Ghana',
    'BetRollover acca',
    'free football picks',
  ],
  alternates: {
    canonical: `${SITE_URL}/acca-generator`,
    languages: getAlternates('/acca-generator'),
  },
  openGraph: {
    url: `${SITE_URL}/acca-generator`,
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BetRollover Acca Generator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

const ACCA_FAQS = [
  {
    question: 'What is the BetRollover Acca Generator?',
    answer:
      'It is a same-day football accumulator builder that picks legs from synced odds within Safe, Medium, or High risk bands. You can generate a sample slip and optionally publish it as a free marketplace pick.',
  },
  {
    question: 'Do I need an account to use Acca Generator?',
    answer:
      'Yes. Sign in to generate and publish. The page is publicly described for discovery; the tool itself requires a BetRollover account.',
  },
  {
    question: 'Are Acca Generator slips guaranteed tips?',
    answer:
      'No. Risk levels are odd bands only. Outputs are educational and informational — not sure bets. Gamble responsibly. 18+ only.',
  },
];

export default function AccaGeneratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FaqJsonLd faqs={ACCA_FAQS} />
      {children}
    </>
  );
}
