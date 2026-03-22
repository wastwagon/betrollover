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
}

export function LeagueInsightsPanel({ leagueApiId, season, subtitle, className = '' }: LeagueInsightsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>('table');
  const [data, setData] = useState<LeagueInsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLocalErr('Sign in to view live league table and top scorers.');
      return;
    }
    setLoading(true);
    setLocalErr(null);
    try {
      const q = season != null && season > 1990 ? `?season=${season}` : '';
      const r = await fetch(`${getApiUrl()}/fixtures/leagues/${leagueApiId}/insights${q}`, {
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
    if (expanded && data == null && !loading && !localErr) {
      void load();
    }
  }, [expanded, data, loading, localErr, load]);

  useEffect(() => {
    setData(null);
    setLocalErr(null);
  }, [leagueApiId, season]);

  const err = localErr || data?.error;
  const headline = data?.leagueName || subtitle || 'League';

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[var(--text)] hover:bg-[var(--primary-light)]/30 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-base" aria-hidden>📊</span>
          <span className="truncate">League table & top scorers</span>
          {expanded && (
            <span className="text-xs font-normal text-[var(--text-muted)] truncate hidden sm:inline">
              · {headline}
              {data?.season ? ` (${data.season})` : ''}
            </span>
          )}
        </span>
        <span className="text-[var(--text-muted)] text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2">
          {err && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">{err}</p>
          )}

          <div className="flex gap-1 mb-2">
            {(['table', 'scorers'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  tab === t
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border border-[var(--border)]'
                }`}
              >
                {t === 'table' ? 'Table' : 'Top scorers'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setData(null);
                void load();
              }}
              disabled={loading}
              className="ml-auto text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {loading && !data && (
            <div className="h-24 flex items-center justify-center text-sm text-[var(--text-muted)]">Loading…</div>
          )}

          {data && tab === 'table' && (
            <div className="max-h-64 overflow-auto rounded-lg border border-[var(--border)]">
              {data.standings.length === 0 ? (
                <p className="p-3 text-xs text-[var(--text-muted)]">No table data.</p>
              ) : (
                data.standings.map((g, gi) => (
                  <div key={gi}>
                    {g.group && (
                      <div className="sticky top-0 bg-[var(--card)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
                        {g.group}
                      </div>
                    )}
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--card)]">
                          <th className="px-2 py-1.5 w-8">#</th>
                          <th className="px-2 py-1.5">Team</th>
                          <th className="px-2 py-1.5 w-8">P</th>
                          <th className="px-2 py-1.5 w-8">GD</th>
                          <th className="px-2 py-1.5 w-8">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.table.map((row) => (
                          <tr key={`${gi}-${row.rank}-${row.teamName}`} className="border-b border-[var(--border)]/60 last:border-0">
                            <td className="px-2 py-1 text-[var(--text-muted)]">{row.rank}</td>
                            <td className="px-2 py-1 font-medium text-[var(--text)] truncate max-w-[140px]">{row.teamName}</td>
                            <td className="px-2 py-1 text-[var(--text-muted)]">{row.played}</td>
                            <td className="px-2 py-1 text-[var(--text-muted)]">{row.goalsDiff ?? '—'}</td>
                            <td className="px-2 py-1 font-semibold text-[var(--text)]">{row.points}</td>
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
            <div className="max-h-64 overflow-auto rounded-lg border border-[var(--border)]">
              {data.topScorers.length === 0 ? (
                <p className="p-3 text-xs text-[var(--text-muted)]">No scorer data.</p>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--card)]">
                      <th className="px-2 py-1.5 w-8">#</th>
                      <th className="px-2 py-1.5">Player</th>
                      <th className="px-2 py-1.5 hidden sm:table-cell">Team</th>
                      <th className="px-2 py-1.5 w-10">G</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topScorers.map((row) => (
                      <tr key={`${row.rank}-${row.playerName}`} className="border-b border-[var(--border)]/60 last:border-0">
                        <td className="px-2 py-1 text-[var(--text-muted)]">{row.rank}</td>
                        <td className="px-2 py-1 font-medium text-[var(--text)] truncate max-w-[120px]">{row.playerName}</td>
                        <td className="px-2 py-1 text-[var(--text-muted)] truncate max-w-[100px] hidden sm:table-cell">{row.teamName}</td>
                        <td className="px-2 py-1 font-semibold">{row.goals ?? '—'}</td>
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
