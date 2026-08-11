import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { NavBar } from '@/components/ios/NavBar';

/**
 * Public, indexable teaser when the visitor is not signed in.
 * The interactive generator stays behind login.
 */
export function AccaGeneratorLanding() {
  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-8rem)] bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <div className="lg:hidden -mx-1 mb-3">
            <NavBar title="Acca Generator" backHref="/" backLabel="Home" sticky={false} />
          </div>
          <div className="hidden lg:block">
            <PageHeader
              label="Tools"
              title="Acca Generator"
              tagline="Same-day football accumulators from synced odds — pick a risk band, markets, and fixture count, then generate a slip."
            />
          </div>

          <div className="mx-auto max-w-3xl space-y-6">
            <aside
              className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3.5 text-sm text-amber-950"
              role="note"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800/80">
                Educational &amp; informational · 18+
              </p>
              <p className="mt-1.5 leading-relaxed">
                Risk levels are odd bands for building sample accumulators — not sure bets. Sign in to
                generate and optionally publish a free marketplace pick. Gamble responsibly.
              </p>
            </aside>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-[var(--text)]">How it works</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-muted)]">
                <li>Choose Sure, Safe, Medium, or High (per-leg odd band).</li>
                <li>Select markets that have odds in that band today.</li>
                <li>Set how many fixtures — more legs means higher overall exposure.</li>
                <li>Generate a slip, then bet it your way or publish it free on BetRollover.</li>
              </ol>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/login?redirect=/acca-generator"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Sign in to generate
                </Link>
                <Link
                  href="/register?redirect=/acca-generator"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-emerald-400"
                >
                  Create free account
                </Link>
              </div>
              <p className="text-center text-xs text-[var(--text-muted)]">
                Already browsing picks?{' '}
                <Link href="/marketplace" className="font-medium text-emerald-700 underline underline-offset-2">
                  Open marketplace
                </Link>
                {' · '}
                <Link
                  href="/responsible-gambling"
                  className="font-medium text-emerald-700 underline underline-offset-2"
                >
                  Responsible gambling
                </Link>
              </p>
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
