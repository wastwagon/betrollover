import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { FaqJsonLd } from '@/components/FaqJsonLd';
import { SITE_NAME, SITE_URL, getAlternates } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `Escrow Refund Guide | ${SITE_NAME}`,
  description:
    'Learn how escrow works for paid picks on BetRollover, including settlement flow and automatic wallet refunds.',
  alternates: {
    canonical: `${SITE_URL}/guides/escrow-refunds`,
    languages: getAlternates('/guides/escrow-refunds'),
  },
  openGraph: {
    url: `${SITE_URL}/guides/escrow-refunds`,
    title: `Escrow Refund Guide | ${SITE_NAME}`,
    description:
      'Learn how escrow works for paid picks on BetRollover, including settlement flow and automatic wallet refunds.',
  },
};

export default function EscrowRefundsGuidePage() {
  const faqs = [
    {
      question: 'When does money leave my wallet?',
      answer:
        'At purchase time, the pick price is deducted and held in escrow. It is not paid out to the tipster immediately.',
    },
    {
      question: 'When does a refund happen?',
      answer:
        'If a paid pick settles as lost, the purchase amount is automatically refunded to your wallet. No support ticket is required.',
    },
    {
      question: 'What is not covered by refunds?',
      answer:
        'Refunds apply to the pick purchase price only. They do not cover external wagering losses.',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <FaqJsonLd faqs={faqs} />
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label="Escrow"
          title="How escrow refunds work"
          tagline="A clear step-by-step view of purchase, settlement, and automatic refunds."
        />
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <h2 className="text-lg font-semibold">1) Purchase and escrow hold</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            When you buy a paid pick, funds are placed in escrow. This protects both buyer and tipster while matches are still in progress.
          </p>

          <h2 className="text-lg font-semibold mt-6">2) Settlement from official results</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            Once all selections settle, the pick result is finalized. Winning picks release escrow to the tipster according to platform rules.
          </p>

          <h2 className="text-lg font-semibold mt-6">3) Automatic refund on losing paid picks</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            If a paid pick loses, your purchase amount is credited back to wallet automatically. You can review every credit in{' '}
            <Link href="/wallet" className="text-[var(--primary)] hover:underline">
              Wallet
            </Link>{' '}
            and past picks in{' '}
            <Link href="/my-purchases" className="text-[var(--primary)] hover:underline">
              My Purchases
            </Link>
            .
          </p>

          <div className="mt-7 rounded-xl border border-emerald-300/50 bg-emerald-50/40 dark:bg-emerald-900/20 p-4">
            <p className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
              Refunds cover pick purchase price only. BetRollover is educational and does not facilitate wagering.
            </p>
          </div>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
