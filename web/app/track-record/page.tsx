import type { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { buttonClassName } from '@/components/ui/button-styles';
import { localizedUrl, seoAlternates } from '@/lib/site-config';
import { getLocale, buildT } from '@/lib/i18n';
import { metaKeywordsFromTranslation } from '@/lib/seo/meta-keywords';
import { fetchTrustPublicStats } from '@/lib/trust-public-stats';
import { formatInteger } from '@/lib/intl-locale';

const PATH = '/track-record';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = buildT(locale);
  const title = t('track_record.meta_title');
  const description = t('track_record.meta_desc');
  return {
    title,
    description,
    keywords: metaKeywordsFromTranslation(t('track_record.meta_keywords')),
    robots: { index: true, follow: true },
    alternates: seoAlternates(PATH, locale),
    openGraph: {
      url: localizedUrl(PATH, locale),
      title,
      description,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
  };
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--text)] tabular-nums">{value}</p>
      {hint ? <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">{hint}</p> : null}
    </div>
  );
}

export default async function TrackRecordPage() {
  const locale = await getLocale();
  const t = buildT(locale);
  const stats = await fetchTrustPublicStats({ revalidate: 120 });

  const refundsGhs =
    stats && stats.purchaseProtectionRefundsGhs > 0
      ? `₵${formatInteger(stats.purchaseProtectionRefundsGhs, locale)}`
      : stats
        ? '₵0'
        : '—';

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-narrow w-full min-w-0">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
            {t('track_record.label')}
          </p>
          <h1 className="font-display text-[1.7rem] sm:text-4xl font-semibold tracking-tight text-[var(--text)] leading-tight">
            {t('track_record.title')}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
            {t('track_record.tagline')}
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <StatCard
            label={t('track_record.stat_settled')}
            value={stats ? formatInteger(stats.totalPicks, locale) : '—'}
            hint={t('track_record.stat_settled_hint')}
          />
          <StatCard
            label={t('track_record.stat_won_lost')}
            value={
              stats
                ? `${formatInteger(stats.settledWon, locale)} / ${formatInteger(stats.settledLost, locale)}`
                : '—'
            }
            hint={t('track_record.stat_won_lost_hint')}
          />
          <StatCard
            label={t('track_record.stat_win_rate')}
            value={stats ? `${stats.winRate}%` : '—'}
            hint={t('track_record.stat_win_rate_hint')}
          />
          <StatCard
            label={t('track_record.stat_refunds')}
            value={refundsGhs}
            hint={t('track_record.stat_refunds_hint', {
              count: formatInteger(stats?.purchaseProtectionRefundCount ?? 0, locale),
            })}
          />
          <StatCard
            label={t('track_record.stat_purchases')}
            value={stats ? formatInteger(stats.successfulPurchases, locale) : '—'}
            hint={t('track_record.stat_purchases_hint')}
          />
          <StatCard
            label={t('track_record.stat_tipsters')}
            value={stats ? formatInteger(stats.verifiedTipsters, locale) : '—'}
            hint={t('track_record.stat_tipsters_hint')}
          />
        </div>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-7 text-sm text-[var(--text-muted)] leading-relaxed space-y-4">
          <p>{t('track_record.body_1')}</p>
          <p>{t('track_record.body_2')}</p>
          <p>{t('track_record.body_3')}</p>
        </article>

        <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-2.5">
          <Link href="/coupons/archive" className={buttonClassName({ className: 'min-h-[48px]' })}>
            {t('track_record.cta_archive')}
          </Link>
          <Link href="/marketplace" className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}>
            {t('track_record.cta_marketplace')}
          </Link>
          <Link
            href="/guides/ghana-free-tips-vs-protected"
            className={buttonClassName({ variant: 'secondary', className: 'min-h-[48px]' })}
          >
            {t('track_record.cta_guide')}
          </Link>
          <Link href="/football-tips-ghana" className={buttonClassName({ variant: 'ghost', className: 'min-h-[48px]' })}>
            {t('footer.ghana_hub')}
          </Link>
        </div>

        <p className="mt-6 text-xs text-[var(--text-tertiary)] leading-relaxed">{t('track_record.disclaimer')}</p>
      </main>
      <AppFooter />
    </div>
  );
}
