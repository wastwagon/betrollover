'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { LeagueInsightsPanel } from '@/components/LeagueInsightsPanel';
import { AdSlot } from '@/components/AdSlot';
import { getApiUrl } from '@/lib/site-config';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';

type LeagueRow = { apiId: number; name: string; country: string | null; season: number | null };

export default function LeagueTablesPage() {
  const pathname = usePathname();
  const t = useT();
  const [rows, setRows] = useState<LeagueRow[]>([]);
  const [directoryFailed, setDirectoryFailed] = useState(false);
  const [selectedApiId, setSelectedApiId] = useState<number>(0);
  /** Shown in the season field; empty = let the API pick the current season on each insights request. */
  const [seasonInput, setSeasonInput] = useState('');
  const [seasonResolving, setSeasonResolving] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const syncToken = () => setSignedIn(typeof window !== 'undefined' && !!localStorage.getItem('token'));
    syncToken();
    const onVis = () => {
      if (document.visibilityState === 'visible') syncToken();
    };
    window.addEventListener('storage', syncToken);
    window.addEventListener(AUTH_STORAGE_SYNC, syncToken);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('storage', syncToken);
      window.removeEventListener(AUTH_STORAGE_SYNC, syncToken);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiUrl()}/fixtures/leagues/directory`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { leagues?: LeagueRow[] }) => {
        if (!cancelled) {
          setRows(Array.isArray(data?.leagues) ? data.leagues : []);
          setDirectoryFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setDirectoryFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedApiId) {
      setSeasonInput('');
      setSeasonResolving(false);
      return;
    }
    let cancelled = false;
    setSeasonResolving(true);
    fetch(`${getApiUrl()}/fixtures/leagues/${selectedApiId}/season`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { season?: number | null }) => {
        if (cancelled) return;
        const apiSeason = data?.season;
        const dirSeason = rows.find((l) => l.apiId === selectedApiId)?.season ?? null;
        const pick =
          apiSeason != null && apiSeason > 1990
            ? apiSeason
            : dirSeason != null && dirSeason > 1990
              ? dirSeason
              : null;
        setSeasonInput(pick != null ? String(pick) : '');
      })
      .catch(() => {
        if (cancelled) return;
        const dirSeason = rows.find((l) => l.apiId === selectedApiId)?.season ?? null;
        setSeasonInput(dirSeason != null && dirSeason > 1990 ? String(dirSeason) : '');
      })
      .finally(() => {
        if (!cancelled) setSeasonResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedApiId, rows]);

  const leaguesSorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ca = (a.country || '').toLowerCase();
      const cb = (b.country || '').toLowerCase();
      if (ca !== cb) return ca.localeCompare(cb);
      return a.name.localeCompare(b.name);
    });
  }, [rows]);

  const selectedLeague = useMemo(
    () => rows.find((l) => l.apiId === selectedApiId) ?? null,
    [rows, selectedApiId],
  );

  /** When null, insights endpoint resolves season from DB/API (no hardcoded year). */
  const seasonForInsights = useMemo(() => {
    const raw = seasonInput.trim();
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 1990 ? n : null;
  }, [seasonInput]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-24 lg:pb-16">
        <PageHeader
          label={t('league_stats.breadcrumb')}
          title={t('league_stats.title')}
          tagline={t('league_stats.subtitle')}
        />

        <div className="mb-6">
          <AdSlot zoneSlug="marketplace-full" fullWidth className="w-full rounded-xl overflow-hidden" />
        </div>

        {directoryFailed && (
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            {t('league_stats.directory_error')}
          </p>
        )}

        <div className="rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y border-[var(--border)] sm:border bg-[var(--card)] p-4 sm:p-4 md:p-6 shadow-sm space-y-4 mb-6 -mx-4 px-4 sm:mx-0 sm:px-4 md:px-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {t('league_stats.filters_heading')}
          </h2>
          <div className="grid grid-cols-1 gap-5 md:gap-4">
            <div className="space-y-1.5">
              <label htmlFor="lt-league" className="text-sm font-medium text-[var(--text)]">
                {t('league_stats.league')}
              </label>
              <select
                id="lt-league"
                value={selectedApiId || ''}
                onChange={(e) => setSelectedApiId(Number(e.target.value) || 0)}
                className="w-full min-h-[48px] px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] touch-manipulation"
              >
                <option value="">{t('league_stats.choose_league')}</option>
                {leaguesSorted.map((l) => (
                  <option key={l.apiId} value={l.apiId}>
                    {l.name}
                    {l.country ? ` · ${l.country}` : ''} (ID {l.apiId})
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)] leading-snug">
                {t('league_stats.league_help')}
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lt-season" className="text-sm font-medium text-[var(--text)]">
                {t('league_stats.season_optional')}
              </label>
              <input
                id="lt-season"
                type="text"
                inputMode="numeric"
                placeholder={
                  seasonResolving && !seasonInput.trim()
                    ? t('league_stats.season_loading')
                    : t('league_stats.season_placeholder_auto')
                }
                value={seasonInput}
                disabled={!selectedApiId || seasonResolving}
                onChange={(e) => setSeasonInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full max-w-none sm:max-w-[200px] min-h-[48px] px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] touch-manipulation disabled:opacity-60"
              />
              <p className="text-xs text-[var(--text-muted)] leading-snug">
                {t('league_stats.season_auto_help')}
              </p>
            </div>
          </div>
        </div>

        {!signedIn && (
          <div className="mb-4 space-y-3">
            <Link
              href="/login?redirect=/league-tables"
              className="sm:hidden flex items-center justify-center w-full min-h-[48px] rounded-xl bg-[var(--primary)] text-white font-bold text-sm shadow-md active:scale-[0.99] touch-manipulation"
            >
              {t('league_stats.sign_in_cta')}
            </Link>
            <p className="hidden sm:block text-sm text-[var(--text-muted)] leading-relaxed">
              {t('league_stats.sign_in_note')}{' '}
              <Link href="/login?redirect=/league-tables" className="text-[var(--primary)] font-semibold hover:underline">
                {t('nav.login')}
              </Link>
            </p>
            <p className="sm:hidden text-xs text-[var(--text-muted)] leading-relaxed text-center px-1">
              {t('league_stats.sign_in_note')}
            </p>
          </div>
        )}

        <LeagueInsightsPanel
          layout="full"
          leagueApiId={selectedApiId}
          season={seasonForInsights}
          subtitle={selectedLeague?.name}
          selectionEmptyHint={t('league_stats.select_hint')}
        />
      </main>
      <AppFooter />
    </div>
  );
}
