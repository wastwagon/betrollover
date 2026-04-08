'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';

interface DbFixture {
  id: number;
  homeTeamName: string;
  awayTeamName: string;
  leagueName: string | null;
  matchDate: string;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
  htHomeScore?: number | null;
  htAwayScore?: number | null;
  odds?: { marketName: string; marketValue: string; odds: number }[];
}

function scoreLine(h: number | null | undefined, a: number | null | undefined): string {
  if (h != null && a != null && Number.isFinite(Number(h)) && Number.isFinite(Number(a))) {
    return `${h}–${a}`;
  }
  return '—';
}

interface FilterOptions {
  countries: string[];
  tournaments: Array<{ id: number; name: string; country: string | null; isInternational?: boolean }>;
  leagues: Array<{ id: number; name: string; country: string | null }>;
}

interface SyncDiagnostic {
  ok: boolean;
  message?: string;
  dates: string[];
  apiTotalFixtures: number;
  apiFixturesWithOdds: number;
  apiCoveragePercent: number;
  apiEnabledLeagueFixturesWithOdds: number;
  apiEnabledCoveragePercent: number;
  apiLeagues: { apiId: number; name: string; country: string; fixtureCount: number }[];
  enabledLeagueIds: number[];
  enabledCount: number;
  inApiNotEnabled: { apiId: number; name: string; country: string; fixtureCount: number }[];
  dbUpcomingCount: number;
  dbWithoutOddsCount: number;
}

interface EnableLeaguesResult {
  ok: boolean;
  message?: string;
  added: number;
  alreadyEnabled: number;
  leagues: { apiId: number; name: string; country: string }[];
}

interface SyncStatusRow {
  syncType: string;
  status: string;
  lastSyncAt?: string | null;
  lastSyncCount?: number | null;
  lastSyncLeagues?: number | null;
  lastSyncDueMissing?: number | null;
  lastSyncDueStale?: number | null;
}

interface LiveStreamMetrics {
  activeConnections: number;
  totalConnections: number;
  totalEvents: number;
  totalPayloadBytes: number;
  avgEventsPerMinute: number;
  avgPayloadBytesPerEvent: number;
  startedAt: string;
  uptimeSeconds: number;
  lastEventAt: string | null;
}

interface StreamAlertThresholds {
  warnActiveConnections: number;
  criticalActiveConnections: number;
  warnEventsPerMinute: number;
  warnAvgPayloadBytes: number;
  warnStaleSeconds: number;
  criticalStaleSeconds: number;
}

const DEFAULT_STREAM_THRESHOLDS: StreamAlertThresholds = {
  warnActiveConnections: 120,
  criticalActiveConnections: 250,
  warnEventsPerMinute: 80,
  warnAvgPayloadBytes: 10_000,
  warnStaleSeconds: 90,
  criticalStaleSeconds: 180,
};

export default function AdminFixturesPage() {
  const LOOKAHEAD_DAYS = 3;
  const LOOKAHEAD_HOURS = LOOKAHEAD_DAYS * 24;
  const PAGE_SIZE = 200;
  const router = useRouter();
  const [fixtures, setFixtures] = useState<DbFixture[]>([]);
  const [allFixtures, setAllFixtures] = useState<DbFixture[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [fetchingResults, setFetchingResults] = useState(false);
  const [settling, setSettling] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<{ updated: number; settled?: number } | null>(null);
  const [reconcileMsg, setReconcileMsg] = useState<{
    picksRegraded: number;
    ticketsOutcomeChanged: number;
    escrowTicketsAdjusted: number;
    errors: string[];
  } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    fixtures: number;
    leagues: number;
    oddsDueMissing?: number;
    oddsDueStale?: number;
  } | null>(null);
  const [oddsHealth, setOddsHealth] = useState<{
    status: string;
    lastSyncAt: string | null;
    lastSyncCount: number;
    dueMissing: number;
    dueStale: number;
  } | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ countries: [], tournaments: [], leagues: [] });
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [diagnostic, setDiagnostic] = useState<SyncDiagnostic | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [enablingLeagues, setEnablingLeagues] = useState(false);
  const [enableLeaguesResult, setEnableLeaguesResult] = useState<EnableLeaguesResult | null>(null);
  const [enabledLeaguesCount, setEnabledLeaguesCount] = useState<number | null>(null);
  const [streamMetrics, setStreamMetrics] = useState<LiveStreamMetrics | null>(null);
  const [streamThresholds, setStreamThresholds] = useState<StreamAlertThresholds>(DEFAULT_STREAM_THRESHOLDS);
  const [savingStreamThresholds, setSavingStreamThresholds] = useState(false);
  const [streamThresholdError, setStreamThresholdError] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(allFixtures.length / PAGE_SIZE));

  const streamHealth = useMemo(() => {
    if (!streamMetrics) return null;
    const now = Date.now();
    const lastEventAgeSec = streamMetrics.lastEventAt
      ? Math.floor((now - new Date(streamMetrics.lastEventAt).getTime()) / 1000)
      : null;

    const alerts: { level: 'warn' | 'critical'; text: string }[] = [];
    if (streamMetrics.activeConnections >= streamThresholds.criticalActiveConnections) {
      alerts.push({ level: 'critical', text: `High active stream load (${streamMetrics.activeConnections})` });
    } else if (streamMetrics.activeConnections >= streamThresholds.warnActiveConnections) {
      alerts.push({ level: 'warn', text: `Rising active stream load (${streamMetrics.activeConnections})` });
    }

    if (streamMetrics.avgEventsPerMinute >= streamThresholds.warnEventsPerMinute) {
      alerts.push({ level: 'warn', text: `Event throughput spike (${streamMetrics.avgEventsPerMinute}/min)` });
    }

    if (streamMetrics.avgPayloadBytesPerEvent >= streamThresholds.warnAvgPayloadBytes) {
      alerts.push({ level: 'warn', text: `Large average payload (${streamMetrics.avgPayloadBytesPerEvent} B/event)` });
    }

    if (lastEventAgeSec != null && lastEventAgeSec >= streamThresholds.criticalStaleSeconds) {
      alerts.push({ level: 'critical', text: `No stream events for ${lastEventAgeSec}s` });
    } else if (lastEventAgeSec != null && lastEventAgeSec >= streamThresholds.warnStaleSeconds) {
      alerts.push({ level: 'warn', text: `Stream quiet for ${lastEventAgeSec}s` });
    }

    const critical = alerts.some((a) => a.level === 'critical');
    return { alerts, critical, lastEventAgeSec };
  }, [streamMetrics, streamThresholds]);

  const loadStreamThresholds = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const t = data?.streamAlertThresholds;
        if (t && typeof t.warnActiveConnections === 'number') {
          setStreamThresholds({
            warnActiveConnections: t.warnActiveConnections,
            criticalActiveConnections: t.criticalActiveConnections,
            warnEventsPerMinute: t.warnEventsPerMinute,
            warnAvgPayloadBytes: t.warnAvgPayloadBytes,
            warnStaleSeconds: t.warnStaleSeconds,
            criticalStaleSeconds: t.criticalStaleSeconds,
          });
          setStreamThresholdError(null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem('admin.streamAlertThresholds');
    } catch {
      // ignore
    }
  }, []);

  const competitionOptions = useMemo(() => {
    const leagues = filterOptions.leagues || [];
    if (!selectedCountry || selectedCountry.trim() === '') return leagues;
    if (selectedCountry.trim().toLowerCase() === 'world') {
      return leagues.filter(
        (l) => !(l.country || '').trim() || (l.country || '').trim().toLowerCase() === 'world'
      );
    }
    return leagues.filter(
      (l) => (l.country || '').trim().toLowerCase() === selectedCountry.trim().toLowerCase()
    );
  }, [filterOptions.leagues, selectedCountry]);

  const load = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('days', String(LOOKAHEAD_DAYS));
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedCompetition) params.set('league', selectedCompetition);
    fetch(`${getApiUrl()}/fixtures?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setAllFixtures(rows);
      })
      .catch(() => {
        setAllFixtures([]);
        setFixtures([]);
        setHasNextPage(false);
      })
      .finally(() => setLoading(false));
  }, [selectedCountry, selectedCompetition]);

  useEffect(() => {
    setPage(1);
  }, [selectedCountry, selectedCompetition]);

  useEffect(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    setFixtures(allFixtures.slice(start, end));
    setHasNextPage(end < allFixtures.length);
  }, [allFixtures, page]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/fixtures/filters`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setFilterOptions({ countries: data.countries || [], tournaments: data.tournaments || [], leagues: data.leagues || [] });
      })
      .catch(() => {});
  }, []);

  const loadSyncStatus = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/fixtures/sync/status`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((statuses) => {
        const rows: SyncStatusRow[] = Array.isArray(statuses) ? statuses : [];
        const fixturesStatus = rows.find((s) => s.syncType === 'fixtures') ?? null;
        const oddsStatus = rows.find((s) => s.syncType === 'odds') ?? null;
        if (fixturesStatus?.lastSyncCount != null && fixturesStatus?.lastSyncAt) {
          setSyncResult({
            fixtures: fixturesStatus.lastSyncCount,
            leagues: fixturesStatus.lastSyncLeagues ?? 0,
            oddsDueMissing:
              typeof oddsStatus?.lastSyncDueMissing === 'number'
                ? oddsStatus.lastSyncDueMissing
                : undefined,
            oddsDueStale:
              typeof oddsStatus?.lastSyncDueStale === 'number'
                ? oddsStatus.lastSyncDueStale
                : undefined,
          });
        }
        if (oddsStatus) {
          setOddsHealth({
            status: oddsStatus.status || 'idle',
            lastSyncAt: oddsStatus.lastSyncAt ?? null,
            lastSyncCount: Number(oddsStatus.lastSyncCount ?? 0),
            dueMissing: Number(oddsStatus.lastSyncDueMissing ?? 0),
            dueStale: Number(oddsStatus.lastSyncDueStale ?? 0),
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  // Reset country/competition if no longer in filtered list (e.g. no fixtures in next 72 hours)
  useEffect(() => {
    const countries = filterOptions.countries || [];
    const leagues = filterOptions.leagues || [];
    if (selectedCountry && (countries.length === 0 || !countries.includes(selectedCountry))) {
      setSelectedCountry('');
      setSelectedCompetition('');
    } else if (selectedCompetition && (leagues.length === 0 || !leagues.some((l) => String(l.id) === selectedCompetition))) {
      setSelectedCompetition('');
    }
  }, [filterOptions.countries, filterOptions.leagues, selectedCountry, selectedCompetition]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
      return;
    }
    load();
  }, [router, load]);

  const loadDiagnostic = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDiagnosticLoading(true);
    setDiagnostic(null);
    fetch(`${getApiUrl()}/fixtures/sync/diagnostic`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setDiagnostic(data))
      .catch(() => setDiagnostic(null))
      .finally(() => setDiagnosticLoading(false));
  }, []);

  const loadEnabledLeaguesCount = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/fixtures/sync/enabled-leagues`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => setEnabledLeaguesCount(Array.isArray(arr) ? arr.length : 0))
      .catch(() => setEnabledLeaguesCount(null));
  }, []);

  const loadStreamMetrics = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/fixtures/platform/live-scores/stream/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStreamMetrics(data))
      .catch(() => setStreamMetrics(null));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    loadDiagnostic();
    loadEnabledLeaguesCount();
    loadStreamMetrics();
    loadStreamThresholds();
  }, [loadDiagnostic, loadEnabledLeaguesCount, loadStreamMetrics, loadStreamThresholds]);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      loadStreamMetrics();
    }, 20_000);
    return () => clearInterval(id);
  }, [loadStreamMetrics]);

  const saveStreamThresholdsToServer = async (next: StreamAlertThresholds) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSavingStreamThresholds(true);
    setStreamThresholdError(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/settings/stream-alert-thresholds`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStreamThresholdError(getApiErrorMessage(err, 'Failed to save thresholds'));
        loadStreamThresholds();
        return;
      }
      const saved = await res.json();
      setStreamThresholds({
        warnActiveConnections: saved.warnActiveConnections,
        criticalActiveConnections: saved.criticalActiveConnections,
        warnEventsPerMinute: saved.warnEventsPerMinute,
        warnAvgPayloadBytes: saved.warnAvgPayloadBytes,
        warnStaleSeconds: saved.warnStaleSeconds,
        criticalStaleSeconds: saved.criticalStaleSeconds,
      });
    } catch {
      setStreamThresholdError('Network error while saving thresholds');
      loadStreamThresholds();
    } finally {
      setSavingStreamThresholds(false);
    }
  };

  const enableAllLeaguesFromApi = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setEnablingLeagues(true);
    setEnableLeaguesResult(null);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/fixtures/sync/enable-leagues-from-api`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEnableLeaguesResult(data);
        loadEnabledLeaguesCount();
        loadDiagnostic();
      } else {
        setError(getApiErrorMessage(data, 'Failed to enable leagues. Check API key in Settings.'));
      }
    } catch {
      setError('Failed to enable leagues.');
    } finally {
      setEnablingLeagues(false);
    }
  };

  const fetchResults = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setFetchingResults(true);
    setError(null);
    setResultMsg(null);
    try {
      const res = await fetch(`${getApiUrl()}/fixtures/sync/results`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResultMsg({ updated: (data as { updated?: number })?.updated ?? 0 });
        load();
      } else {
        setError(getApiErrorMessage(data, 'Failed to fetch results. Check API_SPORTS_KEY in Admin → Settings.'));
      }
    } catch {
      setError('Failed to fetch results. Network error.');
    } finally {
      setFetchingResults(false);
    }
  };

  const fetchResultsAndSettle = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setFetchingResults(true);
    setSettling(false);
    setError(null);
    setResultMsg(null);
    try {
      // Step 1: fetch results from API-Sports
      const resRes = await fetch(`${getApiUrl()}/fixtures/sync/results`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await resRes.json().catch(() => ({}));
      if (!resRes.ok) {
        setError(getApiErrorMessage(resData, 'Failed to fetch results. Check API_SPORTS_KEY.'));
        return;
      }
      setFetchingResults(false);
      setSettling(true);

      // Step 2: run settlement on the freshly updated fixtures
      const settleRes = await fetch(`${getApiUrl()}/admin/settlement/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const settleData = await settleRes.json().catch(() => ({}));
      if (settleRes.ok) {
        setResultMsg({
          updated: (resData as { updated?: number })?.updated ?? 0,
          settled: (settleData as { ticketsSettled?: number })?.ticketsSettled ?? 0,
        });
        load();
      } else {
        setError(
          getApiErrorMessage(
            settleData,
            'Results fetched but settlement failed. Try "Run Settlement Now" from Dashboard.',
          ),
        );
      }
    } catch {
      setError('Network error during fetch-and-settle.');
    } finally {
      setFetchingResults(false);
      setSettling(false);
    }
  };

  const reconcileSettledCoupons = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setReconciling(true);
    setError(null);
    setReconcileMsg(null);
    try {
      const res = await fetch(`${getApiUrl()}/admin/settlement/reconcile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && typeof data === 'object') {
        const d = data as {
          picksRegraded?: number;
          ticketsOutcomeChanged?: number;
          escrowTicketsAdjusted?: number;
          errors?: unknown;
        };
        setReconcileMsg({
          picksRegraded: d.picksRegraded ?? 0,
          ticketsOutcomeChanged: d.ticketsOutcomeChanged ?? 0,
          escrowTicketsAdjusted: d.escrowTicketsAdjusted ?? 0,
          errors: Array.isArray(d.errors) ? d.errors : [],
        });
        load();
      } else {
        setError(getApiErrorMessage(data, 'Reconcile failed. Ensure you are admin and the backend is up.'));
      }
    } catch {
      setError('Network error during reconcile.');
    } finally {
      setReconciling(false);
    }
  };

  const sync = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch(`${getApiUrl()}/fixtures/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const d = data as { fixtures?: number; leagues?: number } | null;
        setSyncResult(d ? { fixtures: d.fixtures ?? 0, leagues: d.leagues ?? 0 } : null);
        if (d?.fixtures === 0 && d?.leagues === 0) {
          setError('Sync completed but 0 fixtures found. Check API key (Admin → Settings) and enabled leagues.');
        } else {
          setError(null);
        }
        load();
        loadSyncStatus();
      } else {
        setError(getApiErrorMessage(data, 'Sync failed. Add API_SPORTS_KEY in Admin → Settings or backend .env'));
      }
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const syncOdds = async (force = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const params = new URLSearchParams();
      if (force) params.set('force', 'true');
      const url = `${getApiUrl()}/fixtures/sync/odds${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        load();
        loadDiagnostic();
        loadSyncStatus();
        setError(null);
      } else {
        setError(getApiErrorMessage(data, 'Odds sync failed. Check API key and API-Football status.'));
      }
    } catch {
      setError('Odds sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 w-full min-w-0 max-w-full overflow-x-hidden">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-main min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Fixtures</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upcoming matches from API-Sports. Sync and manage fixtures for your platform.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Showing page <strong className="text-gray-900 dark:text-white">{page}</strong> of <strong className="text-gray-900 dark:text-white">{totalPages}</strong> · <strong className="text-gray-900 dark:text-white">{allFixtures.length}</strong> fixture{allFixtures.length !== 1 ? 's' : ''} total for next {LOOKAHEAD_HOURS} hours
            {syncResult && syncResult.fixtures > 0 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                (Last sync: {syncResult.fixtures} fixtures{syncResult.leagues > 0 ? `, ${syncResult.leagues} leagues` : ''}
                {syncResult.oddsDueMissing != null || syncResult.oddsDueStale != null
                  ? `; odds due missing=${syncResult.oddsDueMissing ?? 0}, stale=${syncResult.oddsDueStale ?? 0}`
                  : ''})
              </span>
            )}
            {enabledLeaguesCount != null && (
              <span className="ml-2 text-gray-500 dark:text-gray-400">· {enabledLeaguesCount} leagues enabled</span>
            )}
          </p>

          <div className="mt-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Odds Sync Health</h2>
            {!oddsHealth ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">No odds sync status yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Status</p>
                  <p className="font-semibold text-gray-900 dark:text-white uppercase">{oddsHealth.status}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Last synced fixtures</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{oddsHealth.lastSyncCount}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Due missing</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{oddsHealth.dueMissing}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Due stale</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{oddsHealth.dueStale}</p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-gray-500 dark:text-gray-400">Last run</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {oddsHealth.lastSyncAt ? new Date(oddsHealth.lastSyncAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Leagues & coverage — ensure enough leagues so you get all fixtures */}
          <div className="mt-6 p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Leagues &amp; coverage</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Sync only keeps fixtures from <strong>enabled</strong> leagues. If you see fewer fixtures than expected (e.g. weekend), enable more leagues below, then run Sync.
            </p>
            {diagnosticLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading diagnostic…</p>
            )}
            {diagnostic && diagnostic.ok && !diagnosticLoading && (
              <div className="grid gap-3 text-sm mb-4">
                <div className="flex flex-wrap gap-4">
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>API total:</strong> {diagnostic.apiTotalFixtures} fixtures from {diagnostic.apiLeagues.length} leagues
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>API with odds:</strong> {diagnostic.apiFixturesWithOdds} ({diagnostic.apiCoveragePercent}% coverage)
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>Enabled-league API with odds:</strong> {diagnostic.apiEnabledLeagueFixturesWithOdds} ({diagnostic.apiEnabledCoveragePercent}%)
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>You have:</strong> {diagnostic.enabledCount} leagues enabled → <strong>{diagnostic.dbUpcomingCount}</strong> fixtures in DB
                  </span>
                  {diagnostic.dbWithoutOddsCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      <strong>{diagnostic.dbWithoutOddsCount}</strong> fixtures without odds
                    </span>
                  )}
                </div>
                {diagnostic.inApiNotEnabled.length > 0 && (
                  <p className="text-amber-700 dark:text-amber-300">
                    <strong>{diagnostic.inApiNotEnabled.length} leagues</strong> in the API are not enabled (their fixtures are dropped). Click &quot;Enable all leagues from API&quot; to include them.
                  </p>
                )}
              </div>
            )}
            {diagnostic && !diagnostic.ok && diagnostic.message && !diagnosticLoading && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{diagnostic.message}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={enableAllLeaguesFromApi}
                disabled={enablingLeagues || syncing}
                className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md"
              >
                {enablingLeagues ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enabling…
                  </span>
                ) : (
                  'Enable all leagues from API'
                )}
              </button>
              <button
                type="button"
                onClick={() => { loadDiagnostic(); loadEnabledLeaguesCount(); }}
                disabled={diagnosticLoading}
                className="px-5 py-2.5 rounded-xl font-semibold bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 transition-all"
              >
                Refresh diagnostic
              </button>
            </div>
            {enableLeaguesResult && enableLeaguesResult.ok && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-200">
                Added <strong>{enableLeaguesResult.added}</strong> new leagues ({enableLeaguesResult.alreadyEnabled} already enabled). Run &quot;Sync Fixtures&quot; below to pull all fixtures and odds.
              </div>
            )}
          </div>

          {/* Live scores stream observability */}
          <div className="mt-4 p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live stream metrics</h2>
              <button
                type="button"
                onClick={loadStreamMetrics}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Refresh
              </button>
            </div>
            {streamHealth && streamHealth.alerts.length > 0 && (
              <div
                className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                  streamHealth.critical
                    ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
                    : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200'
                }`}
              >
                <p className="font-semibold mb-1">Stream alerts</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {streamHealth.alerts.map((a) => (
                    <li key={a.text}>{a.text}</li>
                  ))}
                </ul>
              </div>
            )}
            {!streamMetrics ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Metrics unavailable right now.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3">
                  <p className="text-gray-500 dark:text-gray-400">Active connections</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{streamMetrics.activeConnections}</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3">
                  <p className="text-gray-500 dark:text-gray-400">Total connections</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{streamMetrics.totalConnections}</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3">
                  <p className="text-gray-500 dark:text-gray-400">Events/min</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{streamMetrics.avgEventsPerMinute}</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3">
                  <p className="text-gray-500 dark:text-gray-400">Avg payload/event</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{streamMetrics.avgPayloadBytesPerEvent} B</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 col-span-full sm:col-span-2 md:col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">Total payload</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{streamMetrics.totalPayloadBytes.toLocaleString()} B</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 col-span-full sm:col-span-2 md:col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">Last event</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {streamMetrics.lastEventAt ? new Date(streamMetrics.lastEventAt).toLocaleString() : 'No events yet'}
                  </p>
                  {streamHealth?.lastEventAgeSec != null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Age: {streamHealth.lastEventAgeSec}s
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Alert thresholds</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Stored in the database for all admins. Apply migration <code className="text-[10px]">074_stream_alert_thresholds</code> on production before saving.
              </p>
              {streamThresholdError && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">{streamThresholdError}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Warn active
                  <input
                    type="number"
                    min={1}
                    value={streamThresholds.warnActiveConnections}
                    onChange={(e) => setStreamThresholds((s) => ({ ...s, warnActiveConnections: Math.max(1, Number(e.target.value) || 1) }))}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Critical active
                  <input
                    type="number"
                    min={1}
                    value={streamThresholds.criticalActiveConnections}
                    onChange={(e) => setStreamThresholds((s) => ({ ...s, criticalActiveConnections: Math.max(1, Number(e.target.value) || 1) }))}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Warn events/min
                  <input
                    type="number"
                    min={1}
                    value={streamThresholds.warnEventsPerMinute}
                    onChange={(e) => setStreamThresholds((s) => ({ ...s, warnEventsPerMinute: Math.max(1, Number(e.target.value) || 1) }))}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Warn payload (B)
                  <input
                    type="number"
                    min={1}
                    value={streamThresholds.warnAvgPayloadBytes}
                    onChange={(e) => setStreamThresholds((s) => ({ ...s, warnAvgPayloadBytes: Math.max(1, Number(e.target.value) || 1) }))}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Warn stale (s)
                  <input
                    type="number"
                    min={1}
                    value={streamThresholds.warnStaleSeconds}
                    onChange={(e) => setStreamThresholds((s) => ({ ...s, warnStaleSeconds: Math.max(1, Number(e.target.value) || 1) }))}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Critical stale (s)
                  <input
                    type="number"
                    min={1}
                    value={streamThresholds.criticalStaleSeconds}
                    onChange={(e) => setStreamThresholds((s) => ({ ...s, criticalStaleSeconds: Math.max(1, Number(e.target.value) || 1) }))}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => saveStreamThresholdsToServer(streamThresholds)}
                  disabled={savingStreamThresholds}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {savingStreamThresholds ? 'Saving…' : 'Save thresholds'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStreamThresholds(DEFAULT_STREAM_THRESHOLDS);
                    void saveStreamThresholdsToServer(DEFAULT_STREAM_THRESHOLDS);
                  }}
                  disabled={savingStreamThresholds}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Reset defaults
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-gray-600 dark:text-gray-400 text-sm font-medium">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedCompetition('');
              }}
              className="w-full sm:w-auto sm:min-w-[160px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All countries</option>
              <option value="World">World</option>
              {(filterOptions.countries || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label className="text-gray-600 dark:text-gray-400 text-sm font-medium">Competition</label>
            <select
              value={selectedCompetition}
              onChange={(e) => setSelectedCompetition(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[200px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All competitions</option>
              {competitionOptions.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.country ? `${t.name} (${t.country})` : t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Upcoming Fixtures */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Upcoming Fixtures</p>
          <div className="flex flex-wrap gap-3">
            <button type="button"
              onClick={sync}
              disabled={syncing || fetchingResults || settling || reconciling}
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all shadow-md"
            >
              {syncing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </span>
              ) : '⚽ Sync Fixtures'}
            </button>
            <button type="button"
              onClick={() => syncOdds(false)}
              disabled={syncing || fetchingResults || settling || reconciling}
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-md"
            >
              Sync Odds (new only)
            </button>
            <button type="button"
              onClick={() => syncOdds(true)}
              disabled={syncing || fetchingResults || settling || reconciling}
              title="Re-fetch odds for all upcoming fixtures (which markets are stored depends on DB market_config: BTTS, DNB, first-half, handicaps, etc.)"
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition-all shadow-md"
            >
              Force Refresh Odds
            </button>
            <button type="button"
              onClick={() => syncOdds(true)}
              disabled={syncing || fetchingResults || settling || reconciling}
              title="Re-fetch odds for all upcoming fixtures in the configured 72-hour window."
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-cyan-600 to-cyan-700 text-white hover:from-cyan-700 hover:to-cyan-800 disabled:opacity-50 transition-all shadow-md"
            >
              Sync odds (backfill all)
            </button>
          </div>
        </div>

        {/* Results & Settlement */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Results & Settlement</p>
          <div className="flex flex-wrap gap-3 items-start">
            <button type="button"
              onClick={fetchResults}
              disabled={syncing || fetchingResults || settling || reconciling}
              title="Fetch scores for finished matches from API-Sports (same as the cron, but manual)"
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all shadow-md"
            >
              {fetchingResults && !settling ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching Results…
                </span>
              ) : '📥 Fetch Football Results'}
            </button>
            <button type="button"
              onClick={fetchResultsAndSettle}
              disabled={syncing || fetchingResults || settling || reconciling}
              title="Fetch results from API-Sports, then immediately settle pending coupons. Use when matches have finished but coupons are still pending."
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-700 hover:to-violet-800 disabled:opacity-50 transition-all shadow-md"
            >
              {fetchingResults || settling ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M 4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {settling ? 'Settling coupons…' : 'Fetching results…'}
                </span>
              ) : '⚡ Fetch Results & Settle Coupons'}
            </button>
            <button
              type="button"
              onClick={reconcileSettledCoupons}
              disabled={syncing || fetchingResults || settling || reconciling}
              title="After scores are corrected in the DB, re-grade settled picks and fix escrow if the coupon should have won instead of lost (or vice versa). Does not fetch from the API."
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-700 hover:to-rose-800 disabled:opacity-50 transition-all shadow-md"
            >
              {reconciling ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Reconciling…
                </span>
              ) : (
                '↩ Reconcile settled coupons'
              )}
            </button>
            <p className="w-full text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Use when matches have finished but coupons are still &quot;pending&quot;. Scheduled sync runs about every minute — this forces it immediately.
              {' '}
              <strong className="text-gray-600 dark:text-gray-300">Reconcile</strong> is for when scores were wrong at settlement (e.g. API quota): fetch correct scores first, then run it — it updates already-settled coupons and wallets if the outcome flips.
            </p>
          </div>
        </div>

        {reconcileMsg && !error && (
          <div className="mb-6 bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 rounded-lg p-4 text-rose-900 dark:text-rose-100 shadow-md">
            <div className="font-medium space-y-1">
              <p>
                Reconcile: <strong>{reconcileMsg.picksRegraded}</strong> pick{reconcileMsg.picksRegraded !== 1 ? 's' : ''} regraded,{' '}
                <strong>{reconcileMsg.ticketsOutcomeChanged}</strong> coupon{reconcileMsg.ticketsOutcomeChanged !== 1 ? 's' : ''} outcome updated,{' '}
                <strong>{reconcileMsg.escrowTicketsAdjusted}</strong> escrow adjustment{reconcileMsg.escrowTicketsAdjusted !== 1 ? 's' : ''}.
              </p>
              {reconcileMsg.errors.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-rose-800 dark:text-rose-200">
                  {reconcileMsg.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {resultMsg && !error && (
          <div className="mb-6 bg-violet-50 dark:bg-violet-900/20 border-l-4 border-violet-500 rounded-lg p-4 text-violet-800 dark:text-violet-200 shadow-md">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">
                {resultMsg.updated} fixture{resultMsg.updated !== 1 ? 's' : ''} updated with results.
                {resultMsg.settled !== undefined && (
                  <> {resultMsg.settled} coupon{resultMsg.settled !== 1 ? 's' : ''} settled.</>
                )}
                {resultMsg.updated === 0 && (
                  <> No unfinished past fixtures found — all may already be up to date, or no matches ended recently.</>
                )}
              </span>
            </div>
          </div>
        )}
        {syncResult && syncResult.fixtures > 0 && !error && (
          <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 rounded-lg p-4 text-emerald-800 dark:text-emerald-200 shadow-md">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">
                Synced {syncResult.fixtures} fixtures{syncResult.leagues > 0 ? ` across ${syncResult.leagues} leagues` : ''}. List refreshed.
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-lg p-4 text-amber-800 dark:text-amber-200 shadow-md">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading fixtures...</p>
            </div>
          </div>
        )}
        {!loading && fixtures.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No fixtures for next {LOOKAHEAD_HOURS} hours</h3>
            <p className="text-gray-600 dark:text-gray-400">Click Sync to fetch fixtures from API-Sports.</p>
          </div>
        )}
        {!loading && fixtures.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left order-1">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto order-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNextPage || page >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Match</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">League</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">FT</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">HT</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {fixtures.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">{f.homeTeamName} vs {f.awayTeamName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{f.leagueName || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                        {new Date(f.matchDate).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {f.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm tabular-nums text-gray-700 dark:text-gray-300">
                        {scoreLine(f.homeScore, f.awayScore)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm tabular-nums text-gray-600 dark:text-gray-400">
                        {scoreLine(f.htHomeScore, f.htAwayScore)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
