'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  result?: string;
}

interface Tipster {
  id: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  winRate: number;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  rank: number | null;
}

interface Coupon {
  id: number;
  title: string;
  sport?: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  purchaseCount?: number;
  picks: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
  status?: string;
  result?: string;
}

type PeriodPreset = 'all' | '7d' | '30d' | '90d' | 'month' | 'custom';

type ArchiveSummary = {
  total: number;
  wonTotal: number;
  lostTotal: number;
  combinedRoi: number;
  netProfitUnits: number;
  avgCouponOdds: number;
  from: string | null;
  to: string | null;
};

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getTodayUtc(): string {
  return utcYmd(new Date());
}

function addUtcDaysFromYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return utcYmd(dt);
}

function defaultLast30Range(): { from: string; to: string } {
  const to = getTodayUtc();
  return { from: addUtcDaysFromYmd(to, -29), to };
}

function rangeForPreset(preset: PeriodPreset, custom: { from: string; to: string }): { from?: string; to?: string } {
  const today = getTodayUtc();
  if (preset === 'all') return {};
  if (preset === '7d') return { from: addUtcDaysFromYmd(today, -6), to: today };
  if (preset === '30d') return { from: addUtcDaysFromYmd(today, -29), to: today };
  if (preset === '90d') return { from: addUtcDaysFromYmd(today, -89), to: today };
  if (preset === 'month') {
    const now = new Date();
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { from: utcYmd(first), to: today };
  }
  if (preset === 'custom') {
    const ymd = /^\d{4}-\d{2}-\d{2}$/;
    if (ymd.test(custom.from) && ymd.test(custom.to) && custom.from <= custom.to) {
      return { from: custom.from, to: custom.to };
    }
    return {};
  }
  return {};
}

function parseArchiveResponse(data: unknown): { items: Coupon[]; summary: ArchiveSummary | null } {
  if (data == null || typeof data !== 'object') {
    return { items: [], summary: null };
  }
  if (Array.isArray(data)) {
    const items = data as Coupon[];
    const wonTotal = items.filter((c) => c.result === 'won').length;
    const lostTotal = items.filter((c) => c.result === 'lost').length;
    return {
      items,
      summary: {
        total: items.length,
        wonTotal,
        lostTotal,
        combinedRoi: 0,
        netProfitUnits: 0,
        avgCouponOdds: 0,
        from: null,
        to: null,
      },
    };
  }
  const obj = data as Record<string, unknown>;
  const items = Array.isArray(obj.items) ? (obj.items as Coupon[]) : [];
  if (typeof obj.total === 'number' || typeof obj.total === 'string') {
    const total = Number(obj.total);
    const wonTotal = Number(obj.wonTotal ?? obj.won_total ?? 0);
    const lostTotal = Number(obj.lostTotal ?? obj.lost_total ?? 0);
    const combinedRoi = Number(obj.combinedRoi ?? obj.combined_roi ?? 0);
    const netProfitUnits = Number(obj.netProfitUnits ?? obj.net_profit_units ?? 0);
    const avgCouponOdds = Number(obj.avgCouponOdds ?? obj.avg_coupon_odds ?? 0);
    const from = (obj.from != null ? String(obj.from) : null) || null;
    const to = (obj.to != null ? String(obj.to) : null) || null;
    return {
      items,
      summary: {
        total,
        wonTotal,
        lostTotal,
        combinedRoi,
        netProfitUnits,
        avgCouponOdds,
        from,
        to,
      },
    };
  }
  const wonTotal = items.filter((c) => c.result === 'won').length;
  const lostTotal = items.filter((c) => c.result === 'lost').length;
  return {
    items,
    summary: {
      total: items.length,
      wonTotal,
      lostTotal,
      combinedRoi: 0,
      netProfitUnits: 0,
      avgCouponOdds: 0,
      from: null,
      to: null,
    },
  };
}

const ARCHIVE_POLL_MS = 45_000;

export default function CouponsArchivePage() {
  const t = useT();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [summary, setSummary] = useState<ArchiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<'all' | 'won' | 'lost'>('all');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [customApplied, setCustomApplied] = useState(defaultLast30Range);
  const [draftFrom, setDraftFrom] = useState(() => defaultLast30Range().from);
  const [draftTo, setDraftTo] = useState(() => defaultLast30Range().to);

  const activeRange = useMemo(
    () => rangeForPreset(periodPreset, customApplied),
    [periodPreset, customApplied],
  );

  const archiveQuerySuffix = useMemo(() => {
    if (!activeRange.from || !activeRange.to) return '';
    return `&from=${encodeURIComponent(activeRange.from)}&to=${encodeURIComponent(activeRange.to)}`;
  }, [activeRange.from, activeRange.to]);

  const hasPeriodFilter = periodPreset !== 'all';

  const loadArchive = useCallback(
    async (opts?: { withWallet?: boolean }) => {
      const withWallet = opts?.withWallet !== false;
      const token = withWallet ? localStorage.getItem('token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const archiveRes = await fetch(
          `${getApiUrl()}/accumulators/archive?limit=100${archiveQuerySuffix}`,
          { cache: 'no-store' },
        );
        const raw = archiveRes.ok ? await archiveRes.json() : [];
        const { items, summary: nextSummary } = parseArchiveResponse(raw);
        setCoupons(items);
        setSummary(nextSummary);

        if (withWallet && token) {
          const [wallet, purchased] = await Promise.all([
            fetch(`${getApiUrl()}/wallet/balance`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
            fetch(`${getApiUrl()}/accumulators/purchased`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
          ]);
          if (wallet) setWalletBalance(Number(wallet.balance));
          const ids = new Set<number>((purchased || []).map((p: { accumulatorId?: number }) => p.accumulatorId).filter(Boolean));
          setPurchasedIds(ids);
        }
      } catch {
        setCoupons([]);
        setSummary(null);
      }
    },
    [archiveQuerySuffix],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadArchive({ withWallet: true });
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadArchive]);

  useEffect(() => {
    const tick = () => {
      void loadArchive({ withWallet: false });
    };
    const id = window.setInterval(tick, ARCHIVE_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadArchive]);

  const selectPreset = (p: PeriodPreset) => {
    setPeriodPreset(p);
    if (p === 'custom') {
      setDraftFrom(customApplied.from);
      setDraftTo(customApplied.to);
    }
  };

  const applyCustomRange = () => {
    if (draftFrom <= draftTo) {
      setCustomApplied({ from: draftFrom, to: draftTo });
      setPeriodPreset('custom');
    }
  };

  const filtered = coupons.filter((c) => {
    if (resultFilter === 'all') return true;
    return c.result === resultFilter;
  });

  const wonCount = summary?.wonTotal ?? coupons.filter((c) => c.result === 'won').length;
  const lostCount = summary?.lostTotal ?? coupons.filter((c) => c.result === 'lost').length;
  const totalSettled = summary?.total ?? coupons.length;
  const winRate = totalSettled > 0 ? Math.round((wonCount / totalSettled) * 100) : 0;
  const combinedRoi = summary?.combinedRoi ?? 0;
  const netUnits = summary?.netProfitUnits ?? 0;
  const avgOdds = summary?.avgCouponOdds ?? 0;
  const roiPositive = combinedRoi > 0;
  const unitsPositive = netUnits > 0;

  const periodChips: { id: PeriodPreset; labelKey: string }[] = [
    { id: 'all', labelKey: 'picks.archive.period_all' },
    { id: '7d', labelKey: 'picks.archive.period_7d' },
    { id: '30d', labelKey: 'picks.archive.period_30d' },
    { id: '90d', labelKey: 'picks.archive.period_90d' },
    { id: 'month', labelKey: 'picks.archive.period_month' },
    { id: 'custom', labelKey: 'picks.archive.period_custom' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-page-wide w-full min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 min-w-0">
          <div className="min-w-0 flex-1 max-w-full">
            <PageHeader
              label={t('picks.archive.page_label')}
              title={t('picks.archive.page_title')}
              tagline={t('picks.archive.page_tagline')}
            />
          </div>
          <Link
            href="/coupons"
            className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full sm:w-auto self-stretch sm:self-auto shrink-0"
          >
            {t('picks.archive.back_marketplace')}
          </Link>
        </div>

        <div className="mb-6">
          <AdSlot zoneSlug="coupons-archive-full" fullWidth className="w-full max-w-3xl" />
        </div>

        {/* Period filter */}
        <div className="mb-4 space-y-3 min-w-0">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{t('picks.archive.period_label')}</p>
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
            {periodChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => selectPreset(chip.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  periodPreset === chip.id
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
                }`}
              >
                {t(chip.labelKey)}
              </button>
            ))}
          </div>
          {periodPreset === 'custom' && (
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 pt-1">
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)] min-w-0">
                <span>{t('picks.archive.custom_from')}</span>
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)] min-w-0">
                <span>{t('picks.archive.custom_to')}</span>
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
              <button
                type="button"
                onClick={applyCustomRange}
                disabled={!draftFrom || !draftTo || draftFrom > draftTo}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed sm:mb-0"
              >
                {t('picks.archive.apply_range')}
              </button>
            </div>
          )}
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-3xl">{t('picks.archive.range_hint')}</p>
        </div>

        {/* Summary stats — API totals for selected period */}
        {!loading && totalSettled > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 min-w-0">
            <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center min-w-0">
              <p className="text-lg font-semibold text-[var(--text)]">{totalSettled}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('picks.archive.total_settled')}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-0">
              <p className="text-lg font-semibold text-emerald-700">{wonCount}</p>
              <p className="text-xs text-emerald-600 mt-1">{t('picks.archive.won')}</p>
            </div>
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center min-w-0">
              <p className="text-lg font-semibold text-red-700">{lostCount}</p>
              <p className="text-xs text-red-600 mt-1">{t('picks.archive.lost')}</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center min-w-0">
              <p className="text-lg font-semibold text-[var(--text)]">{winRate}%</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('picks.archive.win_rate_card')}</p>
            </div>
            <div
              className={`p-4 rounded-xl border text-center min-w-0 ${
                roiPositive ? 'bg-emerald-50 border-emerald-200' : combinedRoi < 0 ? 'bg-red-50 border-red-200' : 'bg-[var(--card)] border-[var(--border)]'
              }`}
              title={t('picks.archive.combined_roi_hint')}
            >
              <p
                className={`text-lg font-semibold ${
                  roiPositive ? 'text-emerald-700' : combinedRoi < 0 ? 'text-red-700' : 'text-[var(--text)]'
                }`}
              >
                {combinedRoi > 0 ? '+' : ''}
                {combinedRoi}%
              </p>
              <p className={`text-xs mt-1 ${roiPositive ? 'text-emerald-600' : combinedRoi < 0 ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
                {t('picks.archive.combined_roi')}
              </p>
            </div>
            <div
              className={`p-4 rounded-xl border text-center min-w-0 ${
                unitsPositive ? 'bg-emerald-50 border-emerald-200' : netUnits < 0 ? 'bg-red-50 border-red-200' : 'bg-[var(--card)] border-[var(--border)]'
              }`}
              title={t('picks.archive.net_units_hint')}
            >
              <p
                className={`text-lg font-semibold ${
                  unitsPositive ? 'text-emerald-700' : netUnits < 0 ? 'text-red-700' : 'text-[var(--text)]'
                }`}
              >
                {netUnits > 0 ? '+' : ''}
                {netUnits}
              </p>
              <p className={`text-xs mt-1 ${unitsPositive ? 'text-emerald-600' : netUnits < 0 ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
                {t('picks.archive.net_units')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center min-w-0" title={t('picks.archive.avg_odds_hint')}>
              <p className="text-lg font-semibold text-[var(--text)]">{avgOdds}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('picks.archive.avg_odds')}</p>
            </div>
          </div>
        )}

        {/* Result filter */}
        <div className="mb-6 w-full min-w-0 overflow-hidden">
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
            {(['all', 'won', 'lost'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setResultFilter(f)}
                className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  resultFilter === f
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
                }`}
              >
                {f === 'all'
                  ? t('picks.archive.filter_all')
                  : f === 'won'
                    ? t('picks.archive.filter_won')
                    : t('picks.archive.filter_lost')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton
            count={8}
            variant="cards"
            cardsGridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-0"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              hasPeriodFilter && totalSettled === 0
                ? t('picks.archive.empty_period')
                : t('picks.archive.empty_default_title')
            }
            description={
              hasPeriodFilter && totalSettled === 0
                ? t('picks.archive.empty_period_sub')
                : t('picks.archive.empty_default_desc')
            }
            actionLabel={t('picks.archive.browse_active_cta')}
            actionHref="/coupons"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-0">
            {filtered.map((coupon) => (
              <PickCard
                key={coupon.id}
                id={coupon.id}
                title={coupon.title}
                sport={coupon.sport}
                totalPicks={coupon.totalPicks}
                totalOdds={coupon.totalOdds}
                price={coupon.price}
                status={coupon.status}
                result={coupon.result}
                picks={coupon.picks || []}
                purchaseCount={coupon.purchaseCount}
                tipster={coupon.tipster ?? null}
                isPurchased={purchasedIds.has(coupon.id)}
                canPurchase={false}
                walletBalance={walletBalance}
                viewOnly
                onPurchase={() => {}}
                createdAt={coupon.createdAt}
              />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
