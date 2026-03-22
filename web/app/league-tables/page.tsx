'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PageHeader } from '@/components/PageHeader';
import { LeagueInsightsPanel } from '@/components/LeagueInsightsPanel';
import { AdSlot } from '@/components/AdSlot';
import { getApiUrl } from '@/lib/site-config';

type LeagueRow = { apiId: number; name: string; country: string | null; season: number | null };

function countryKey(c: string | null | undefined): string {
  const t = (c || '').trim();
  return t || '—';
}

export default function LeagueTablesPage() {
  const t = useT();
  const [rows, setRows] = useState<LeagueRow[]>([]);
  const [directoryFailed, setDirectoryFailed] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [leagueQuery, setLeagueQuery] = useState('');
  const [selectedApiId, setSelectedApiId] = useState<number>(0);
  const [seasonOverride, setSeasonOverride] = useState('');

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

  const countries = useMemo(() => {
    const s = new Set<string>();
    for (const l of rows) {
      s.add(countryKey(l.country));
    }
    return Array.from(s).sort((a, b) => {
      if (a === '—') return 1;
      if (b === '—') return -1;
      if (a.toLowerCase() === 'world') return -1;
      if (b.toLowerCase() === 'world') return 1;
      return a.localeCompare(b);
    });
  }, [rows]);

  const leaguesFiltered = useMemo(() => {
    const q = leagueQuery.trim().toLowerCase();
    return rows.filter((l) => {
      if (countryFilter && countryKey(l.country) !== countryFilter) return false;
      if (!q) return true;
      return l.name.toLowerCase().includes(q) || String(l.apiId).includes(q);
    });
  }, [rows, countryFilter, leagueQuery]);

  const selectedLeague = useMemo(
    () => rows.find((l) => l.apiId === selectedApiId) ?? null,
    [rows, selectedApiId],
  );

  const seasonForInsights = useMemo(() => {
    const raw = seasonOverride.trim();
    if (raw) {
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 1990 ? n : null;
    }
    const s = selectedLeague?.season;
    return s != null && s > 1990 ? s : null;
  }, [seasonOverride, selectedLeague]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-16">
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

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-6 shadow-sm space-y-4 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {t('league_stats.filters_heading')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="lt-country" className="text-sm font-medium text-[var(--text)]">
                {t('league_stats.country')}
              </label>
              <select
                id="lt-country"
                value={countryFilter}
                onChange={(e) => {
                  setCountryFilter(e.target.value);
                  setSelectedApiId(0);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">{t('league_stats.all_countries')}</option>
                {countries.map((c) => (
                  <option key={c} value={c === '—' ? '—' : c}>
                    {c === '—' ? t('league_stats.country_other') : c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lt-search" className="text-sm font-medium text-[var(--text)]">
                {t('league_stats.search_league')}
              </label>
              <input
                id="lt-search"
                type="search"
                autoComplete="off"
                placeholder={t('league_stats.search_league_placeholder')}
                value={leagueQuery}
                onChange={(e) => setLeagueQuery(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="lt-league" className="text-sm font-medium text-[var(--text)]">
                {t('league_stats.league')}
              </label>
              <select
                id="lt-league"
                value={selectedApiId || ''}
                onChange={(e) => setSelectedApiId(Number(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">{t('league_stats.choose_league')}</option>
                {leaguesFiltered.map((l) => (
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
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="lt-season" className="text-sm font-medium text-[var(--text)]">
                {t('league_stats.season_optional')}
              </label>
              <input
                id="lt-season"
                type="text"
                inputMode="numeric"
                placeholder={
                  selectedLeague?.season
                    ? t('league_stats.season_placeholder', { year: String(selectedLeague.season) })
                    : t('league_stats.season_placeholder_empty')
                }
                value={seasonOverride}
                onChange={(e) => setSeasonOverride(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full max-w-[200px] px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
        </div>

        <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
          {t('league_stats.sign_in_note')}{' '}
          <Link href="/login?redirect=/league-tables" className="text-[var(--primary)] font-semibold hover:underline">
            {t('nav.login')}
          </Link>
        </p>

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
