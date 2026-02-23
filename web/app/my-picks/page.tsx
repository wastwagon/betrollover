'use client';

import { useEffect, useState, useMemo } from 'react';
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

const SPORT_FILTER_KEYS = [
  { key: '', icon: '🌍', labelKey: 'my_picks.filter_all' as const },
  { key: 'football', icon: '⚽', labelKey: 'nav.football' as const },
  { key: 'basketball', icon: '🏀', labelKey: 'nav.basketball' as const },
  { key: 'rugby', icon: '🏉', labelKey: 'nav.rugby' as const },
  { key: 'mma', icon: '🥊', labelKey: 'nav.mma' as const },
  { key: 'volleyball', icon: '🏐', labelKey: 'nav.volleyball' as const },
  { key: 'hockey', icon: '🏒', labelKey: 'nav.hockey' as const },
  { key: 'american_football', icon: '🏈', labelKey: 'nav.american_football' as const },
  { key: 'tennis', icon: '🎾', labelKey: 'create_pick.sport_tennis' as const },
  { key: 'multi', icon: '🌐', labelKey: 'pick.multi_sport' as const },
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetch(`${getApiUrl()}/accumulators/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load picks: ${r.status}`);
        return r.json();
      })
      .then((data) => setPicks(Array.isArray(data) ? data : []))
      .catch((err) => {
        setPicks([]);
        showError(err);
      })
      .finally(() => setLoading(false));
  }, [router]);

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
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label={t('my_picks.title')}
            title={t('my_picks.title')}
            tagline={t('my_picks.tagline')}
            action={
              <a
                href="/create-pick"
                className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-colors"
              >
                {t('my_picks.create_pick')}
              </a>
            }
          />

          <div className="mb-4">
            <AdSlot zoneSlug="my-picks-full" fullWidth className="w-full" />
          </div>

          {/* Sport filter tabs */}
          {!loading && picks.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 mb-4">
              {SPORT_FILTER_KEYS.filter((sf) => sf.key === '' || (sportCounts[sf.key] ?? 0) > 0).map((sf) => (
                <button
                  key={sf.key}
                  onClick={() => setSportFilter(sf.key)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    sportFilter === sf.key
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  }`}
                >
                  <span>{sf.icon}</span>
                  <span>{t(sf.labelKey)}</span>
                  {sf.key === '' ? (
                    <span className="ml-1 text-xs opacity-70">{picks.length}</span>
                  ) : (sportCounts[sf.key] ?? 0) > 0 ? (
                    <span className="ml-1 text-xs opacity-70">{sportCounts[sf.key]}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}

          {loading && <LoadingSkeleton count={3} />}

          {!loading && picks.length === 0 && (
            <div className="card-gradient rounded-2xl">
              <EmptyState
                title={t('my_picks.no_picks')}
                description={t('my_picks.no_picks_desc')}
                actionLabel={t('my_picks.create_pick')}
                actionHref="/create-pick"
                icon="🎯"
              />
            </div>
          )}

          {!loading && picks.length > 0 && filtered.length === 0 && (
            <div className="card-gradient rounded-2xl">
              <EmptyState
                title={t('my_picks.no_sport_picks', { sport: SPORT_DISPLAY_MAP[sportFilter] ?? sportFilter })}
                description={t('my_picks.no_sport_desc')}
                actionLabel={t('my_picks.create_pick')}
                actionHref="/create-pick"
                icon="🎯"
              />
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-3 pb-6">
              <p className="text-sm text-[var(--text-muted)] mb-2">
                {filtered.length === 1 ? t('my_picks.coupons_count', { n: '1' }) : t('my_picks.coupons_count_plural', { n: String(filtered.length) })}
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
                  isPurchased={true}
                  createdAt={a.createdAt}
                  onPurchase={() => {}}
                  purchasing={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
