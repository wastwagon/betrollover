import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { SITE_NAME, SITE_URL, getAlternates } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `Betting Education Guides | ${SITE_NAME}`,
  description:
    'Practical guides on escrow-protected picks, wallet flows, and evaluating tipster performance before you buy.',
  alternates: {
    canonical: `${SITE_URL}/guides`,
    languages: getAlternates('/guides'),
  },
  openGraph: {
    url: `${SITE_URL}/guides`,
    title: `Betting Education Guides | ${SITE_NAME}`,
    description:
      'Practical guides on escrow-protected picks, wallet flows, and evaluating tipster performance before you buy.',
  },
};

const GUIDES = [
  {
    href: '/guides/escrow-refunds',
    title: 'How escrow refunds work on BetRollover',
    summary:
      'Understand when funds are held, when tipsters are paid, and exactly when refunds are triggered for losing picks.',
  },
  {
    href: '/guides/evaluate-tipsters',
    title: 'How to evaluate tipsters before buying picks',
    summary:
      'A practical checklist for ROI, win rate, sample size, and settled history so you can make data-led decisions.',
  },
];

export default function GuidesIndexPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <PageHeader
          label="Education"
          title="Guides for safer pick buying"
          tagline="Quick reads to help you evaluate picks and use escrow-protected purchases confidently."
        />

        <div className="space-y-4">
          {GUIDES.map((g) => (
            <article key={g.href} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text)]">{g.title}</h2>
              <p className="text-sm text-[var(--text-muted)] mt-2">{g.summary}</p>
              <Link href={g.href} className="inline-flex mt-3 text-sm font-semibold text-[var(--primary)] hover:underline">
                Read guide →
              </Link>
            </article>
          ))}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
