'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import { formatLiveFixturePeriod } from '@/lib/live-fixture-display';

interface Row {
  id: number;
  homeTeamName: string;
  awayTeamName: string;
  leagueName: string | null;
  leagueApiId?: number | null;
  country?: string | null;
  matchDate: string;
  status: string;
  /** API-Football live minute when in-play */
  statusElapsed?: number | null;
  homeScore: number | null;
  awayScore: number | null;
  syncedAt?: string | null;
}

interface Payload {
  live: Row[];
  upcoming: Row[];
  recent: Row[];
  generatedAt: string;
}

interface StreamDelta {
  generatedAt: string;
  delta: {
    liveUpserts: Row[];
    recentUpserts: Row[];
    upcomingUpserts: Row[];
    liveRemovedIds: number[];
    recentRemovedIds: number[];
    upcomingRemovedIds: number[];
  };
}

const POLL_MS = 45_000;
const MAX_POLL_MS = 120_000;
const SEARCH_DEBOUNCE_MS = 400;

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function matchesCountry(row: Row, selectedCountry: string): boolean {
  const c = (row.country || '').trim();
  if (!selectedCountry) return true;
  const sel = selectedCountry.trim().toLowerCase();
  if (sel === 'world') {
    return !c || c.toLowerCase() === 'world';
  }
  return c.toLowerCase() === sel;
}

function matchesSearch(row: Row, term: string): boolean {
  if (!term.trim()) return true;
  const t = term.trim().toLowerCase();
  const league = (row.leagueName || '').toLowerCase();
  return (
    row.homeTeamName.toLowerCase().includes(t) ||
    row.awayTeamName.toLowerCase().includes(t) ||
    league.includes(t)
  );
}

export default function LiveScoresPage() {
  const t = useT();
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef(false);
  const pollDelayRef = useRef(POLL_MS);
  const sseActiveRef = useRef(false);

  const [teamSearch, setTeamSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('');
  const debouncedSearch = useDebounce(teamSearch, SEARCH_DEBOUNCE_MS);

  const normalizePayload = useCallback((raw: Payload | null): Payload | null => {
    if (!raw) return null;
    return {
      live: Array.isArray(raw.live) ? raw.live : [],
      upcoming: Array.isArray(raw.upcoming) ? raw.upcoming : [],
      recent: Array.isArray(raw.recent) ? raw.recent : [],
      generatedAt: raw.generatedAt,
    };
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const r = await fetch(`${getApiUrl()}/fixtures/platform/live-scores?archiveHours=48`, {
        cache: 'no-store',
        signal,
      });
      if (!r.ok) {
        setErr(t('live_scores.load_error'));
        setData(null);
        pollDelayRef.current = Math.min(pollDelayRef.current * 2, MAX_POLL_MS);
        return;
      }
      const j = (await r.json()) as Payload;
      setData(normalizePayload(j));
      setErr(null);
      pollDelayRef.current = POLL_MS;
    } catch {
      setErr(t('live_scores.load_error'));
      setData(null);
      pollDelayRef.current = Math.min(pollDelayRef.current * 2, MAX_POLL_MS);
    } finally {
      pollingRef.current = false;
      setLoading(false);
    }
  }, [t, normalizePayload]);

  const applyDelta = useCallback((prev: Payload | null, packet: StreamDelta): Payload | null => {
    if (!prev) return prev;
    const liveMap = new Map(prev.live.map((r) => [r.id, r]));
    for (const row of packet.delta.liveUpserts) liveMap.set(row.id, row);
    for (const id of packet.delta.liveRemovedIds) liveMap.delete(id);

    const recentMap = new Map(prev.recent.map((r) => [r.id, r]));
    for (const row of packet.delta.recentUpserts) recentMap.set(row.id, row);
    for (const id of packet.delta.recentRemovedIds) recentMap.delete(id);

    const upcomingMap = new Map(prev.upcoming.map((r) => [r.id, r]));
    const upserts = packet.delta.upcomingUpserts ?? [];
    const removed = packet.delta.upcomingRemovedIds ?? [];
    for (const row of upserts) upcomingMap.set(row.id, row);
    for (const id of removed) upcomingMap.delete(id);

    return {
      live: [...liveMap.values()],
      upcoming: [...upcomingMap.values()],
      recent: [...recentMap.values()],
      generatedAt: packet.generatedAt,
    };
  }, []);

  /** Countries present in the current payload only (same idea as coupon: only where we have fixtures). */
  const countriesInData = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    const add = (rows: Row[]) => {
      for (const r of rows) {
        const c = (r.country || '').trim();
        if (c) set.add(c);
      }
    };
    add(data.live);
    add(data.upcoming);
    add(data.recent);
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    if (arr.some((x) => x.toLowerCase() === 'world')) {
      return ['World', ...arr.filter((x) => x.toLowerCase() !== 'world')];
    }
    return arr;
  }, [data]);

  type LeagueOpt = { id: number; name: string; country: string | null };
  const allLeagueOptions = useMemo((): LeagueOpt[] => {
    if (!data) return [];
    const byApi = new Map<number, LeagueOpt>();
    const take = (rows: Row[]) => {
      for (const r of rows) {
        if (r.leagueApiId == null) continue;
        if (!byApi.has(r.leagueApiId)) {
          byApi.set(r.leagueApiId, {
            id: r.leagueApiId,
            name: r.leagueName || '—',
            country: r.country ?? null,
          });
        }
      }
    };
    take(data.live);
    take(data.upcoming);
    take(data.recent);
    return [...byApi.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const competitionOptions = useMemo(() => {
    let leagues = allLeagueOptions;
    if (selectedCountry && selectedCountry.trim() !== '') {
      if (selectedCountry.trim().toLowerCase() === 'world') {
        leagues = leagues.filter(
          (l) => !(l.country || '').trim() || (l.country || '').trim().toLowerCase() === 'world',
        );
      } else {
        leagues = leagues.filter(
          (l) => (l.country || '').trim().toLowerCase() === selectedCountry.trim().toLowerCase(),
        );
      }
    }
    return leagues;
  }, [allLeagueOptions, selectedCountry]);

  const filteredLive = useMemo(() => {
    if (!data) return [];
    return data.live.filter((row) => {
      if (selectedLeague && String(row.leagueApiId ?? '') !== selectedLeague) return false;
      if (!matchesCountry(row, selectedCountry)) return false;
      return matchesSearch(row, debouncedSearch);
    });
  }, [data, selectedCountry, selectedLeague, debouncedSearch]);

  const filteredUpcoming = useMemo(() => {
    if (!data) return [];
    return data.upcoming.filter((row) => {
      if (selectedLeague && String(row.leagueApiId ?? '') !== selectedLeague) return false;
      if (!matchesCountry(row, selectedCountry)) return false;
      return matchesSearch(row, debouncedSearch);
    });
  }, [data, selectedCountry, selectedLeague, debouncedSearch]);

  const filteredRecent = useMemo(() => {
    if (!data) return [];
    return data.recent.filter((row) => {
      if (selectedLeague && String(row.leagueApiId ?? '') !== selectedLeague) return false;
      if (!matchesCountry(row, selectedCountry)) return false;
      return matchesSearch(row, debouncedSearch);
    });
  }, [data, selectedCountry, selectedLeague, debouncedSearch]);

  const visibleCount = filteredLive.length + filteredUpcoming.length + filteredRecent.length;

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const source = new EventSource(`${getApiUrl()}/fixtures/platform/live-scores/stream?archiveHours=48`);

    const onSnapshot = (payload: Payload) => {
      setData(normalizePayload(payload));
      setErr(null);
      setLoading(false);
      pollDelayRef.current = POLL_MS;
      sseActiveRef.current = true;
    };

    source.addEventListener('live-scores-snapshot', (event) => {
      try {
        const e = event as MessageEvent<string>;
        onSnapshot(JSON.parse(e.data) as Payload);
      } catch {
        // ignore malformed packet
      }
    });

    source.addEventListener('live-scores-delta', (event) => {
      try {
        const e = event as MessageEvent<string>;
        const packet = JSON.parse(e.data) as StreamDelta;
        if (!packet.delta) return;
        setData((prev) => applyDelta(prev, packet));
        setErr(null);
        setLoading(false);
        pollDelayRef.current = POLL_MS;
        sseActiveRef.current = true;
      } catch {
        // ignore malformed packet
      }
    });

    source.onerror = () => {
      sseActiveRef.current = false;
      source.close();
    };

    return () => {
      sseActiveRef.current = false;
      source.close();
    };
  }, [applyDelta, normalizePayload]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (sseActiveRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const controller = new AbortController();
      load(controller.signal);
    };

    const schedule = () => {
      timeoutId = setTimeout(() => {
        tick();
        schedule();
      }, pollDelayRef.current);
    };

    schedule();
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        pollDelayRef.current = POLL_MS;
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  const clearFilters = () => {
    setTeamSearch('');
    setSelectedCountry('');
    setSelectedLeague('');
  };

  const hasActiveFilters = !!(selectedCountry || selectedLeague || teamSearch);
  const totalUnfiltered =
    (data?.live.length ?? 0) + (data?.upcoming.length ?? 0) + (data?.recent.length ?? 0);
  const showNoMatchBanner = hasActiveFilters && visibleCount === 0 && totalUnfiltered > 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        <nav className="text-sm text-[var(--text-muted)] mb-4">
          <Link href="/marketplace" className="hover:text-[var(--primary)]">
            {t('nav.marketplace')}
          </Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-[var(--text)] font-medium">{t('live_scores.page_title')}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-2">{t('live_scores.page_title')}</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xl">{t('live_scores.tagline')}</p>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl skeleton bg-[var(--card)] border border-[var(--border)]" />
            ))}
          </div>
        )}

        {err && !loading && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{err}</p>
        )}

        {data && !loading && (
          <>
            <div className="mb-6 space-y-4">
              <div className="relative">
                <label htmlFor="live-scores-search" className="sr-only">
                  {t('live_scores.search_label')}
                </label>
                <input
                  id="live-scores-search"
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  placeholder={t('live_scores.search_placeholder')}
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {teamSearch ? (
                  <button
                    type="button"
                    onClick={() => setTeamSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-1"
                    aria-label={t('live_scores.clear_search')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-[var(--text-muted)] text-sm">{t('live_scores.filter_hint')}</p>
                  <p className="text-[var(--text)] text-sm font-medium">
                    <strong>{visibleCount}</strong> {t('live_scores.matching_fixtures')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {countriesInData.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label htmlFor="live-scores-country" className="text-sm font-medium text-[var(--text)] whitespace-nowrap">
                        {t('live_scores.country')}
                      </label>
                      <select
                        id="live-scores-country"
                        value={selectedCountry}
                        onChange={(e) => {
                          setSelectedCountry(e.target.value);
                          setSelectedLeague('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-w-[140px] max-w-[200px]"
                      >
                        <option value="">{t('live_scores.all_countries')}</option>
                        {countriesInData.map((country) => (
                          <option key={country} value={country}>
                            {country === 'World' ? t('live_scores.world_international') : country}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {competitionOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label htmlFor="live-scores-competition" className="text-sm font-medium text-[var(--text)] whitespace-nowrap">
                        {t('live_scores.competition')}
                      </label>
                      <select
                        id="live-scores-competition"
                        value={competitionOptions.some((l) => String(l.id) === selectedLeague) ? selectedLeague : ''}
                        onChange={(e) => setSelectedLeague(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-w-[180px] max-w-[260px]"
                      >
                        <option value="">{t('live_scores.all_competitions')}</option>
                        {competitionOptions.map((l) => (
                          <option key={l.id} value={String(l.id)}>
                            {l.country ? `${l.name} (${l.country})` : l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('live_scores.clear_filters')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {showNoMatchBanner && (
              <p
                role="status"
                className="mb-6 text-sm rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 px-4 py-3"
              >
                {t('live_scores.no_match_filters')}
              </p>
            )}

            <section className="mb-10">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <span aria-hidden>🔴</span> {t('live_scores.in_play')}
              </h2>
              {filteredLive.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-6">
                  {t('live_scores.empty_live')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredLive.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {row.leagueName ?? '—'} · {formatTime(row.matchDate)}
                        </p>
                        <p className="font-semibold text-[var(--text)] truncate">
                          {row.homeTeamName} <span className="text-[var(--text-muted)] font-normal">vs</span>{' '}
                          {row.awayTeamName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-lg font-bold tabular-nums text-[var(--text)]">
                          {row.homeScore ?? '—'} : {row.awayScore ?? '—'}
                        </span>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 tabular-nums">
                          {formatLiveFixturePeriod(row.status, row.statusElapsed)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mb-10">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <span aria-hidden>⏱️</span> {t('live_scores.not_started')}
              </h2>
              {filteredUpcoming.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-6">
                  {t('live_scores.empty_upcoming')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredUpcoming.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {row.leagueName ?? '—'} · {formatTime(row.matchDate)}
                        </p>
                        <p className="font-semibold text-[var(--text)] truncate">
                          {row.homeTeamName} <span className="text-[var(--text-muted)] font-normal">vs</span>{' '}
                          {row.awayTeamName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm text-[var(--text-muted)] tabular-nums">{t('live_scores.vs_score')}</span>
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {row.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <span aria-hidden>📦</span> {t('live_scores.recent')}
              </h2>
              {filteredRecent.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-6">
                  {t('live_scores.empty_recent')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredRecent.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-sm opacity-95"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {row.leagueName ?? '—'} · {formatTime(row.matchDate)}
                        </p>
                        <p className="font-semibold text-[var(--text)] truncate">
                          {row.homeTeamName} <span className="text-[var(--text-muted)] font-normal">vs</span>{' '}
                          {row.awayTeamName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-lg font-bold tabular-nums text-[var(--text)]">
                          {row.homeScore ?? '—'} : {row.awayScore ?? '—'}
                        </span>
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          FT
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-xs text-[var(--text-muted)] mt-8">
              {t('live_scores.footer_hint')}
              {data.generatedAt && (
                <span className="ml-1">
                  ({formatTime(data.generatedAt)})
                </span>
              )}
            </p>
          </>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
