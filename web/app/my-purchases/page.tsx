'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useErrorToast } from '@/hooks/useErrorToast';
import { ErrorToast } from '@/components/ErrorToast';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';

/* ─── Types ─────────────────────────────────────────────────── */
interface PickItem {
  id: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  matchDate?: string;
  status?: string;
  sport?: string;
}

interface Tipster {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  winRate: number;
  rank: number | null;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
}

interface VipSubscriptionRow {
  id: number;
  status: string;
  startedAt: string;
  endsAt: string;
  amountPaid: number;
  package?: { name: string; price: number; durationDays?: number } | null;
}

interface Purchase {
  id: number;
  accumulatorId: number;
  purchasePrice: number;
  purchasedAt: string;
  pick?: {
    id: number;
    title: string;
    totalPicks: number;
    totalOdds: number;
    status: string;
    result: string;
    sport?: string;
    picks: PickItem[];
    tipster?: Tipster | null;
    purchaseCount?: number;
    avgRating?: number | null;
    reviewCount?: number | null;
    createdAt?: string;
  };
}

/* ─── Filters ────────────────────────────────────────────────── */
const RESULT_FILTERS = [
  { key: 'all',     labelKey: 'my_purchases.filter_all' as const,     icon: '🌍' },
  { key: 'pending', labelKey: 'my_purchases.filter_pending' as const, icon: '⏳' },
  { key: 'won',     labelKey: 'my_purchases.filter_won' as const,     icon: '✅' },
  { key: 'lost',    labelKey: 'my_purchases.filter_lost' as const,    icon: '❌' },
  { key: 'void',    labelKey: 'my_purchases.filter_void' as const,    icon: '↩️' },
] as const;
type ResultFilter = typeof RESULT_FILTERS[number]['key'];

const SPORT_CHIPS = [
  { key: 'all',               icon: '🌍', labelKey: 'my_purchases.filter_all' as const },
  { key: 'football',          icon: '⚽', labelKey: 'nav.football' as const },
  { key: 'basketball',        icon: '🏀', labelKey: 'nav.basketball' as const },
  { key: 'rugby',             icon: '🏉', labelKey: 'nav.rugby' as const },
  { key: 'mma',               icon: '🥊', labelKey: 'nav.mma' as const },
  { key: 'volleyball',        icon: '🏐', labelKey: 'nav.volleyball' as const },
  { key: 'hockey',            icon: '🏒', labelKey: 'nav.hockey' as const },
  { key: 'american_football', icon: '🏈', labelKey: 'nav.american_football' as const },
  { key: 'tennis',            icon: '🎾', labelKey: 'create_pick.sport_tennis' as const },
  { key: 'multi',             icon: '🌐', labelKey: 'pick.multi_sport' as const },
];

/* ─── Page ───────────────────────────────────────────────────── */
export default function MyPurchasesPage() {
  const router = useRouter();
  const t = useT();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vipSubscriptions, setVipSubscriptions] = useState<VipSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const { showError, clearError, error: toastError } = useErrorToast();

  const fetchPurchases = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/my-purchases');
      return;
    }
    const h = { Authorization: `Bearer ${token}` };
    return Promise.all([
      fetch(`${getApiUrl()}/accumulators/purchased`, { headers: h }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load purchases: ${r.status}`);
        return r.json();
      }),
      fetch(`${getApiUrl()}/subscriptions/me`, { headers: h }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([data, subs]) => {
        setPurchases(Array.isArray(data) ? data : []);
        setVipSubscriptions(Array.isArray(subs) ? subs : []);
      })
      .catch((err) => {
        setPurchases([]);
        setVipSubscriptions([]);
        showError(err);
      })
      .finally(() => setLoading(false));
  }, [router, showError]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  // Auto-refresh when there are active pending purchases
  useEffect(() => {
    if (purchases.length === 0 || loading) return;
    const hasActive = purchases.some(
      (p) => p.pick?.status === 'active' && p.pick?.result === 'pending',
    );
    if (!hasActive) return;
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (!token) return;
      fetch(`${getApiUrl()}/accumulators/purchased`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setPurchases(Array.isArray(data) ? data : []))
        .catch(() => {});
    }, 45_000);
    return () => clearInterval(interval);
  }, [purchases, loading]);

  /* ─── Derived stats ──────────────────────────────────────────── */
  const stats = useMemo(() => {
    const all = purchases.filter((p) => p.pick);
    return {
      total:   all.length,
      won:     all.filter((p) => p.pick?.result === 'won').length,
      lost:    all.filter((p) => p.pick?.result === 'lost').length,
      pending: all.filter((p) => p.pick?.result === 'pending').length,
      void:    all.filter((p) => p.pick?.result === 'void').length,
    };
  }, [purchases]);

  /* ─── Available sports (only show chips with at least one purchase) ── */
  const availableSports = useMemo(() => {
    const seen = new Set<string>();
    purchases.forEach((p) => {
      const s = p.pick?.sport;
      if (s) seen.add(s);
    });
    return Array.from(seen);
  }, [purchases]);

  /* ─── Filtered list ──────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (!p.pick) return false;
      const resultMatch = resultFilter === 'all' || p.pick.result === resultFilter;
      const sportMatch =
        sportFilter === 'all' || p.pick.sport === sportFilter;
      return resultMatch && sportMatch;
    });
  }, [purchases, resultFilter, sportFilter]);

  return (
    <DashboardShell>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)] w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">

          <PageHeader
            label={t('my_purchases.title')}
            title={t('my_purchases.title')}
            tagline={t('my_purchases.tagline')}
          />
          <p className="text-sm text-[var(--text-muted)] mb-4 flex items-start gap-2 min-w-0 break-words">
            <span aria-hidden>🛡</span>
            {t('my_purchases.escrow_refund_note')}
          </p>

          {!loading && vipSubscriptions.length > 0 && (
            <section
              className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 shadow-sm min-w-0 max-w-full"
              aria-label={t('my_purchases.vip_heading')}
            >
              <h2 className="text-base font-semibold text-[var(--text)] mb-1">{t('my_purchases.vip_heading')}</h2>
              <p className="text-xs text-[var(--text-muted)] mb-3">{t('my_purchases.vip_note')}</p>
              <ul className="space-y-2 mb-3">
                {vipSubscriptions.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm border-b border-[var(--border)] last:border-0 pb-2 last:pb-0 min-w-0"
                  >
                    <span className="font-medium text-[var(--text)] min-w-0 break-words">{s.package?.name ?? 'VIP'}</span>
                    <span className="text-[var(--text-muted)] text-xs sm:text-sm min-w-0 sm:text-end break-words">
                      <span className="capitalize">{s.status}</span>
                      {s.endsAt ? (
                        <>
                          {' '}
                          · {t('my_purchases.vip_ends')} {new Date(s.endsAt).toLocaleDateString()}
                        </>
                      ) : null}
                      {s.amountPaid != null ? (
                        <>
                          {' '}
                          · GHS {Number(s.amountPaid).toFixed(2)}
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/subscriptions"
                className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
              >
                {t('my_purchases.vip_link')} →
              </Link>
            </section>
          )}

          <div className="mb-4">
            <AdSlot zoneSlug="my-purchases-full" fullWidth className="w-full" />
          </div>

          {/* ─── Summary cards ─────────────────────────────────── */}
          {!loading && stats.total > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 min-w-0">
              {[
                { labelKey: 'my_purchases.filter_all' as const, value: stats.total,    color: 'text-[var(--primary)]' },
                { labelKey: 'my_purchases.filter_pending' as const, value: stats.pending,  color: 'text-amber-500' },
                { labelKey: 'my_purchases.filter_won' as const, value: stats.won,      color: 'text-emerald-600' },
                { labelKey: 'my_purchases.filter_lost' as const, value: stats.lost,     color: 'text-red-500' },
              ].map(({ labelKey, value, color }) => (
                <div
                  key={labelKey}
                  className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 shadow-sm text-center"
                >
                  <p className={`text-lg font-semibold ${color}`}>{value}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{t(labelKey)}</p>
                </div>
              ))}
            </div>
          )}

          {/* ─── Result filter pills ───────────────────────────── */}
          {!loading && stats.total > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 min-w-0 max-w-full">
              {RESULT_FILTERS.map(({ key, labelKey, icon }) => {
                const count =
                  key === 'all'
                    ? stats.total
                    : key === 'won'
                      ? stats.won
                      : key === 'lost'
                        ? stats.lost
                        : key === 'pending'
                          ? stats.pending
                          : stats.void;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setResultFilter(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      resultFilter === key
                        ? 'bg-[var(--primary)] text-white shadow-sm'
                        : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span>{icon}</span>
                    {t(labelKey)}
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      resultFilter === key ? 'bg-white/20 text-white' : 'bg-[var(--bg)] text-[var(--text-muted)]'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ─── Sport chips (only when multi-sport purchases exist) ─── */}
          {!loading && availableSports.length > 1 && (
            <div className="mb-5 w-full min-w-0 overflow-hidden">
            <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
              {SPORT_CHIPS.filter(
                (c) => c.key === 'all' || availableSports.includes(c.key),
              ).map(({ key, icon, labelKey }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSportFilter(key)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sportFilter === key
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {icon} {t(labelKey)}
                </button>
              ))}
            </div>
            </div>
          )}

          {/* ─── Content ───────────────────────────────────────── */}
          {loading && <LoadingSkeleton count={3} />}

          {!loading && purchases.length === 0 && vipSubscriptions.length === 0 && (
            <div className="card-gradient rounded-2xl">
              <EmptyState
                title={t('my_purchases.no_purchases')}
                description={t('my_purchases.no_purchases_desc')}
                actionLabel={t('my_purchases.browse_marketplace')}
                actionHref="/marketplace"
                icon="🛒"
              />
            </div>
          )}

          {!loading && purchases.length === 0 && vipSubscriptions.length > 0 && (
            <div className="card-gradient rounded-2xl mb-6">
              <EmptyState
                title={t('my_purchases.no_coupon_purchases')}
                description={t('my_purchases.no_coupon_purchases_desc')}
                actionLabel={t('my_purchases.browse_marketplace')}
                actionHref="/marketplace"
                icon="🛒"
              />
            </div>
          )}

          {!loading && purchases.length > 0 && filtered.length === 0 && (
            <div className="card-gradient rounded-2xl">
              <EmptyState
                title={t('my_purchases.no_filter_match')}
                description={t('my_purchases.no_filter_match_desc')}
                actionLabel={t('common.view_all')}
                actionHref="#"
                icon="🔍"
              />
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6 min-w-0 max-w-full">
              {filtered.map((p) =>
                p.pick ? (
                  <PickCard
                    key={p.id}
                    id={p.pick.id}
                    title={p.pick.title}
                    totalPicks={p.pick.totalPicks}
                    totalOdds={p.pick.totalOdds}
                    price={p.purchasePrice}
                    status={p.pick.status}
                    result={p.pick.result}
                    sport={p.pick.sport}
                    picks={p.pick.picks || []}
                    tipster={p.pick.tipster ?? null}
                    purchaseCount={p.pick.purchaseCount}
                    avgRating={p.pick.avgRating ?? null}
                    reviewCount={p.pick.reviewCount ?? null}
                    createdAt={p.pick.createdAt}
                    isPurchased
                    detailsHref={`/coupons/${p.pick.id}`}
                    onPurchase={() => {}}
                    onView={() => {
                      const tok = localStorage.getItem('token');
                      if (!tok) return;
                      fetch(`${getApiUrl()}/accumulators/${p.pick!.id}/view`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${tok}` },
                      }).catch(() => {});
                    }}
                    purchasing={false}
                  />
                ) : null,
              )}
            </div>
          )}

          {/* ─── Footer link to archive ─────────────────────────── */}
          {!loading && stats.total > 0 && (
            <div className="mt-2 text-center">
              <Link
                href="/coupons/archive"
                className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
              >
                📦 View settled coupon archive →
              </Link>
            </div>
          )}

        </div>
      </div>
    </DashboardShell>
  );
}
