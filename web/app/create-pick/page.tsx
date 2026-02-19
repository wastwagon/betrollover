'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { formatError } from '@/utils/errorMessages';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { getApiUrl } from '@/lib/site-config';

interface FixtureOdd {
  id: number;
  marketName: string;
  marketValue: string;
  odds: number;
}

interface Fixture {
  id: number;
  homeTeamName: string;
  awayTeamName: string;
  leagueName: string | null;
  matchDate: string;
  status: string;
  odds?: FixtureOdd[];
  oddsError?: string; // Error message when odds can't be loaded
  league?: {
    id: number;
    name: string;
    country: string | null;
  } | null;
}

interface Selection {
  fixtureId: number;
  matchDescription: string;
  prediction: string;
  odds: number;
  matchDate: string;
}

// Group odds by market type for better display
function groupOddsByMarket(odds: FixtureOdd[]): Record<string, FixtureOdd[]> {
  const grouped: Record<string, FixtureOdd[]> = {};
  for (const odd of odds) {
    if (!grouped[odd.marketName]) {
      grouped[odd.marketName] = [];
    }
    grouped[odd.marketName].push(odd);
  }
  return grouped;
}

// Market display order (Tier 1 first, then Tier 2)
const MARKET_ORDER = [
  'Match Winner',
  'Goals Over/Under',
  'Both Teams To Score',
  'Double Chance',
  'Half-Time/Full-Time',
  'Correct Score',
];

/** Common Correct Score options only (excludes rare scores like 10:0, 9:9) */
const CORRECT_SCORE_ALLOWED = new Set([
  '0-0', '0:0', '1-0', '1:0', '0-1', '0:1', '1-1', '1:1',
  '2-0', '2:0', '0-2', '0:2', '2-1', '2:1', '1-2', '1:2', '2-2', '2:2',
  '3-0', '3:0', '0-3', '0:3', '3-1', '3:1', '1-3', '1:3', '3-2', '3:2', '2-3', '2:3',
]);

function filterCorrectScoreOdds(odds: FixtureOdd[]): FixtureOdd[] {
  return odds.filter((o) => {
    const val = (o.marketValue || '').trim().replace(/:/g, '-');
    return CORRECT_SCORE_ALLOWED.has(val);
  });
}

export default function CreatePickPage() {
  const router = useRouter();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [isMarketplace, setIsMarketplace] = useState(true);
  const [placement, setPlacement] = useState<'marketplace' | 'subscription' | 'both'>('marketplace');
  const [subscriptionPackageIds, setSubscriptionPackageIds] = useState<number[]>([]);
  const [myPackages, setMyPackages] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();
  // Removed step state - slip widget is always visible on the right
  const [loadingOdds, setLoadingOdds] = useState<Set<number>>(new Set());
  const [collapsedOdds, setCollapsedOdds] = useState<Set<number>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [slipSheetOpen, setSlipSheetOpen] = useState(false);
  const debouncedTeamSearch = useDebounce(teamSearch, 500); // Debounce team search by 500ms
  const [filterOptions, setFilterOptions] = useState<{
    countries: string[];
    tournaments: Array<{ id: number; name: string; country: string | null; apiId?: number; isInternational?: boolean }>;
    leagues: Array<{
      id: number;
      name: string;
      country: string | null;
      category?: string | null;
      bookmakerTier?: string | null;
    }>;
  }>({ countries: [], tournaments: [], leagues: [] });

  // Competition dropdown: filter by country
  const competitionOptions = useMemo(() => {
    let leagues = filterOptions.leagues || [];
    if (selectedCountry && selectedCountry.trim() !== '') {
      if (selectedCountry.trim().toLowerCase() === 'world') {
        leagues = leagues.filter(
          (l) => !(l.country || '').trim() || (l.country || '').trim().toLowerCase() === 'world'
        );
      } else {
        leagues = leagues.filter(
          (l) => (l.country || '').trim().toLowerCase() === selectedCountry.trim().toLowerCase()
        );
      }
    }
    return leagues;
  }, [filterOptions.leagues, selectedCountry]);
  
  // Filter out fixtures that have started or are live
  const availableFixtures = useMemo(() => {
    const now = new Date();
    return fixtures.filter((f) => {
      // Only show fixtures with status 'NS' (Not Started) or 'TBD' (To Be Determined)
      const isValidStatus = f.status === 'NS' || f.status === 'TBD';
      
      // Only show fixtures that haven't started yet (matchDate >= now)
      const isFutureFixture = new Date(f.matchDate) >= now;
      
      return isValidStatus && isFutureFixture;
    });
  }, [fixtures]);

  // Periodic refresh to update fixture statuses (every 30 seconds)
  // Only refresh when page is visible and user is active
  useEffect(() => {
    if (loading) return;
    
    // Don't refresh if page is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        return; // Pause refresh when tab is hidden
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const interval = setInterval(() => {
      // Skip refresh if page is hidden
      if (document.hidden) return;
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams();
      params.append('days', '7');
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedLeague) params.append('league', selectedLeague);
      if (debouncedTeamSearch.trim()) params.append('team', debouncedTeamSearch.trim());

      fetch(`${getApiUrl()}/fixtures?${params.toString()}`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setFixtures((prev) => {
              const byId = new Map(prev.map((f) => [f.id, f]));
              return data.map((f) => {
                const existing = byId.get(f.id);
                if (existing?.odds && existing.odds.length > 0) {
                  return { ...f, odds: existing.odds };
                }
                return f;
              });
            });
          }
        })
        .catch(() => {
          // Silently fail - don't disrupt user experience
        });
    }, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedCountry, selectedLeague, debouncedTeamSearch, loading]);

  // Fetch filter options on mount (countries = only those with fixtures in next 7 days)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const headers = { Authorization: `Bearer ${token}` };
    (async () => {
      try {
        const res = await fetch(`${getApiUrl()}/fixtures/filters`, { headers });
        if (res.ok) {
          const data = await res.json();
          setFilterOptions({
            countries: data.countries ?? [],
            tournaments: data.tournaments ?? [],
            leagues: data.leagues ?? [],
          });
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    })();
  }, []);

  // Reset country/league if no longer in filtered list (e.g. no fixtures in next 7 days)
  useEffect(() => {
    const countries = filterOptions.countries || [];
    const leagues = filterOptions.leagues || [];
    if (selectedCountry && (countries.length === 0 || !countries.includes(selectedCountry))) {
      setSelectedCountry('');
      setSelectedLeague('');
    } else if (selectedLeague && (leagues.length === 0 || !leagues.some((l) => String(l.id) === selectedLeague))) {
      setSelectedLeague('');
    }
  }, [filterOptions.countries, filterOptions.leagues, selectedCountry, selectedLeague]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    (async () => {
      const userRes = await fetch(`${getApiUrl()}/users/me`, { headers });
      const u = userRes.ok ? await userRes.json() : null;
      if (!u) {
        router.replace('/dashboard');
        return;
      }
      // All users can create picks now - no role check needed
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('days', '7'); // Match fixture sync window (7 days)
        if (selectedCountry) params.append('country', selectedCountry);
        if (selectedLeague) params.append('league', selectedLeague);
        if (debouncedTeamSearch.trim()) params.append('team', debouncedTeamSearch.trim());

        const fixRes = await fetch(`${getApiUrl()}/fixtures?${params.toString()}`, { headers });
        if (!fixRes.ok) {
          const errorText = await fixRes.text().catch(() => '');
          const errorMessage = formatError(new Error(`Failed to load fixtures: ${fixRes.status}`));
          setError(errorMessage);
          showError(new Error(`Failed to load fixtures: ${fixRes.status}`));
          setFixtures([]);
          return;
        }
        const data = await fixRes.json();
        console.log('Fixtures loaded:', Array.isArray(data) ? data.length : 0);
        setFixtures(Array.isArray(data) ? data : []);
        if (!Array.isArray(data) || data.length === 0) {
          // Don't show error, just empty state - user can change filters
          setError(null);
        }
      } catch (err: any) {
        const errorMessage = formatError(err);
        setError(errorMessage);
        showError(err);
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [router, selectedCountry, selectedLeague, debouncedTeamSearch]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (!user?.id) return;
        return fetch(`${getApiUrl()}/subscriptions/packages?tipsterId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((r) => (r?.ok ? r.json() : []))
      .then((arr) => setMyPackages(Array.isArray(arr) ? arr.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })) : []))
      .catch(() => {});
  }, []);

  const loadFixtureOdds = async (f: Fixture) => {
    // If odds already loaded, skip
    if (f.odds && f.odds.length > 0) return;

    // If already loading, skip
    if (loadingOdds.has(f.id)) return;

    setLoadingOdds((prev) => new Set(prev).add(f.id));
    const token = localStorage.getItem('token');
    
    try {
      // Try to load odds from fixture endpoint (auto-loads if missing)
      const res = await fetch(`${getApiUrl()}/fixtures/${f.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        console.error(`Failed to fetch fixture ${f.id}:`, res.status, await res.text().catch(() => ''));
        return;
      }
      
      const data = await res.json();
      console.log(`Fixture ${f.id} data:`, { hasOdds: !!data.odds, oddsLength: data.odds?.length || 0 });
      
      if (data.odds && data.odds.length > 0) {
        // Update fixture with odds
        setFixtures((prev) =>
          prev.map((fix) => (fix.id === f.id ? { ...fix, odds: data.odds } : fix))
        );
      } else {
        // If no odds, try to sync them
        console.log(`No odds found for fixture ${f.id}, attempting to sync...`);
        const syncRes = await fetch(`${getApiUrl()}/fixtures/${f.id}/odds`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          console.log(`Sync response for fixture ${f.id}:`, { success: syncData.success, oddsLength: syncData.odds?.length || 0 });
          
          if (syncData.odds && syncData.odds.length > 0) {
            setFixtures((prev) =>
              prev.map((fix) => (fix.id === f.id ? { ...fix, odds: syncData.odds } : fix))
            );
          } else {
            // Reload fixture after sync
            const reloadRes = await fetch(`${getApiUrl()}/fixtures/${f.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (reloadRes.ok) {
              const reloadData = await reloadRes.json();
              if (reloadData.odds && reloadData.odds.length > 0) {
                setFixtures((prev) =>
                  prev.map((fix) => (fix.id === f.id ? { ...fix, odds: reloadData.odds } : fix))
                );
              } else {
                // No odds available - mark fixture with error message
                setFixtures((prev) =>
                  prev.map((fix) => 
                    fix.id === f.id 
                      ? { ...fix, oddsError: 'Odds not available from bookmakers yet. Please try again later or select another fixture.' }
                      : fix
                  )
                );
              }
            }
          }
        } else {
          const errorText = await syncRes.text().catch(() => '');
          console.error(`Failed to sync odds for fixture ${f.id}:`, syncRes.status, errorText);
          // Mark fixture with error message
          setFixtures((prev) =>
            prev.map((fix) => 
              fix.id === f.id 
                ? { ...fix, oddsError: 'Unable to fetch odds. The match may be too far in the future or odds are not yet available from bookmakers.' }
                : fix
            )
          );
        }
      }
    } catch (error) {
      showError(error);
      setFixtures((prev) =>
        prev.map((fix) => 
          fix.id === f.id 
            ? { ...fix, oddsError: formatError(error) }
            : fix
        )
      );
    } finally {
      setLoadingOdds((prev) => {
        const next = new Set(prev);
        next.delete(f.id);
        return next;
      });
    }
  };

  const addSelection = (f: Fixture, odd: FixtureOdd) => {
    const matchDesc = `${f.homeTeamName} vs ${f.awayTeamName}`;
    const pred = `${odd.marketName}: ${odd.marketValue}`;
    if (selections.some((s) => s.fixtureId === f.id && s.prediction === pred)) return;
    setSelections((prev) => [
      ...prev,
      {
        fixtureId: f.id,
        matchDescription: matchDesc,
        prediction: pred,
        odds: Number(odd.odds),
        matchDate: f.matchDate,
      },
    ]);
  };

  const removeSelection = (idx: number) => {
    setSelections((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setSlipSheetOpen(false);
      return next;
    });
  };

  const totalOdds = selections.reduce((a, s) => a * s.odds, 1);

  const submit = async () => {
    if (selections.length === 0) {
      setError('Add at least one selection');
      return;
    }
    if (!title.trim()) {
      setError('Enter a title');
      return;
    }
    setError(null);
    setSubmitting(true);
    const token = localStorage.getItem('token');
    const res = await fetch(`${getApiUrl()}/accumulators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        price: Number(price) || 0,
        isMarketplace,
        placement: placement,
        subscriptionPackageIds: (placement === 'subscription' || placement === 'both') ? subscriptionPackageIds : undefined,
        selections: selections.map((s) => ({
          fixtureId: s.fixtureId,
          matchDescription: s.matchDescription,
          prediction: s.prediction,
          odds: s.odds,
          matchDate: s.matchDate,
        })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMessage = formatError(new Error(err.message || 'Failed to create pick'));
      setError(errorMessage);
      showError(new Error(err.message || 'Failed to create pick'));
      return;
    }
    showSuccess('Pick created successfully!');
    router.push('/my-picks');
  };

  // Format market value for display
  const formatMarketValue = (marketName: string, value: string): string => {
    if (marketName === 'Match Winner') {
      if (value === 'Home') return '1';
      if (value === 'Draw') return 'X';
      if (value === 'Away') return '2';
    }
    if (marketName === 'Both Teams To Score') {
      return value === 'Yes' ? 'BTTS Yes' : 'BTTS No';
    }
    if (marketName === 'Half-Time/Full-Time') {
      // e.g. "Home/Home" -> "1/1", "Draw/Draw" -> "X/X", "Away/Away" -> "2/2"
      return value
        .replace(/\bHome\b/g, '1')
        .replace(/\bDraw\b/g, 'X')
        .replace(/\bAway\b/g, '2');
    }
    return value;
  };

  // Format fixture date and time for display
  const formatFixtureDateTime = (matchDate: string): string => {
    const date = new Date(matchDate);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Get day with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const day = date.getDate();
    const getOrdinalSuffix = (n: number): string => {
      const j = n % 10;
      const k = n % 100;
      if (j === 1 && k !== 11) return 'st';
      if (j === 2 && k !== 12) return 'nd';
      if (j === 3 && k !== 13) return 'rd';
      return 'th';
    };
    
    // Format as "15th February 2026, 11:30 AM"
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const dayWithOrdinal = `${day}${getOrdinalSuffix(day)}`;
    
    return `${dayWithOrdinal} ${month} ${year}, ${time}`;
  };

  return (
    <DashboardShell>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label="Create Pick"
            title="Create Pick"
            tagline="Build your accumulator from upcoming matches and share or sell"
          />
          {selections.length > 0 && (
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={() => setSlipSheetOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] text-sm font-semibold shadow-sm hover:bg-teal-100 active:scale-[0.98] transition-all touch-manipulation min-h-[44px]"
                aria-label="View slip"
              >
                <span className="text-base">📝</span>
                <span>{selections.length} selection{selections.length !== 1 ? 's' : ''}</span>
                <span className="text-[var(--primary)] font-bold ml-0.5">@ {totalOdds.toFixed(2)}</span>
              </button>
            </div>
          )}

          {/* Two-column layout: Fixtures on left, Slip widget on right */}
          <div className="flex flex-col lg:flex-row gap-4 pb-6">
          {/* Left Column: Fixtures */}
          <div className="flex-1 min-w-0">
            <div className="space-y-4">
            {/* Team Search */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for a team (e.g., Manchester United, Barcelona)..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {teamSearch && (
                  <button
                    onClick={() => setTeamSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    title="Clear search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-[var(--text-muted)] text-sm">
                  Click on a match to load odds, then tap any market button to add to your slip.
                </p>
                <p className="text-[var(--text)] text-sm font-medium">
                  <strong>{availableFixtures.length}</strong> available fixture{availableFixtures.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-[var(--text)] whitespace-nowrap">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setSelectedLeague('');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all min-w-[140px]"
                  >
                    <option value="">All countries</option>
                    {filterOptions.countries.map((country) => (
                      <option key={country} value={country}>
                        {country === 'World' ? 'World (international)' : country}
                      </option>
                    ))}
                  </select>
                </div>
                {filterOptions.leagues.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-[var(--text)] whitespace-nowrap">Competition</label>
                    <select
                      value={competitionOptions.some((l) => String(l.id) === selectedLeague) ? selectedLeague : ''}
                      onChange={(e) => setSelectedLeague(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all min-w-[200px]"
                      title={selectedCountry ? (selectedCountry === 'World' ? 'International competitions only' : `Leagues in ${selectedCountry}`) : 'Filter by league'}
                    >
                      <option value="">All competitions</option>
                      {competitionOptions.map((l) => (
                        <option key={l.id} value={String(l.id)}>
                          {l.country ? `${l.name} (${l.country})` : l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {(selectedCountry || selectedLeague || teamSearch) && (
                  <button
                    onClick={() => {
                      setSelectedCountry('');
                      setSelectedLeague('');
                      setTeamSearch('');
                    }}
                    title="Clear all filters"
                    className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            {loading && <LoadingSkeleton count={4} />}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">⚠️</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Error Loading Fixtures</h4>
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                    <button
                      onClick={() => {
                        setError(null);
                        // Retry loading
                        const token = localStorage.getItem('token');
                        if (token) {
                          const headers = { Authorization: `Bearer ${token}` };
                          const params = new URLSearchParams();
                          params.append('days', '7');
                          if (selectedCountry) params.append('country', selectedCountry);
                          if (selectedLeague) params.append('league', selectedLeague);
                          if (debouncedTeamSearch.trim()) params.append('team', debouncedTeamSearch.trim());
                          setLoading(true);
                          fetch(`${getApiUrl()}/fixtures?${params.toString()}`, { headers })
                            .then((r) => (r.ok ? r.json() : []))
                            .then((data) => {
                              if (Array.isArray(data)) {
                                setFixtures(data);
                                setError(null);
                              }
                            })
                            .catch((err) => {
                              setError(formatError(err));
                              showError(err);
                            })
                            .finally(() => setLoading(false));
                        }
                      }}
                      className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}
            {!loading && !error && availableFixtures.length === 0 && fixtures.length === 0 && (
              <div className="bg-[var(--card)] rounded-card border border-[var(--border)] p-6">
                <EmptyState
                  title={
                    selectedCountry || selectedLeague || debouncedTeamSearch
                      ? "No fixtures match your filters"
                      : "No upcoming fixtures"
                  }
                  description={
                    selectedCountry || selectedLeague || debouncedTeamSearch
                      ? "Try adjusting your filters. Fixtures sync automatically daily for the next 7 days."
                      : "Fixtures sync automatically daily at 6 AM for the next 7 days."
                  }
                  actionLabel={selectedCountry || selectedLeague || debouncedTeamSearch ? "Clear Filters" : "Go to Dashboard"}
                  actionHref="/dashboard"
                  onActionClick={
                    selectedCountry || selectedLeague || debouncedTeamSearch
                      ? () => {
                          setSelectedCountry('');
                          setSelectedLeague('');
                          setTeamSearch('');
                        }
                      : undefined
                  }
                  icon="⚽"
                />
              </div>
            )}
            {!loading && !error && availableFixtures.length === 0 && fixtures.length > 0 && (
              <div className="bg-[var(--card)] rounded-card border border-[var(--border)] p-6">
                <EmptyState
                  title="All fixtures have started"
                  description="All shown fixtures have already started or are live. Check back tomorrow for new matches."
                  actionLabel="Select Tomorrow"
                  actionHref="#"
                  icon="⏰"
                />
              </div>
            )}
            {!loading && availableFixtures.length > 0 && (
              <div className="space-y-4">
                {availableFixtures.map((f) => {
                  const groupedOdds = f.odds ? groupOddsByMarket(f.odds) : {};
                  const isLoading = loadingOdds.has(f.id);
                  const hasOdds = f.odds && f.odds.length > 0;
                  const isCollapsed = collapsedOdds.has(f.id);
                  const showOdds = hasOdds && !isCollapsed;

                  const toggleCollapsed = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setCollapsedOdds((prev) => {
                      const next = new Set(prev);
                      if (next.has(f.id)) next.delete(f.id);
                      else next.add(f.id);
                      return next;
                    });
                  };

                  return (
                    <div
                      key={f.id}
                      className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] overflow-hidden transition-shadow hover:shadow-card-hover"
                    >
                      {/* Fixture Header */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => !hasOdds && loadFixtureOdds(f)}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div>
                            <span className="font-semibold text-[var(--text)] text-base">
                              {f.homeTeamName} vs {f.awayTeamName}
                            </span>
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                              {f.leagueName || 'League'} • {formatFixtureDateTime(f.matchDate)}
                            </div>
                          </div>
                          {!hasOdds && !f.oddsError && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadFixtureOdds(f);
                              }}
                              disabled={isLoading}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors disabled:opacity-50"
                            >
                              {isLoading ? 'Loading...' : 'Load Odds'}
                            </button>
                          )}
                          {hasOdds && !f.oddsError && (
                            <button
                              onClick={toggleCollapsed}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors"
                            >
                              {isCollapsed ? 'Show Odds' : 'Hide Odds'}
                            </button>
                          )}
                          {f.oddsError && (
                            <div className="px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg max-w-xs">
                              {f.oddsError}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Market Buttons */}
                      {showOdds && (
                        <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
                          {MARKET_ORDER.filter((market) => groupedOdds[market]).map((marketName) => {
                            let marketOdds = groupedOdds[marketName];
                            if (marketName === 'Correct Score') {
                              marketOdds = filterCorrectScoreOdds(marketOdds);
                              if (marketOdds.length === 0) return null;
                            }
                            return (
                              <div key={marketName} className="mt-3 first:mt-3">
                                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
                                  {marketName}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {marketOdds.map((odd) => (
                                    <button
                                      key={odd.id}
                                      onClick={() => addSelection(f, odd)}
                                      className="px-3 py-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium text-sm transition-colors border border-[var(--border)] active:scale-95"
                                    >
                                      <span className="font-semibold">
                                        {formatMarketValue(odd.marketName, odd.marketValue)}
                                      </span>
                                      <span className="ml-1.5 text-[var(--primary)]">
                                        {Number(odd.odds).toFixed(2)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>

          {/* Right Column: Fixed Slip Widget (desktop only) */}
          <div className="hidden lg:block lg:w-96 lg:flex-shrink-0">
            <div className="lg:sticky lg:top-4">
              <div className="bg-gradient-to-br from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent rounded-card shadow-card border-2 border-[var(--primary)]/30 p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                    <span className="text-2xl">📝</span>
                    Bet Slip
                  </h2>
                  {selections.length > 0 && (
                    <span className="px-2.5 py-1 bg-[var(--primary)] text-white rounded-full text-xs font-semibold">
                      {selections.length}
                    </span>
                  )}
                </div>

                {/* Selections List */}
                {selections.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3 opacity-50">🎯</div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Your slip is empty
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Tap market buttons to add selections
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {selections.map((s, i) => (
                        <div
                          key={i}
                          className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[var(--text)] truncate">
                                {s.matchDescription}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                {s.prediction}
                              </p>
                              <p className="text-sm font-bold text-[var(--primary)] mt-1">
                                @ {s.odds.toFixed(2)}
                              </p>
                            </div>
                            <button
                              onClick={() => removeSelection(i)}
                              className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors p-1"
                              title="Remove"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total Odds */}
                    <div className="bg-[var(--card)] rounded-lg p-4 border-2 border-[var(--primary)]/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--text-muted)]">Total Odds</span>
                        <span className="text-xl font-bold text-[var(--primary)]">
                          {totalOdds.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {selections.length} selection{selections.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Pick Details Form */}
                    <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text)] mb-1">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Saturday Banker"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text)] mb-1">
                          Description (optional)
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Brief analysis..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow resize-none"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text)] mb-1">
                          Price (GHS) <span className="text-[var(--text-muted)]">— 0 = free</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={price || ''}
                          onChange={(e) => setPrice(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isMarketplace}
                          onChange={(e) => setIsMarketplace(e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span className="text-[var(--text)]">List on marketplace</span>
                      </label>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text)] mb-1">Placement</label>
                        <select
                          value={placement}
                          onChange={(e) => setPlacement(e.target.value as 'marketplace' | 'subscription' | 'both')}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)]"
                        >
                          <option value="marketplace">Marketplace only</option>
                          <option value="subscription">Subscription only</option>
                          <option value="both">Both marketplace & subscription</option>
                        </select>
                        {(placement === 'subscription' || placement === 'both') && myPackages.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <span className="text-xs text-[var(--text-muted)]">Add to packages:</span>
                            {myPackages.map((p) => (
                              <label key={p.id} className="flex items-center gap-2 cursor-pointer text-xs">
                                <input
                                  type="checkbox"
                                  checked={subscriptionPackageIds.includes(p.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSubscriptionPackageIds((prev) => [...prev, p.id]);
                                    else setSubscriptionPackageIds((prev) => prev.filter((id) => id !== p.id));
                                  }}
                                  className="w-3.5 h-3.5 rounded border-[var(--border)]"
                                />
                                <span>{p.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {(placement === 'subscription' || placement === 'both') && myPackages.length === 0 && (
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            <Link href="/dashboard/subscription-packages" className="text-[var(--primary)] hover:underline">Create subscription packages</Link> first.
                          </p>
                        )}
                      </div>
                      {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
                          <p className="text-red-800 dark:text-red-200 text-xs">{error}</p>
                        </div>
                      )}
                      <button
                        onClick={submit}
                        disabled={submitting || selections.length === 0 || !title.trim()}
                        className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {submitting && <LoadingSpinner size="sm" />}
                        {submitting ? 'Creating Pick...' : 'Create Pick'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Mobile: Sticky slip bar above nav — tap to open slip sheet */}
      {selections.length > 0 && (
        <div
          className="lg:hidden fixed left-0 right-0 bottom-16 z-40 px-4 pb-2"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={() => setSlipSheetOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-teal-500/30 active:scale-[0.99] transition-transform touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg">📝</span>
              <div className="text-left">
                <p className="font-semibold text-sm">{selections.length} selection{selections.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-white/85">Total @ {totalOdds.toFixed(2)}</p>
              </div>
            </div>
            <span className="font-bold text-base">Review & Create</span>
          </button>
        </div>
      )}

      {/* Mobile: Slip bottom sheet */}
      {slipSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setSlipSheetOpen(false)}
          aria-hidden
        >
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="sticky top-0 z-10 bg-white rounded-t-3xl pt-4 pb-3 px-4 border-b border-[var(--border)]">
              <div className="w-12 h-1 rounded-full bg-[var(--border)] mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                  <span>📝</span> Bet Slip
                </h2>
                <button
                  type="button"
                  onClick={() => setSlipSheetOpen(false)}
                  className="p-2 -m-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-warm)] transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {selections.map((s, i) => (
                  <div
                    key={i}
                    className="bg-[var(--bg-warm)] rounded-xl p-4 border border-[var(--border)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text)]">{s.matchDescription}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{s.prediction}</p>
                        <p className="text-base font-bold text-[var(--primary)] mt-2">@ {s.odds.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeSelection(i)}
                        className="flex-shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation"
                        aria-label="Remove selection"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-[var(--primary-light)]/50 rounded-xl p-4 border-2 border-[var(--primary)]/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-muted)]">Total Odds</span>
                  <span className="text-xl font-bold text-[var(--primary)]">{totalOdds.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Saturday Banker"
                    className="w-full px-4 py-3 text-base rounded-xl border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief analysis..."
                    className="w-full px-4 py-3 text-base rounded-xl border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Price (GHS) — 0 = free</label>
                  <input
                    type="number"
                    min={0}
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-4 py-3 text-base rounded-xl border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={isMarketplace}
                    onChange={(e) => setIsMarketplace(e.target.checked)}
                    className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text)]">List on marketplace</span>
                </label>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                <button
                  onClick={() => submit()}
                  disabled={submitting || selections.length === 0 || !title.trim()}
                  className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[52px]"
                >
                  {submitting && <LoadingSpinner size="sm" />}
                  {submitting ? 'Creating...' : 'Create Pick'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
