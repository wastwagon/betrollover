import type { Metadata } from 'next';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { getLocale } from '@/lib/i18n';

const TITLE = 'Acca Generator — Football Accumulator Tips';
const DESCRIPTION =
  'Build same-day football accumulator tips from synced odds. Sign in free, choose Sure, Safe, Medium, or High odd bands, generate a slip, and publish a marketplace pick. Educational tool — 18+.';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
      'football accumulator tips',
      'acca generator',
      'football accumulator builder',
      'same day acca',
      'buy accumulator tips',
      'football tips Ghana',
    ],
    alternates: seoAlternates('/acca-generator', locale),
    openGraph: {
      url: localizedUrl('/acca-generator', locale),
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
}

const ACCA_FAQS = [
  {
    question: 'What is the BetRollover Acca Generator?',
    answer:
      'It is a free same-day football accumulator builder for signed-in users. It picks legs from synced odds within Sure, Safe, Medium, or High risk bands. You can generate a sample slip and optionally publish it as a marketplace pick.',
  },
  {
    question: 'Do I need VIP to use Acca Generator?',
    answer:
      'No. Sign in with a free account to generate and publish. A daily generation limit still applies. VIP subscriptions are separate tipster plans.',
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
