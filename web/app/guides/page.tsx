import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: 'Escrow & Tipster Evaluation Guides',
    description:
      'How-to pages: when escrow refunds fire, and how to read ROI and sample size before you buy a pick.',
    alternates: seoAlternates('/guides', locale),
    openGraph: {
      url: localizedUrl('/guides', locale),
      title: 'Escrow & Tipster Evaluation Guides',
      description:
        'How-to pages: when escrow refunds fire, and how to read ROI and sample size before you buy a pick.',
    },
  };
}

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
