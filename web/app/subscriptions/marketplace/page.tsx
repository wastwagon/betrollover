'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EscrowTrustCallout } from '@/components/EscrowTrustCallout';
import { EmptyState } from '@/components/EmptyState';
import { getApiUrl, getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { fetchSellingThresholds, type SellingThresholds, SELLING_THRESHOLDS_FALLBACK } from '@/lib/selling-thresholds';
import { useT } from '@/context/LanguageContext';
import { PullToRefresh } from '@/components/ios/PullToRefresh';
import { buttonClassName } from '@/components/ui/Button';

interface MarketplaceItem {
  package: {
    id: number;
    name: string;
    price: number;
    durationDays: number;
    /** Tipster’s platform user id — used to detect an existing active subscription. */
    tipsterUserId?: number;
  };
  tipster: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    /** Present when API returns it (human vs AI badge). */
    isAi?: boolean;
    tipsterType?: string | null;
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

interface MySubscriptionRow {
  status: string;
  endsAt: string;
  package?: { tipsterUserId?: number };
}

function activeTipsterUserIdsFromSubscriptions(subs: MySubscriptionRow[]): Set<number> {
  const now = Date.now();
  const ids = new Set<number>();
  for (const s of subs) {
    if (s.status !== 'active') continue;
    const end = s.endsAt ? new Date(s.endsAt).getTime() : 0;
    if (end <= now) continue;
    const uid = s.package?.tipsterUserId;
    if (typeof uid === 'number' && Number.isFinite(uid)) ids.add(uid);
  }
  return ids;
}

export default function SubscriptionMarketplacePage() {
  const t = useT();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [meResolved, setMeResolved] = useState(false);
  const [subscribedTipsterUserIds, setSubscribedTipsterUserIds] = useState<Set<number>>(new Set());
  const [thresholds, setThresholds] = useState<SellingThresholds>(SELLING_THRESHOLDS_FALLBACK);

  useEffect(() => {
    void fetchSellingThresholds().then(setThresholds);
  }, []);

  const loadMarketplace = useCallback(async () => {
    const apiUrl = getApiUrl();
    try {
      const r = await fetch(`${apiUrl}/subscriptions/marketplace?limit=48`);
      const d = r.ok ? await r.json() : null;
      const nextItems = Array.isArray(d?.items) ? d.items : [];
      setItems(nextItems);
      setLoadError(!r.ok);
    } catch {
      setItems([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMarketplace();
  }, [loadMarketplace]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setMeResolved(true);
      return;
    }
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/subscriptions/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((raw: unknown) => {
        const subs = Array.isArray(raw) ? (raw as MySubscriptionRow[]) : [];
        setSubscribedTipsterUserIds(activeTipsterUserIdsFromSubscriptions(subs));
      })
      .catch(() => setSubscribedTipsterUserIds(new Set()))
      .finally(() => setMeResolved(true));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full">
      <UnifiedHeader />
      <main className="section-ux-page w-full min-w-0">
        <PullToRefresh onRefresh={loadMarketplace} disabled={loading}>
        <PageHeader
          label={t('nav.subscription_marketplace')}
          title={t('subscriptions.marketplace_title')}
          tagline={t('subscriptions.marketplace_tagline')}
        />
        <EscrowTrustCallout
          className="mb-6"
          title={t('marketplace.trust_callout_title')}
          body={t('marketplace.trust_callout_body')}
          linkLabel={t('home.how_it_works')}
        />

        {loading ? (
          <LoadingSkeleton
            count={6}
            variant="cards"
            className="mt-8"
            cardsGridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0"
          />
        ) : items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={
                loadError
                  ? t('subscriptions.marketplace_load_error_title')
                  : t('subscriptions.marketplace_empty_title')
              }
              description={
                loadError
                  ? t('subscriptions.marketplace_load_error_desc')
                  : t('subscriptions.marketplace_empty_desc')
              }
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
              const tipsterUid = pkg.tipsterUserId;
              const alreadySubscribed =
                typeof tipsterUid === 'number' &&
                Number.isFinite(tipsterUid) &&
                subscribedTipsterUserIds.has(tipsterUid);

              return (
      <article
        key={pkg.id}
        className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden flex flex-col w-full min-w-0 max-w-full hover:shadow-md transition-shadow duration-200 ease-out"
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
                      <p className="text-xs text-[var(--text-muted)] mt-2 leading-snug">
                        {t('subscriptions.period_end_split')}
                      </p>
                      {!meResolved ? (
                        <div
                          className="mt-3 w-full h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse"
                          aria-hidden
                        />
                      ) : alreadySubscribed ? (
                        <div className="mt-3 space-y-2">
                          <div
                            className="w-full inline-flex items-center justify-center py-2.5 rounded-xl font-semibold text-sm bg-[var(--text-muted)]/15 text-[var(--text-muted)] border border-[var(--border)] cursor-default select-none"
                            role="status"
                            aria-label={t('tipster.subscribed')}
                          >
                            {t('tipster.subscribed')}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] leading-snug">
                            {t('subscriptions.vip_already_subscribed_hint')}
                          </p>
                          <Link
                            href="/subscriptions"
                            className="block text-center text-sm font-medium text-[var(--primary)] hover:underline"
                          >
                            {t('subscriptions.page_title')} →
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/subscriptions/checkout?packageId=${pkg.id}`}
                          className={buttonClassName({ className: 'mt-3', fullWidth: true })}
                        >
                          {t('subscriptions.subscribe_cta')}
                        </Link>
                      )}
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
        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-3 text-sm max-w-2xl mx-auto px-1">
          <Link
            href="/tipsters"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            {t('nav.tipsters')}
          </Link>
          <Link
            href="/how-it-works#faq"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            {t('home.how_it_works')}
          </Link>
          <Link
            href="/guides/escrow-refunds"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            {t('subscriptions.marketplace_link_escrow')}
          </Link>
          <Link
            href="/guides/evaluate-tipsters"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            {t('subscriptions.marketplace_link_eval')}
          </Link>
        </div>
        </PullToRefresh>
      </main>
      <AppFooter />
    </div>
  );
}
