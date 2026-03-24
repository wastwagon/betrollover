'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

/** API-Football — English Premier League (default competition on this page). */
const DEFAULT_LEAGUE_TABLE_API_ID = 39;

export default function LeagueTablesPage() {
  const pathname = usePathname();
  const t = useT();
  const [rows, setRows] = useState<LeagueRow[]>([]);
  const [directoryFailed, setDirectoryFailed] = useState(false);
  const [selectedApiId, setSelectedApiId] = useState<number>(0);
  const [signedIn, setSignedIn] = useState(false);
  const defaultLeagueAppliedRef = useRef(false);

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

  /** First load: pre-select Premier League when the directory includes it (user can change). */
  useEffect(() => {
    if (rows.length === 0) return;
    if (defaultLeagueAppliedRef.current) return;
    defaultLeagueAppliedRef.current = true;
    if (selectedApiId !== 0) return;
    if (rows.some((l) => l.apiId === DEFAULT_LEAGUE_TABLE_API_ID)) {
      setSelectedApiId(DEFAULT_LEAGUE_TABLE_API_ID);
    }
  }, [rows, selectedApiId]);

  const leaguesSorted = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const ca = (a.country || '').toLowerCase();
      const cb = (b.country || '').toLowerCase();
      if (ca !== cb) return ca.localeCompare(cb);
      return a.name.localeCompare(b.name);
    });
    const pl = sorted.find((l) => l.apiId === DEFAULT_LEAGUE_TABLE_API_ID);
    if (!pl) return sorted;
    return [pl, ...sorted.filter((l) => l.apiId !== DEFAULT_LEAGUE_TABLE_API_ID)];
  }, [rows]);

  const selectedLeague = useMemo(
    () => rows.find((l) => l.apiId === selectedApiId) ?? null,
    [rows, selectedApiId],
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <UnifiedHeader />
      <main className="section-ux-league-shell">
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
          subtitle={selectedLeague?.name}
          selectionEmptyHint={t('league_stats.select_hint')}
        />
      </main>
      <AppFooter />
    </div>
  );
}
