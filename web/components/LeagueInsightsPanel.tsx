'use client';

import { useCallback, useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/site-config';

export interface LeagueInsightsData {
  leagueApiId: number;
  season: number;
  leagueName: string | null;
  country: string | null;
  standings: Array<{
    group: string | null;
    table: Array<{
      rank: number;
      teamName: string;
      teamLogo: string | null;
      points: number;
      played: number;
      win: number;
      draw: number;
      loss: number;
      goalsFor: number;
      goalsAgainst: number;
      goalsDiff: number | null;
    }>;
  }>;
  topScorers: Array<{
    rank: number;
    playerName: string;
    playerPhoto: string | null;
    teamName: string;
    goals: number | null;
    assists: number | null;
  }>;
  cachedAt: string;
  fromCache: boolean;
  error?: string;
}

type Tab = 'table' | 'scorers';

interface LeagueInsightsPanelProps {
  leagueApiId: number;
  season?: number | null;
  subtitle?: string;
  className?: string;
  /** `full` = always open, loads immediately (dedicated stats page). */
  layout?: 'accordion' | 'full';
  /** When `layout="full"` and no `leagueApiId`, shown inside the dashed placeholder. */
  selectionEmptyHint?: string;
}

export function LeagueInsightsPanel({
  leagueApiId,
  season,
  subtitle,
  className = '',
  layout = 'accordion',
  selectionEmptyHint,
}: LeagueInsightsPanelProps) {
  const isFull = layout === 'full';
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>('table');
  const [data, setData] = useState<LeagueInsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLocalErr('Sign in to view live league table and top scorers.');
      return;
    }
    setLoading(true);
    setLocalErr(null);
    try {
      const params = new URLSearchParams();
      if (season != null && season > 1990) params.set('season', String(season));
      if (opts?.refresh) params.set('refresh', '1');
      const qs = params.toString();
      const r = await fetch(`${getApiUrl()}/fixtures/leagues/${leagueApiId}/insights${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { message?: string }).message || `Could not load (${r.status})`);
      }
      setData((await r.json()) as LeagueInsightsData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load league data.';
      setLocalErr(msg);
    } finally {
      setLoading(false);
    }
  }, [leagueApiId, season]);

  useEffect(() => {
    if (isFull) return;
    if (expanded && data == null && !loading && !localErr) {
      void load();
    }
  }, [isFull, expanded, data, loading, localErr, load]);

  useEffect(() => {
    if (!isFull || !leagueApiId) return;
    setData(null);
    setLocalErr(null);
    void load();
  }, [isFull, leagueApiId, season, load]);

  useEffect(() => {
    if (isFull) return;
    setData(null);
    setLocalErr(null);
  }, [isFull, leagueApiId, season]);

  const err = localErr || data?.error;
  const headline = data?.leagueName || subtitle || 'League';
  /** Shown in collapsed accordion so multiple panels on one page are not visually identical. */
  const collapsedLeagueHint = subtitle?.trim() || (leagueApiId ? `League #${leagueApiId}` : null);
  const panelOpen = isFull || expanded;

  if (isFull && !leagueApiId) {
    return (
      <div
        className={`rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)]/50 px-4 py-10 text-center text-sm text-[var(--text-muted)] ${className}`}
      >
        {selectionEmptyHint ||
          'Select a country and league to load the table and top scorers.'}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden ${className}`}>
      {!isFull && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full min-w-0 flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[var(--text)] hover:bg-[var(--primary-light)]/30 transition-colors"
        >
          <span className="flex flex-col items-start gap-0.5 min-w-0">
            <span className="flex items-center gap-2 min-w-0 w-full">
              <span className="text-base shrink-0" aria-hidden>📊</span>
              <span className="truncate text-left">
                {collapsedLeagueHint ? (
                  <>
                    <span className="text-[var(--text)]">{collapsedLeagueHint}</span>
                    <span className="font-normal text-[var(--text-muted)]"> · Table & scorers</span>
                  </>
                ) : (
                  'League table & top scorers'
                )}
              </span>
            </span>
            {expanded && (
              <span className="text-xs font-normal text-[var(--text-muted)] truncate pl-7 w-full text-left hidden sm:block">
                {headline}
                {data?.season ? ` (${data.season})` : ''}
              </span>
            )}
          </span>
          <span className="text-[var(--text-muted)] text-xs shrink-0 self-center">{expanded ? '▲' : '▼'}</span>
        </button>
      )}

      {isFull && (
        <div className="px-3 sm:px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]/40 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg" aria-hidden>📊</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-sm font-bold text-[var(--text)] truncate">{headline}</h2>
              {data?.season != null && (
                <p className="text-xs text-[var(--text-muted)]">Season {data.season}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {panelOpen && (
        <div className={`${isFull ? 'px-3 sm:px-4 py-4' : 'border-t border-[var(--border)] px-3 pb-3 pt-2'}`}>
          {err && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">{err}</p>
          )}

          <div className="flex flex-wrap items-stretch gap-2 mb-3">
            {(['table', 'scorers'] as const).map((tb) => (
              <button
                key={tb}
                type="button"
                onClick={() => setTab(tb)}
                className={`rounded-xl font-semibold transition-colors touch-manipulation ${
                  isFull ? 'min-h-[44px] px-4 text-sm' : 'px-2.5 py-1 rounded-lg text-xs'
                } ${
                  tab === tb
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border border-[var(--border)]'
                }`}
              >
                {tb === 'table' ? 'Table' : 'Top scorers'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setData(null);
                void load({ refresh: true });
              }}
              disabled={loading}
              className={`ml-auto font-medium text-[var(--primary)] hover:underline disabled:opacity-50 touch-manipulation ${
                isFull
                  ? 'min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center rounded-xl border border-[var(--primary)]/30 text-sm'
                  : 'text-xs'
              }`}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {loading && !data && (
            <div className="h-24 flex items-center justify-center text-sm text-[var(--text-muted)]">Loading…</div>
          )}

          {data && tab === 'table' && (
            <div
              className={`overflow-auto rounded-lg border border-[var(--border)] touch-pan-x ${isFull ? 'max-h-[min(75vh,720px)] sm:max-h-[min(70vh,640px)]' : 'max-h-64'}`}
            >
              {data.standings.length === 0 ? (
                <p className="p-3 text-xs text-[var(--text-muted)]">No table data.</p>
              ) : (
                data.standings.map((g, gi) => (
                  <div key={gi}>
                    {g.group && (
                      <div className="sticky top-0 bg-[var(--card)] px-2 py-1.5 text-[10px] sm:text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
                        {g.group}
                      </div>
                    )}
                    <table className="w-full text-xs sm:text-[11px] min-w-[280px]">
                      <thead>
                        <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--card)]">
                          <th className="px-2 py-2 sm:py-1.5 w-8">#</th>
                          <th className="px-2 py-2 sm:py-1.5">Team</th>
                          <th className="px-2 py-2 sm:py-1.5 w-8">P</th>
                          <th className="px-2 py-2 sm:py-1.5 w-8">GD</th>
                          <th className="px-2 py-2 sm:py-1.5 w-8">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.table.map((row) => (
                          <tr key={`${gi}-${row.rank}-${row.teamName}`} className="border-b border-[var(--border)]/60 last:border-0">
                            <td className="px-2 py-2 sm:py-1 text-[var(--text-muted)]">{row.rank}</td>
                            <td className="px-2 py-2 sm:py-1 font-medium text-[var(--text)] truncate max-w-[min(52vw,220px)] sm:max-w-[140px]">{row.teamName}</td>
                            <td className="px-2 py-2 sm:py-1 text-[var(--text-muted)]">{row.played}</td>
                            <td className="px-2 py-2 sm:py-1 text-[var(--text-muted)]">{row.goalsDiff ?? '—'}</td>
                            <td className="px-2 py-2 sm:py-1 font-semibold text-[var(--text)]">{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}

          {data && tab === 'scorers' && (
            <div
              className={`overflow-auto rounded-lg border border-[var(--border)] touch-pan-x ${isFull ? 'max-h-[min(75vh,720px)] sm:max-h-[min(70vh,640px)]' : 'max-h-64'}`}
            >
              {data.topScorers.length === 0 ? (
                <p className="p-3 text-xs text-[var(--text-muted)]">No scorer data.</p>
              ) : (
                <table className="w-full text-xs sm:text-[11px] min-w-[260px]">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--card)]">
                      <th className="px-2 py-2 sm:py-1.5 w-8">#</th>
                      <th className="px-2 py-2 sm:py-1.5">Player</th>
                      <th className="px-2 py-2 sm:py-1.5 hidden sm:table-cell">Team</th>
                      <th className="px-2 py-2 sm:py-1.5 w-10">G</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topScorers.map((row) => (
                      <tr key={`${row.rank}-${row.playerName}`} className="border-b border-[var(--border)]/60 last:border-0">
                        <td className="px-2 py-2 sm:py-1 text-[var(--text-muted)]">{row.rank}</td>
                        <td className="px-2 py-2 sm:py-1 font-medium text-[var(--text)] truncate max-w-[min(48vw,200px)] sm:max-w-[120px]">{row.playerName}</td>
                        <td className="px-2 py-2 sm:py-1 text-[var(--text-muted)] truncate max-w-[100px] hidden sm:table-cell">{row.teamName}</td>
                        <td className="px-2 py-2 sm:py-1 font-semibold">{row.goals ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {data?.fromCache === false && data && (
            <p className="mt-2 text-[10px] text-[var(--text-muted)]">Updated just now from API. Cached ~45 min server-side.</p>
          )}
          {data?.fromCache === true && (
            <p className="mt-2 text-[10px] text-[var(--text-muted)]">Served from cache (refreshes automatically).</p>
          )}
        </div>
      )}
    </div>
  );
}
