'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

interface DbFixture {
  id: number;
  homeTeamName: string;
  awayTeamName: string;
  leagueName: string | null;
  matchDate: string;
  status: string;
  odds?: { marketName: string; marketValue: string; odds: number }[];
}

interface FilterOptions {
  countries: string[];
  tournaments: Array<{ id: number; name: string; country: string | null; isInternational?: boolean }>;
  leagues: Array<{ id: number; name: string; country: string | null }>;
}

export default function AdminFixturesPage() {
  const router = useRouter();
  const [fixtures, setFixtures] = useState<DbFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ fixtures: number; leagues: number } | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ countries: [], tournaments: [], leagues: [] });
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCompetition, setSelectedCompetition] = useState('');

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

  const load = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('days', '7');
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedCompetition) params.set('league', selectedCompetition);
    fetch(`${getApiUrl()}/fixtures?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFixtures(Array.isArray(data) ? data : []))
      .catch(() => setFixtures([]))
      .finally(() => setLoading(false));
  };

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/fixtures/sync/status`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((statuses) => {
        const fixturesStatus = Array.isArray(statuses) ? statuses.find((s: { syncType: string }) => s.syncType === 'fixtures') : null;
        if (fixturesStatus?.lastSyncCount != null && fixturesStatus?.lastSyncAt) {
          setSyncResult({
            fixtures: fixturesStatus.lastSyncCount,
            leagues: fixturesStatus.lastSyncLeagues ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Reset country/competition if no longer in filtered list (e.g. no fixtures in next 7 days)
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
  }, [router, selectedCountry, selectedCompetition]);

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
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (res.ok) {
        setSyncResult(data ? { fixtures: data.fixtures ?? 0, leagues: data.leagues ?? 0 } : null);
        if (data?.fixtures === 0 && data?.leagues === 0) {
          setError('Sync completed but 0 fixtures found. Check API key (Admin → Settings) and enabled leagues.');
        } else {
          setError(null);
        }
        load();
      } else {
        setError('Sync failed. Add API_SPORTS_KEY in Admin → Settings or backend .env');
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
      const url = `${getApiUrl()}/fixtures/sync/odds${force ? '?force=true' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (res.ok) {
        load();
        setError(null);
      } else {
        setError('Odds sync failed. Check API key and API-Football status.');
      }
    } catch {
      setError('Odds sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Fixtures</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upcoming matches from API-Sports. Sync and manage fixtures for your platform.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Showing <strong className="text-gray-900 dark:text-white">{fixtures.length}</strong> upcoming fixture{fixtures.length !== 1 ? 's' : ''} for next 7 days
            {syncResult && syncResult.fixtures > 0 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                (Last sync: {syncResult.fixtures} fixtures{syncResult.leagues > 0 ? `, ${syncResult.leagues} leagues` : ''})
              </span>
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-gray-600 dark:text-gray-400 text-sm font-medium">Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedCompetition('');
              }}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm min-w-[160px]"
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
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm min-w-[200px]"
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

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={sync}
            disabled={syncing}
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {syncing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </span>
            ) : (
              'Sync Fixtures'
            )}
          </button>
          <button
            onClick={() => syncOdds(false)}
            disabled={syncing}
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            Sync Odds (new only)
          </button>
          <button
            onClick={() => syncOdds(true)}
            disabled={syncing}
            title="Re-fetch odds for all upcoming fixtures (BTTS, Correct Score, etc.)"
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            Force Refresh Odds
          </button>
        </div>

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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No fixtures for next 7 days</h3>
            <p className="text-gray-600 dark:text-gray-400">Click Sync to fetch fixtures from API-Sports.</p>
          </div>
        )}
        {!loading && fixtures.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Match</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">League</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
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
