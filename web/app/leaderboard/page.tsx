'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { AdSlot } from '@/components/AdSlot';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useT } from '@/context/LanguageContext';
import { getApiUrl, getAvatarUrl } from '@/lib/site-config';

type Period = 'all_time' | 'monthly' | 'weekly';
type SportFilter = 'all' | 'football' | 'basketball' | 'rugby' | 'mma' | 'volleyball' | 'hockey' | 'american_football';

interface LeaderboardEntry {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  rank: number;
  leaderboard_rank?: number;
  win_rate: number;
  roi: number;
  total_predictions: number;
  total_wins: number;
  monthly_predictions?: number;
  monthly_wins?: number;
  monthly_roi?: number;
  avg_rating?: number | null;
  review_count?: number | null;
}

const MEDAL = ['🥇', '🥈', '🥉'];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-2xl">{MEDAL[rank - 1]}</span>;
  return (
    <span className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 text-sm font-bold">
      {rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const router = useRouter();
  const t = useT();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all_time');
  const [sport, setSport] = useState<SportFilter>('all');

  const fetchLeaderboard = useCallback((p: Period, s: SportFilter) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const params = new URLSearchParams({ limit: '50' });
    if (p !== 'all_time') params.set('period', p);
    if (s !== 'all') params.set('sport', s);

    const endpoint = p !== 'all_time'
      ? `${getApiUrl()}/leaderboard?${params}`
      : `${getApiUrl()}/tipsters?${params}&sort_by=roi&order=desc`;

    fetch(endpoint, { headers })
      .then(r => r.ok ? r.json() : { leaderboard: [], tipsters: [] })
      .then(data => {
        const raw: Record<string, unknown>[] = data.leaderboard ?? data.tipsters ?? data ?? [];
        setEntries(raw.map((e, i) => ({
          id: e.id as number,
          username: e.username as string,
          display_name: e.display_name as string,
          avatar_url: (e.avatar_url as string | null) ?? null,
          rank: (e.rank ?? e.leaderboard_rank ?? i + 1) as number,
          win_rate: (e.win_rate as number) ?? 0,
          roi: (e.roi as number) ?? 0,
          total_predictions: (e.total_predictions ?? e.monthly_predictions ?? 0) as number,
          total_wins: (e.total_wins ?? e.monthly_wins ?? 0) as number,
        })));
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLeaderboard(period, sport); }, [period, sport, fetchLeaderboard]);

  const handleFollow = async (username: string) => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login?redirect=/leaderboard'); return; }
    await fetch(`${getApiUrl()}/tipsters/${encodeURIComponent(username)}/follow`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wide mb-3">
            🏆 {t('nav.leaderboard')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mb-2">{t('seo.leaderboard_title').split(' | ')[0]}</h1>
          <p className="text-[var(--text-muted)] text-lg">{t('seo.leaderboard_desc')}</p>
        </div>

        {/* Period tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { key: 'all_time' as Period, icon: '🏆', labelKey: 'tipster.period_alltime' },
            { key: 'monthly'  as Period, icon: '📅', labelKey: 'tipster.period_monthly' },
            { key: 'weekly'   as Period, icon: '⚡', labelKey: 'tipster.period_weekly' },
          ]).map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                period === p.key
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}
            >
              <span>{p.icon}</span>{t(p.labelKey)}
            </button>
          ))}
        </div>

        {/* Full-width ad */}
        <div className="mb-8 w-full">
          <AdSlot zoneSlug="leaderboard-full" fullWidth className="w-full max-w-3xl mx-auto" />
        </div>

        {/* Sport filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {([
            { key: 'all' as SportFilter,               icon: '🌍', labelKey: 'marketplace.filter_all_sports' },
            { key: 'football' as SportFilter,          icon: '⚽', labelKey: 'nav.football' },
            { key: 'basketball' as SportFilter,        icon: '🏀', labelKey: 'nav.basketball' },
            { key: 'rugby' as SportFilter,             icon: '🏉', labelKey: 'nav.rugby' },
            { key: 'mma' as SportFilter,               icon: '🥊', labelKey: 'nav.mma' },
            { key: 'volleyball' as SportFilter,        icon: '🏐', labelKey: 'nav.volleyball' },
            { key: 'hockey' as SportFilter,            icon: '🏒', labelKey: 'nav.hockey' },
            { key: 'american_football' as SportFilter, icon: '🏈', labelKey: 'nav.american_football' },
          ]).map(s => (
            <button
              key={s.key}
              onClick={() => setSport(s.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                sport === s.key
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}
            >
              <span>{s.icon}</span><span>{t(s.labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <LoadingSkeleton count={10} variant="list" />
        ) : entries.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-[var(--text)] font-semibold">{t('common.no_results')}</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">{t('home.join_subtitle')}</p>
            <Link href="/register" className="mt-4 inline-block px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors">
              {t('nav.register')} →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-[3rem_1fr_8rem_8rem_8rem_8rem] gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>#</span>
              <span>{t('nav.tipsters')}</span>
              <span className="text-center">{t('tipster.win_rate')}</span>
              <span className="text-center">{t('tipster.roi')}</span>
              <span className="text-center">{t('tipster.total_picks')}</span>
              <span className="text-center">{t('common.view')}</span>
            </div>

            {entries.map((entry, idx) => {
              const winRate = entry.total_predictions > 0
                ? Math.round((entry.total_wins / entry.total_predictions) * 100)
                : Math.round(entry.win_rate ?? 0);
              const rank = entry.rank ?? entry.leaderboard_rank ?? idx + 1;
              const roi = entry.roi ?? 0;
              const avatarSrc = getAvatarUrl(entry.avatar_url, 48);

              return (
                <div
                  key={entry.id}
                  className={`flex md:grid md:grid-cols-[3rem_1fr_8rem_8rem_8rem_8rem] items-center gap-3 md:gap-4 px-4 py-3.5 rounded-2xl border transition-all hover:border-[var(--primary)]/30 hover:shadow-sm ${
                    rank <= 3
                      ? 'bg-gradient-to-r from-amber-50/60 to-white border-amber-200/60'
                      : 'bg-[var(--card)] border-[var(--border)]'
                  }`}
                >
                  <div className="flex-shrink-0"><RankBadge rank={rank} /></div>

                  {/* Tipster info */}
                  <Link href={`/tipsters/${entry.username}`} className="flex items-center gap-3 min-w-0 group">
                    <div className="relative w-10 h-10 flex-shrink-0">
                      {avatarSrc ? (
                        <Image
                          src={avatarSrc}
                          alt={entry.display_name}
                          width={40} height={40}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                          {entry.display_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text)] truncate group-hover:text-[var(--primary)] transition-colors">
                        {entry.display_name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-[var(--text-muted)] truncate">@{entry.username}</p>
                        {entry.avg_rating != null && entry.avg_rating > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="text-amber-400 text-[10px]">★</span>
                            <span className="text-[10px] font-semibold text-amber-600">{Number(entry.avg_rating).toFixed(1)}</span>
                            {entry.review_count != null && entry.review_count > 0 && (
                              <span className="text-[10px] text-[var(--text-muted)]">({entry.review_count})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Stats */}
                  <div className="hidden md:flex flex-col items-center">
                    <span className={`text-sm font-bold ${winRate >= 60 ? 'text-emerald-600' : winRate >= 40 ? 'text-amber-600' : 'text-[var(--text)]'}`}>
                      {winRate}%
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">win rate</span>
                  </div>
                  <div className="hidden md:flex flex-col items-center">
                    <span className={`text-sm font-bold ${roi > 0 ? 'text-emerald-600' : roi < 0 ? 'text-red-500' : 'text-[var(--text)]'}`}>
                      {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">ROI</span>
                  </div>
                  <div className="hidden md:flex flex-col items-center">
                    <span className="text-sm font-bold text-[var(--text)]">{entry.total_predictions}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">picks</span>
                  </div>

                  {/* Mobile stats */}
                  <div className="md:hidden flex items-center gap-3 ml-auto flex-shrink-0">
                    <span className={`text-xs font-bold ${winRate >= 60 ? 'text-emerald-600' : 'text-[var(--text)]'}`}>
                      {winRate}% WR
                    </span>
                    <span className={`text-xs font-bold ${roi > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {roi > 0 ? '+' : ''}{roi.toFixed(1)}% ROI
                    </span>
                  </div>

                  <div className="hidden md:flex items-center justify-center gap-2">
                    <Link
                      href={`/tipsters/${entry.username}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleFollow(entry.username)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                    >
                      Follow
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/tipsters" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
            Browse all tipster profiles →
          </Link>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
