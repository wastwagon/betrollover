import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import Link from 'next/link';
import { getLocale, buildT } from '@/lib/i18n';
import { SITE_URL, SITE_NAME, getAlternates } from '@/lib/site-config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `How It Works | ${SITE_NAME}`,
  description:
    `How BetRollover works: escrow-protected picks, transparent settlement, verified tipsters. Buy tips with confidence — refunded if they lose. Create coupons and earn from your expertise.`,
  alternates: {
    canonical: `${SITE_URL}/how-it-works`,
    languages: getAlternates('/how-it-works'),
  },
};

export default async function HowItWorksPage() {
  const locale = await getLocale();
  const t = buildT(locale);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />

      <main>
        <article className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-3">
            Transparency
          </p>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-4">
            How BetRollover Works
          </h1>
          <p className="text-[var(--text-muted)] text-lg leading-relaxed mb-10">
            We built BetRollover to be transparent and fair. Here&apos;s how escrow, settlement, and tipster verification work.
          </p>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-10 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold mb-3">For Buyers: Escrow Protection</h2>
              <ol className="list-decimal pl-6 space-y-3">
                <li><strong>Browse & choose</strong> — Find verified tipsters and coupons in the marketplace. Every coupon shows win rate, ROI, and past performance.</li>
                <li><strong>Pay into escrow</strong> — When you purchase, your payment is held securely in escrow. The tipster does not receive it until the coupon settles.</li>
                <li><strong>Coupon settles</strong> — After all matches finish, we fetch official results and settle the coupon (won, lost, or void).</li>
                <li><strong>Refund if lost</strong> — If the tipster&apos;s picks lose, your purchase is refunded to your wallet. If they win, the tipster earns their share.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">For Tipsters: Earn From Your Picks</h2>
              <ol className="list-decimal pl-6 space-y-3">
                <li><strong>Get verified</strong> — Apply to become a tipster. We verify your identity and ensure you meet our standards.</li>
                <li><strong>Create coupons</strong> — Build coupons from football, basketball, tennis, MMA, and more. Set your price (including free).</li>
                <li><strong>Sales go to escrow</strong> — When someone buys your coupon, the funds are held in escrow until the coupon settles.</li>
                <li><strong>Earn on wins</strong> — If your picks win, you receive your share (minus platform commission). If they lose, the buyer is refunded.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Settlement: How We Determine Results</h2>
              <p>
                We use official data sources (API-Sports for football and volleyball, The Odds API for other sports) to fetch match results. 
                Each pick is marked won, lost, or void based on the actual outcome. A coupon wins only if all non-void picks win.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Tipster Verification</h2>
              <p>
                All tipsters on BetRollover are verified. We check identity and ensure compliance with our terms. 
                Performance stats (win rate, ROI, streak) are calculated from settled coupons only — no manipulation.
              </p>
            </section>

            <div className="mt-10 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
              <p className="font-semibold text-[var(--text)] mb-2">Ready to get started?</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/marketplace"
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Browse Marketplace
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>

          </div>
        </article>

        <div className="mt-16">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
