'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { NavBar } from '@/components/ios/NavBar';
import { PullToRefresh } from '@/components/ios/PullToRefresh';
import { getPickCardSocialProps, mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';

const SPORT_FILTER_KEYS = [
  { key: '', labelKey: 'my_picks.filter_all' as const },
  { key: 'football', labelKey: 'nav.football' as const },
  { key: 'basketball', labelKey: 'nav.basketball' as const },
  { key: 'rugby', labelKey: 'nav.rugby' as const },
  { key: 'mma', labelKey: 'nav.mma' as const },
  { key: 'volleyball', labelKey: 'nav.volleyball' as const },
  { key: 'hockey', labelKey: 'nav.hockey' as const },
  { key: 'american_football', labelKey: 'nav.american_football' as const },
  { key: 'tennis', labelKey: 'create_pick.sport_tennis' as const },
  { key: 'multi', labelKey: 'pick.multi_sport' as const },
] as const;

type SportKey = typeof SPORT_FILTER_KEYS[number]['key'];

interface Pick {
  id: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  homeScore?: number | null;
  awayScore?: number | null;
  fixtureStatus?: string | null;
  matchDate?: string;
  status?: string;
}

interface Accumulator {
  id: number;
  title: string;
  sport?: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  status: string;
  result: string;
  isMarketplace: boolean;
  picks: Pick[];
  createdAt?: string;
  updatedAt?: string;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  bookingCodeCopyCount?: number;
  reactionCount?: number;
  hasReacted?: boolean;
  commentCount?: number;
}

const SPORT_DISPLAY_MAP: Record<string, string> = {
  football:          'Football',
  basketball:        'Basketball',
  rugby:             'Rugby',
  mma:               'MMA',
  volleyball:        'Volleyball',
  hockey:            'Hockey',
  american_football: 'American Football',
  tennis:            'Tennis',
  multi:             'Multi-Sport',
  'multi-sport':     'Multi-Sport',
};

export default function MyPicksPage() {
  const router = useRouter();
  const t = useT();
  const [picks, setPicks] = useState<Accumulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState<SportKey>('');
  const { showError, clearError, error: toastError } = useErrorToast();

  const loadPicks = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const r = await fetch(`${getApiUrl()}/accumulators/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Failed to load picks: ${r.status}`);
      const data = await r.json();
      setPicks(Array.isArray(data) ? data : []);
    } catch (err) {
      setPicks([]);
      showError(err instanceof Error ? err : new Error('Failed to load picks'));
    } finally {
      setLoading(false);
    }
  }, [router, showError]);

  useEffect(() => {
    void loadPicks();
  }, [loadPicks]);

  const filtered = useMemo(() => {
    if (!sportFilter) return picks;
    const target = SPORT_DISPLAY_MAP[sportFilter] ?? sportFilter;
    return picks.filter((p) => (p.sport ?? '').toLowerCase() === target.toLowerCase());
  }, [picks, sportFilter]);

  // Derive which sport tabs actually have data (only show non-zero counts)
  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of picks) {
      const s = (p.sport ?? 'Football').toLowerCase();
      const key = s === 'multi-sport' ? 'multi' : Object.entries(SPORT_DISPLAY_MAP).find(([, v]) => v.toLowerCase() === s)?.[0] ?? s;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [picks]);

  return (
    <DashboardShell>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      <div className="min-h-[calc(100vh-8rem)] bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <PullToRefresh onRefresh={loadPicks} disabled={loading}>
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <div className="lg:hidden -mx-1 mb-3">
            <NavBar
              title={t('my_picks.title')}
              backHref="/dashboard"
              backLabel={t('nav.dashboard')}
              sticky={false}
            />
          </div>
          <div className="hidden lg:block">
            <PageHeader
              label={t('my_picks.title')}
              title={t('my_picks.title')}
              tagline={t('my_picks.tagline')}
              action={
                <a
                  href="/create-pick"
                  className="inline-flex w-full sm:w-auto items-center justify-center min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-colors"
                >
                  {t('my_picks.create_pick')}
                </a>
              }
            />
          </div>

          <div className="mb-4">
            <AdSlot zoneSlug="my-picks-full" fullWidth className="w-full" />
          </div>

          {/* Sport filter tabs */}
          {!loading && picks.length > 0 && (
            <div className="mb-4 w-full min-w-0 overflow-hidden">
              <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide -mx-1 px-1 touch-pan-x [-webkit-overflow-scrolling:touch]">
              {SPORT_FILTER_KEYS.filter((sf) => sf.key === '' || (sportCounts[sf.key] ?? 0) > 0).map((sf) => (
                <button
                  key={sf.key}
                  type="button"
                  onClick={() => setSportFilter(sf.key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    sportFilter === sf.key
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  }`}
                >
                  <span>{t(sf.labelKey)}</span>
                  {sf.key === '' ? (
                    <span className="ml-1 text-xs opacity-70">{picks.length}</span>
                  ) : (sportCounts[sf.key] ?? 0) > 0 ? (
                    <span className="ml-1 text-xs opacity-70">{sportCounts[sf.key]}</span>
                  ) : null}
                </button>
              ))}
              </div>
            </div>
          )}

          {loading && <LoadingSkeleton count={3} />}

          {!loading && picks.length === 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                title={t('my_picks.no_picks')}
                description={t('my_picks.no_picks_desc')}
                actionLabel={t('my_picks.create_pick')}
                actionHref="/create-pick"
              />
            </div>
          )}

          {!loading && picks.length > 0 && filtered.length === 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <EmptyState
                title={t('my_picks.no_sport_picks', { sport: SPORT_DISPLAY_MAP[sportFilter] ?? sportFilter })}
                description={t('my_picks.no_sport_desc')}
                actionLabel={t('my_picks.create_pick')}
                actionHref="/create-pick"
              />
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-3 pb-6 min-w-0 max-w-full">
              <p className="text-sm text-[var(--text-muted)] mb-2 min-w-0 break-words">
                {filtered.length === 1 ? t('my_picks.pick_count', { n: '1' }) : t('my_picks.pick_count_plural', { n: String(filtered.length) })}
                {sportFilter ? ` · ${SPORT_DISPLAY_MAP[sportFilter] ?? sportFilter}` : ''}
              </p>
              {filtered.map((a) => (
                <PickCard
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  sport={a.sport}
                  totalPicks={a.totalPicks}
                  totalOdds={a.totalOdds}
                  price={a.price}
                  status={a.status}
                  result={a.result}
                  picks={a.picks || []}
                  bookmakerKey={a.bookmakerKey}
                  bookingCode={a.bookingCode}
                  bookingCodeCopyCount={a.bookingCodeCopyCount ?? 0}
                  isPurchased={true}
                  createdAt={a.createdAt}
                  onPurchase={() => {}}
                  purchasing={false}
                  {...getPickCardSocialProps(a, {
                    onCountsChange: (id, counts) =>
                      setPicks((prev) => mergeSocialCountsIntoList(prev, id, counts)),
                    loginRedirectPath: currentLoginRedirectPath('/my-picks'),
                  })}
                />
              ))}
            </div>
          )}
        </div>
        </PullToRefresh>
      </div>
    </DashboardShell>
  );
}
