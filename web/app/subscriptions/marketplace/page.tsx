'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { getApiUrl, getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { fetchSellingThresholds, type SellingThresholds, SELLING_THRESHOLDS_FALLBACK } from '@/lib/selling-thresholds';
import { useT } from '@/context/LanguageContext';

interface MarketplaceItem {
  package: {
    id: number;
    name: string;
    price: number;
    durationDays: number;
    roiGuaranteeMin: number | null;
    roiGuaranteeEnabled: boolean;
  };
  tipster: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    /** Present when API returns it (human vs AI badge). */
    isAi?: boolean;
    bio: string | null;
    profileRoi: number | null;
    profileWinRate: number | null;
    totalPredictions: number;
    currentStreak: number;
    bestStreak: number;
  } | null;
  performance: {
    roi: number;
    winRate: number;
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    totalEarnings: number;
  } | null;
}

export default function SubscriptionMarketplacePage() {
  const t = useT();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<SellingThresholds>(SELLING_THRESHOLDS_FALLBACK);

  useEffect(() => {
    void fetchSellingThresholds().then(setThresholds);
  }, []);

  useEffect(() => {
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/subscriptions/marketplace?limit=48`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page w-full min-w-0">
        <PageHeader
          label={t('nav.subscription_marketplace')}
          title={t('subscriptions.marketplace_title')}
          tagline={t('subscriptions.marketplace_tagline')}
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <LoadingSkeleton key={i} count={1} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={t('subscriptions.marketplace_empty_title')}
              description={t('subscriptions.marketplace_empty_desc')}
              actionLabel={t('nav.tipsters')}
              actionHref="/tipsters"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {items.map((row) => {
              const pkg = row.package;
              const tip = row.tipster;
              const perf = row.performance;
              const settled = (perf?.wonPicks ?? 0) + (perf?.lostPicks ?? 0);
              const roiDisplay = settled > 0 && perf ? `${Number(perf.roi).toFixed(1)}%` : '—';
              const wrDisplay = settled > 0 && perf ? `${Number(perf.winRate).toFixed(1)}%` : '—';
              const hasCommittedRoi = pkg.roiGuaranteeEnabled && pkg.roiGuaranteeMin != null;
              const committedRoiValue =
                pkg.roiGuaranteeMin != null ? `${Number(pkg.roiGuaranteeMin).toFixed(1)}%` : '—';

              return (
      <article
        key={pkg.id}
        className="card-gradient rounded-2xl border border-[var(--border)] shadow-lg overflow-hidden flex flex-col w-full min-w-0 max-w-full hover:shadow-xl hover:-translate-y-px transition-[box-shadow,transform] duration-200 ease-out"
      >
                  <div className="p-4 sm:p-5 flex flex-col flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3 min-w-0">
                      <Link href={tip ? `/tipsters/${tip.username}` : '#'} className="shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
                          {tip?.avatarUrl ? (
                            <Image
                              src={getAvatarUrl(tip.avatarUrl, 56)!}
                              alt=""
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                              unoptimized={shouldUnoptimizeGoogleAvatar(getAvatarUrl(tip.avatarUrl, 56))}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[var(--primary)] bg-[var(--primary-light)]">
                              {(tip?.displayName || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={tip ? `/tipsters/${tip.username}` : '#'} className="font-semibold text-[var(--text)] truncate block">
                            {tip?.displayName ?? 'Tipster'}
                          </Link>
                          {tip?.isAi === true && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
                              AI
                            </span>
                          )}
                        </div>
                        {tip?.username && (
                          <p className="text-xs text-[var(--text-muted)]">@{tip.username}</p>
                        )}
                      </div>
                    </div>

                    {tip?.bio && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">{tip.bio}</p>
                    )}

                    <div className="rounded-xl bg-[var(--bg-warm)]/80 border border-[var(--border)]/60 p-3 mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        {t('subscriptions.performance_heading')}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-[var(--text-muted)] text-xs block">{t('tipster.roi')}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{roiDisplay}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] text-xs block">{t('tipster.win_rate')}</span>
                          <span className="font-bold text-[var(--text)]">{wrDisplay}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[var(--text-muted)] text-xs block">{t('subscriptions.picks_record')}</span>
                          <span className="font-medium text-[var(--text)]">
                            {perf
                              ? `${perf.totalPicks} ${t('subscriptions.picks_total')} · ${perf.wonPicks}W-${perf.lostPicks}L`
                              : '—'}
                          </span>
                        </div>
                        {tip != null && (tip.currentStreak > 0 || tip.bestStreak > 0) && (
                          <div className="sm:col-span-2 text-xs text-[var(--text-muted)]">
                            {t('tipster.streak')}: {tip.currentStreak} · {t('tipster.best_streak')}: {tip.bestStreak}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] pt-3 mt-auto">
                      <h3 className="font-semibold text-[var(--text)] text-sm mb-1">{pkg.name}</h3>
                      <p className="text-lg font-bold text-[var(--primary)]">
                        GHS {Number(pkg.price).toFixed(2)}{' '}
                        <span className="text-sm font-normal text-[var(--text-muted)]">/ {pkg.durationDays}d</span>
                      </p>
                      <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-warm)]/70 px-3 py-2">
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] min-w-0">
                            {t('subscriptions.roi_guarantee_label')}
                          </span>
                          <span
                            className={`self-start sm:self-auto shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              hasCommittedRoi
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {hasCommittedRoi
                              ? t('subscriptions.roi_commitment_committed')
                              : t('subscriptions.roi_commitment_not_committed')}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text)] mt-1">
                          {hasCommittedRoi
                            ? t('subscriptions.roi_target_delivery', { n: committedRoiValue })
                            : t('subscriptions.roi_target_unpublished')}
                        </p>
                      </div>
                      <Link
                        href={`/subscriptions/checkout?packageId=${pkg.id}`}
                        className="mt-3 w-full inline-flex items-center justify-center py-2.5 rounded-xl font-semibold text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                      >
                        {t('subscriptions.subscribe_cta')}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)] mt-8 text-center max-w-2xl mx-auto leading-relaxed">
          {t('subscriptions.marketplace_footnote', {
            minRoi: String(thresholds.minimumROI),
            minWr: String(thresholds.minimumWinRate),
          })}
        </p>
      </main>
      <AppFooter />
    </div>
  );
}
