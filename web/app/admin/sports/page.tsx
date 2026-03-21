'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

interface SportEvent {
  id: number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
  eventDate: string;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
}

interface SyncResult {
  sport: string;
  synced: number;
  error?: string;
  /** For "Sync Results & Settle": picks updated and tickets settled */
  picksUpdated?: number;
  ticketsSettled?: number;
}

interface SyncHealth {
  sport: string;
  lastSync: string | null;
  stale: boolean;
  hoursAgo: number | null;
}

const SPORTS = [
  { key: 'basketball',        icon: '🏀', label: 'Basketball',        endpoint: '/basketball/events' },
  { key: 'rugby',             icon: '🏉', label: 'Rugby',             endpoint: '/rugby/events' },
  { key: 'mma',               icon: '🥊', label: 'MMA',               endpoint: '/mma/events' },
  { key: 'volleyball',        icon: '🏐', label: 'Volleyball',        endpoint: '/volleyball/events' },
  { key: 'hockey',            icon: '🏒', label: 'Hockey',            endpoint: '/hockey/events' },
  { key: 'american_football', icon: '🏈', label: 'American Football', endpoint: '/american-football/events' },
  { key: 'tennis',            icon: '🎾', label: 'Tennis',            endpoint: '/tennis/events' },
] as const;

export default function AdminSportsPage() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<string>('basketball');
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [days, setDays] = useState('7');
  const [healthData, setHealthData] = useState<SyncHealth[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);
  const [settleModal, setSettleModal] = useState<{ event: SportEvent } | null>(null);
  const [settleScores, setSettleScores] = useState({ homeScore: '', awayScore: '' });
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const loadHealth = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setHealthLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/sport-sync/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHealthData(await res.json());
    } catch { /* silent */ } finally {
      setHealthLoading(false);
    }
  };

  const syncAllSports = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSyncingAll(true);
    try {
      const res = await fetch(`${getApiUrl()}/admin/sport-sync/all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      const results = data.results ?? {};
      const newResults: SyncResult[] = Object.entries(results).map(([key, r]: [string, any]) => ({
        sport: key.replace(/-/g, '_'),
        synced: r.success ? (r.count ?? 0) : 0,
        error: r.success ? undefined : (r.error || 'Sync failed'),
      }));
      setSyncResults((prev) => [...newResults, ...prev].slice(0, 20));
    } catch {
      setSyncResults((prev) => [{ sport: 'all', synced: 0, error: 'Network error' }, ...prev].slice(0, 20));
    } finally {
      setSyncingAll(false);
      await loadHealth();
      await loadEvents(selectedSport);
    }
  };

  const loadEvents = async (sport: string) => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    try {
      // Admin endpoint includes past events so we can show "Settle" for events >3 days old
      const res = await fetch(`${getApiUrl()}/admin/sports/events?sport=${sport}&days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json().catch(() => ({ events: [] }));
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async (sport: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSyncing(sport);

    // "Sync Results & Settle" = full flow: fetch Odds API scores, then settle picks
    if (sport === 'results') {
      try {
        const res = await fetch(`${getApiUrl()}/admin/settlement/run`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const eventsFt = data.oddsApiEventsMarkedFt ?? 0;
          const picks = data.picksUpdated ?? 0;
          const tickets = data.ticketsSettled ?? 0;
          setSyncResults((prev) => [
            { sport: 'results', synced: eventsFt, error: undefined, picksUpdated: picks, ticketsSettled: tickets },
            ...prev.slice(0, 9),
          ]);
          if (eventsFt > 0 || picks > 0 || tickets > 0) {
            await loadEvents(selectedSport);
          }
        } else {
          setSyncResults((prev) => [
            { sport: 'results', synced: 0, error: data.message || 'Settlement failed' },
            ...prev.slice(0, 9),
          ]);
        }
      } catch {
        setSyncResults((prev) => [
          { sport: 'results', synced: 0, error: 'Network error' },
          ...prev.slice(0, 9),
        ]);
      } finally {
        setSyncing(null);
      }
      return;
    }

    // Per-sport sync: POST /admin/sport-sync/:sport
    const sportSlug = sport.replace(/_/g, '-');
    try {
      const res = await fetch(`${getApiUrl()}/admin/sport-sync/${sportSlug}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      const synced = data.games ?? data.fights ?? data.synced ?? data.events ?? 0;
      setSyncResults((prev) => [
        { sport, synced, error: res.ok ? undefined : (data.message || 'Sync failed') },
        ...prev.slice(0, 9),
      ]);
      if (res.ok && selectedSport === sport) await loadEvents(sport);
    } catch (e) {
      setSyncResults((prev) => [
        { sport, synced: 0, error: 'Network error' },
        ...prev.slice(0, 9),
      ]);
    } finally {
      setSyncing(null);
    }
  };

  const openSettleModal = (ev: SportEvent) => {
    setSettleModal({ event: ev });
    setSettleScores({
      homeScore: ev.homeScore != null ? String(ev.homeScore) : '',
      awayScore: ev.awayScore != null ? String(ev.awayScore) : '',
    });
    setSettleError(null);
  };

  const closeSettleModal = () => {
    setSettleModal(null);
    setSettleScores({ homeScore: '', awayScore: '' });
    setSettleError(null);
  };

  const submitSettle = async () => {
    if (!settleModal) return;
    const homeScore = parseInt(settleScores.homeScore, 10);
    const awayScore = parseInt(settleScores.awayScore, 10);
    if (!Number.isFinite(homeScore) || homeScore < 0 || !Number.isFinite(awayScore) || awayScore < 0) {
      setSettleError('Enter non-negative numbers for both scores.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setSettleSubmitting(true);
    setSettleError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/sport-events/${settleModal.event.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ homeScore, awayScore }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const picks = data.picksUpdated ?? 0;
        const tickets = data.ticketsSettled ?? 0;
        setSyncResults((prev) => [
          { sport: 'settle', synced: 1, error: undefined, picksUpdated: picks, ticketsSettled: tickets },
          ...prev.slice(0, 9),
        ]);
        closeSettleModal();
        await loadEvents(selectedSport);
      } else {
        setSettleError(data.message || 'Settlement failed');
      }
    } catch {
      setSettleError('Network error');
    } finally {
      setSettleSubmitting(false);
    }
  };

  useEffect(() => {
    loadEvents(selectedSport);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSport, days]);

  useEffect(() => {
    loadHealth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedDef = SPORTS.find((s) => s.key === selectedSport);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <AdminSidebar />
      <main className="admin-main-sibling flex-1 w-full min-w-0 overflow-x-auto md:ml-56">
        <div className="p-4 md:p-6 max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Multi-Sport Management</h1>
            <p className="text-sm text-[var(--text-muted)]">View events and trigger sync for each sport. Football is managed via the Fixtures page.</p>
          </div>

          {/* Sync health panel — always shown */}
          <div className="mb-6 bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Sync Health Monitor</p>
              <button
                onClick={loadHealth}
                disabled={healthLoading}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
              >
                {healthLoading ? '…' : '↻ Refresh'}
              </button>
            </div>
            {healthLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPORTS.map((s) => (
                  <div key={s.key} className="rounded-xl px-3 py-2 border border-[var(--border)] bg-[var(--bg)] h-12 animate-pulse" />
                ))}
              </div>
            ) : healthData.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No health data yet — trigger a sync to populate.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {healthData.map((h) => {
                    const sportDef = SPORTS.find((s) => s.key === h.sport);
                    return (
                      <div
                        key={h.sport}
                        className={`rounded-xl px-3 py-2 border text-xs ${
                          h.stale
                            ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                            : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                        }`}
                      >
                        <p className="font-semibold text-[var(--text)] flex items-center gap-1">
                          <span>{sportDef?.icon ?? '•'}</span>
                          <span>{sportDef?.label ?? h.sport}</span>
                          <span className={`ml-auto text-[10px] font-bold ${h.stale ? 'text-red-600' : 'text-emerald-600'}`}>
                            {h.stale ? '⚠ STALE' : '✓ OK'}
                          </span>
                        </p>
                        <p className="text-[var(--text-muted)] mt-0.5">
                          {h.lastSync ? `${h.hoursAgo}h ago` : 'Never synced'}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {healthData.some((h) => h.stale) && (
                  <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                    ⚠ One or more sports have stale data (&gt;25h). Use &quot;Sync All Sports&quot; below or check your environment variables.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Sport selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {SPORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelectedSport(s.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  selectedSport === s.key
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={syncAllSports}
              disabled={syncingAll || syncing !== null}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              title="Sync all 7 non-football sports in sequence"
            >
              {syncingAll ? '⏳ Syncing All…' : '⚡ Sync All Sports'}
            </button>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[var(--text-muted)]">Days ahead:</label>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {['3', '7', '14'].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => loadEvents(selectedSport)}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm font-medium hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading…' : '↻ Refresh'}
            </button>
            <button
              onClick={() => triggerSync(selectedSport)}
              disabled={syncing === selectedSport}
              className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
            >
              {syncing === selectedSport ? 'Syncing…' : `⚡ Sync ${selectedDef?.label ?? ''}`}
            </button>
            <button
              onClick={() => triggerSync('results')}
              disabled={syncing === 'results' || syncingAll}
              title="Fetch completed scores from The Odds API and settle pending coupons"
              className="px-4 py-1.5 rounded-lg bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {syncing === 'results' ? 'Fetching…' : '✓ Sync Results & Settle'}
            </button>
          </div>

          {/* Sync log */}
          {syncResults.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recent Sync Log</p>
              <ul className="space-y-1">
                {syncResults.map((r, i) => (
                  <li key={i} className={`text-xs flex items-center gap-2 ${r.error ? 'text-red-600' : 'text-emerald-700'}`}>
                    <span>{r.error ? '✗' : '✓'}</span>
                    <span className="font-medium capitalize">{r.sport.replace(/_/g, ' ')}</span>
                    <span>
                      {r.error
                        ? r.error
                        : r.sport === 'results'
                          ? `${r.synced} events FT${r.picksUpdated != null || r.ticketsSettled != null ? `, ${r.picksUpdated ?? 0} picks, ${r.ticketsSettled ?? 0} tickets` : ''}`
                          : r.sport === 'settle'
                            ? `1 event settled${r.picksUpdated != null || r.ticketsSettled != null ? `, ${r.picksUpdated ?? 0} picks, ${r.ticketsSettled ?? 0} tickets` : ''}`
                            : `${r.synced} events synced`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Events table */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text)] flex items-center gap-2">
                <span>{selectedDef?.icon}</span>
                <span>{selectedDef?.label} Events</span>
              </h2>
              <span className="text-sm text-[var(--text-muted)]">{events.length} events</span>
            </div>

            {loading ? (
              <div className="p-10 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-4xl mb-3">{selectedDef?.icon}</p>
                <p className="font-semibold text-[var(--text)] mb-1">No events found</p>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  {selectedSport === 'volleyball'
                    ? `Click "Sync Volleyball" to fetch events from API-Sports.`
                    : `Click "Sync ${selectedDef?.label}" to fetch events from The Odds API.`}
                  <br />
                  Make sure <code className="bg-[var(--border)] px-1 rounded text-xs">ENABLED_SPORTS</code> includes <code className="bg-[var(--border)] px-1 rounded text-xs">{selectedSport}</code> and{' '}
                  {selectedSport === 'volleyball'
                    ? <><code className="bg-[var(--border)] px-1 rounded text-xs">API_SPORTS_KEY</code> is set in your environment.</>
                    : <><code className="bg-[var(--border)] px-1 rounded text-xs">ODDS_API_KEY</code> is set in your environment.</>}
                </p>
                <button
                  onClick={() => triggerSync(selectedSport)}
                  disabled={syncing === selectedSport}
                  className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
                >
                  {syncing === selectedSport ? 'Syncing…' : `⚡ Sync Now`}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg)]/60">
                      <th className="text-left px-5 py-3 font-semibold text-[var(--text-muted)]">Match</th>
                      <th className="text-left px-5 py-3 font-semibold text-[var(--text-muted)]">League</th>
                      <th className="text-left px-5 py-3 font-semibold text-[var(--text-muted)]">Date</th>
                      <th className="text-left px-5 py-3 font-semibold text-[var(--text-muted)]">Status</th>
                      <th className="text-right px-5 py-3 font-semibold text-[var(--text-muted)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr key={ev.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]/40 transition-colors">
                        <td className="px-5 py-3 font-medium text-[var(--text)]">
                          {ev.homeTeam} <span className="text-[var(--text-muted)] font-normal">vs</span> {ev.awayTeam}
                        </td>
                        <td className="px-5 py-3 text-[var(--text-muted)]">{ev.leagueName ?? '—'}</td>
                        <td className="px-5 py-3 text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(ev.eventDate).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            ev.status === 'NS' ? 'bg-blue-100 text-blue-700' :
                            ev.status === 'FT' ? 'bg-slate-100 text-slate-600' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {ev.status === 'FT' && ev.homeScore != null && ev.awayScore != null
                              ? `${ev.homeScore}–${ev.awayScore}`
                              : ev.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {ev.status !== 'FT' && (
                            <button
                              type="button"
                              onClick={() => openSettleModal(ev)}
                              title="Manually set result (e.g. when Odds API no longer returns this match)"
                              className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                            >
                              Settle
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Manual settle modal */}
          {settleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeSettleModal}>
              <div
                className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xl max-w-md w-full p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-semibold text-[var(--text)] mb-1">Settle event manually</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Use when the Odds API no longer returns this match (e.g. &gt;3 days old). Picks on this event will be settled from the scores you enter.
                </p>
                <p className="text-sm font-medium text-[var(--text)] mb-2">
                  {settleModal.event.homeTeam} vs {settleModal.event.awayTeam}
                </p>
                <div className="flex gap-4 mb-4">
                  <label className="flex-1">
                    <span className="block text-xs text-[var(--text-muted)] mb-1">Home score</span>
                    <input
                      type="number"
                      min={0}
                      value={settleScores.homeScore}
                      onChange={(e) => setSettleScores((s) => ({ ...s, homeScore: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                      placeholder="0"
                    />
                  </label>
                  <label className="flex-1">
                    <span className="block text-xs text-[var(--text-muted)] mb-1">Away score</span>
                    <input
                      type="number"
                      min={0}
                      value={settleScores.awayScore}
                      onChange={(e) => setSettleScores((s) => ({ ...s, awayScore: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                      placeholder="0"
                    />
                  </label>
                </div>
                {selectedSport === 'tennis' && (
                  <p className="text-xs text-[var(--text-muted)] mb-3">
                    Tennis: enter sets won (e.g. 2–0 for a straight-sets win).
                  </p>
                )}
                {settleError && (
                  <p className="text-sm text-red-600 mb-3">{settleError}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={closeSettleModal}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitSettle}
                    disabled={settleSubmitting}
                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    {settleSubmitting ? 'Settling…' : 'Settle'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
