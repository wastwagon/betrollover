import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { SITE_NAME, SITE_URL, getAlternates } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `Tipster Evaluation Guide | ${SITE_NAME}`,
  description:
    'Use this checklist to evaluate tipsters by settled ROI, win rate, and sample size before buying paid picks.',
  alternates: {
    canonical: `${SITE_URL}/guides/evaluate-tipsters`,
    languages: getAlternates('/guides/evaluate-tipsters'),
  },
  openGraph: {
    url: `${SITE_URL}/guides/evaluate-tipsters`,
    title: `Tipster Evaluation Guide | ${SITE_NAME}`,
    description:
      'Use this checklist to evaluate tipsters by settled ROI, win rate, and sample size before buying paid picks.',
  },
};

const CHECKLIST = [
  'Check settled sample size first (avoid over-trusting tiny streaks).',
  'Compare ROI and win rate together; one metric alone can mislead.',
  'Review recent settled history, not only all-time highlights.',
  'Read pick-level archive outcomes to see volatility and drawdowns.',
  'Prefer consistent process over one-off high-odds wins.',
];

export default function EvaluateTipstersGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label="Analysis"
          title="How to evaluate tipsters before buying"
          tagline="Use this practical checklist to reduce emotion-led purchases."
        />
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-[var(--text)]">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            You can inspect tipster stats directly on profile pages and marketplace cards. The goal is not to find a perfect tipster, but to
            choose sellers with transparent, repeatable performance.
          </p>

          <h2 className="text-lg font-semibold mt-6">Evaluation checklist</h2>
          <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            {CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2 className="text-lg font-semibold mt-6">Where to verify</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            Start from{' '}
            <Link href="/tipsters" className="text-[var(--primary)] hover:underline">
              Tipster profiles
            </Link>{' '}
            for win rate, ROI, streaks, and settled history. Then check{' '}
            <Link href="/coupons/archive" className="text-[var(--primary)] hover:underline">
              settled picks archive
            </Link>{' '}
            to validate current form and risk profile.
          </p>

          <h2 className="text-lg font-semibold mt-6">Risk discipline</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
            Diversify instead of concentrating spend on one profile. Escrow protects purchase flows, but smart buyer behavior still matters for
            long-term outcomes.
          </p>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
