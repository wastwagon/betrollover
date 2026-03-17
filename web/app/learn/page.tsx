import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { SITE_NAME } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';

export default async function LearnPage() {
  const locale = await getLocale();
  const t = buildT(locale);
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main>
        <article className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-3">
            {t('learn.education')}
          </p>
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--text)] mb-4">
            {t('learn.page_title')}
          </h1>
          <p className="text-lg text-[var(--text-muted)] leading-relaxed mb-10">
            {t('learn.page_intro', { site: SITE_NAME })}
          </p>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-12 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold mb-4">{t('learn.section_platform')}</h2>
              <p>
                {SITE_NAME} is a tipster marketplace: analysts publish their picks as &quot;coupons&quot; and you can buy or get free access. 
                Every paid purchase is held in <strong>escrow</strong> until the coupon settles. If the tipster&apos;s picks lose, your money is refunded to your wallet. 
                If they win, the tipster earns their share. That protection is what makes the platform different from simple tip sheets — you only pay when the picks deliver.
              </p>
              <p>
                <strong>Settlement</strong> is automatic: we use official data (API-Sports, The Odds API) to mark each pick as won, lost, or void. 
                A coupon wins only if every non-void pick wins. All tipsters are <strong>verified</strong>; performance stats (win rate, ROI, streak) are calculated from settled results only, so you see real track records.
              </p>
              <p>
                For more detail, see <Link href="/how-it-works" className="text-[var(--primary)] hover:underline">How it works</Link> and our <Link href="/how-it-works#faq" className="text-[var(--primary)] hover:underline">FAQs</Link>.
              </p>
            </section>

            <section id="glossary">
              <h2 className="text-xl font-semibold mb-4">{t('learn.section_glossary')}</h2>
              <dl className="space-y-5">
                <div>
                  <dt className="font-semibold text-[var(--text)]">Escrow</dt>
                  <dd className="mt-1 text-[var(--text-muted)]">
                    Your payment is held by the platform until the coupon settles. The tipster does not receive it until results are in. 
                    If the picks lose, the amount you paid for the coupon is refunded to your wallet. Escrow protects buyers and keeps tipsters accountable.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">ROI (Return on Investment)</dt>
                  <dd className="mt-1 text-[var(--text-muted)]">
                    The tipster&apos;s profit or loss as a percentage of what was staked (or paid for picks). 
                    A positive ROI over many settled coupons indicates the tipster has added value. We show ROI so you can compare tipsters objectively.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">Win rate</dt>
                  <dd className="mt-1 text-[var(--text-muted)]">
                    The percentage of a tipster&apos;s picks that won (out of all settled picks). 
                    Win rate alone doesn&apos;t tell you everything — a 60% win rate on low odds is different from 60% on value picks — so we pair it with ROI and streak.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">Accumulator (acca)</dt>
                  <dd className="mt-1 text-[var(--text-muted)]">
                    A single coupon that combines multiple picks (e.g. 3 match winners). The coupon wins only if every pick wins. 
                    Accumulators offer higher potential returns but are harder to land; tipsters often mix single picks and accas.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">Settlement</dt>
                  <dd className="mt-1 text-[var(--text-muted)]">
                    The process of marking each pick as won, lost, or void after the event finishes. We use official sources so results are fair and consistent. 
                    Once settled, escrow is released (to the tipster if the coupon won, or refunded to you if it lost).
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">Void</dt>
                  <dd className="mt-1 text-[var(--text-muted)]">
                    A pick that is cancelled (e.g. match abandoned, no official result). It doesn&apos;t count as a win or a loss. 
                    In an accumulator, the void pick is typically ignored when deciding if the coupon wins.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">Coupon</dt>
                  <dd className="mt-1 text-[var(--text-muted)]">
                    A tipster&apos;s published set of picks (one or more selections). You buy or unlock a coupon to see the picks. 
                    Each coupon has a price (including free), and once you purchase, it&apos;s held in escrow until settlement.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--text)]">Tipster</dt>
                  <dd className="mt-1 text-[var(--text-muted)]">
                    A verified analyst who publishes picks on the platform. Tipsters are vetted; their win rate, ROI, and streak are shown so you can compare and follow the ones that match your style.
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">{t('learn.section_evaluate')}</h2>
              <p className="mb-4">
                Before you buy a coupon or follow a tipster, use the stats we show to make an informed choice:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Track record</strong> — Look at win rate and ROI over a decent number of settled coupons. A small sample can be luck; 50+ settled picks give a clearer picture.</li>
                <li><strong>Consistency</strong> — Streak and recent form show whether performance is stable. Some tipsters excel in one sport; check their history in the sport you care about.</li>
                <li><strong>Transparency</strong> — All our tipsters are verified and their results are based on settled outcomes only. No hiding losses or cherry-picking.</li>
                <li><strong>Price vs value</strong> — Free coupons let you try a tipster; paid coupons often reflect confidence or demand. Compare what you pay to the tipster&apos;s ROI and your own budget.</li>
              </ul>
              <p className="mt-4">
                Browse the <Link href="/leaderboard" className="text-[var(--primary)] hover:underline">leaderboard</Link> to see top performers by ROI and win rate, and the <Link href="/marketplace" className="text-[var(--primary)] hover:underline">marketplace</Link> to compare live coupons.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">{t('learn.section_marketplace')}</h2>
              <p className="mb-4">
                The marketplace is where tipsters list their coupons. Here&apos;s how to use it well:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Filter by sport</strong> — Focus on football, basketball, tennis, MMA, or another sport you follow. You can compare tipsters within that sport.</li>
                <li><strong>Compare stats</strong> — Win rate, ROI, and streak are on every tipster card. Use them to shortlist who fits your risk and style.</li>
                <li><strong>Free vs paid</strong> — Many tipsters offer free coupons so you can test their style. Paid coupons often come with higher stakes or more selective picks.</li>
                <li><strong>Escrow protection</strong> — Every purchase is protected. If the coupon loses, you get a refund. There&apos;s no need to &quot;claim&quot; — it&apos;s automatic.</li>
              </ul>
              <p className="mt-4">
                New to the platform? Start with <Link href="/how-it-works" className="text-[var(--primary)] hover:underline">How it works</Link> and the <Link href="/how-it-works#faq" className="text-[var(--primary)] hover:underline">FAQs</Link>, then explore the <Link href="/marketplace" className="text-[var(--primary)] hover:underline">marketplace</Link> or <Link href="/discover" className="text-[var(--primary)] hover:underline">Discover</Link> for news and strategy guides.
              </p>
            </section>

            <div className="mt-10 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
              <p className="font-semibold text-[var(--text)] mb-2">{t('learn.cta_ready')}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/marketplace"
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  {t('learn.cta_marketplace')}
                </Link>
                <Link
                  href="/how-it-works"
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {t('learn.cta_how_it_works')}
                </Link>
                <Link
                  href="/discover"
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {t('learn.cta_discover')}
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
