'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { formatError } from '@/utils/errorMessages';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { getApiUrl } from '@/lib/site-config';
import { useSlipCart } from '@/context/SlipCartContext';
import type { Fixture, FixtureOdd, SportEventItem, CreatePickSport, FilterOptions } from './types';
import { SportLoadingSpinner } from './components/SportLoadingSpinner';
import { SportEmptyState } from './components/SportEmptyState';
import { FootballFixtureCard } from './components/FootballFixtureCard';
import { SportEventCard } from './components/SportEventCard';

/** Market order per sport (non-football) */
const SPORT_MARKET_ORDERS: Record<Exclude<CreatePickSport, 'football'>, string[]> = {
  basketball: ['Match Winner', 'Over/Under', 'Home/Away', '3Way Result', 'Goals Over/Under'],
  rugby: ['Match Winner', 'Over/Under', 'Home/Away', '3Way Result', 'Goals Over/Under'],
  mma: ['Match Winner', 'Method of Victory', 'Home/Away'],
  volleyball: ['Match Winner', 'Home/Away', '3Way Result'],
  hockey: ['Match Winner', 'Over/Under', 'Home/Away', '3Way Result'],
  american_football: ['Match Winner', 'Over/Under', 'Home/Away', '3Way Result'],
  tennis: ['Match Winner', 'Over/Under', 'Set Betting', 'Games Over/Under'],
};

export default function CreatePickPage() {
  const router = useRouter();
  const t = useT();
  const { selections, addSelection: addToCart, removeSelection: removeFromCart, clearCart } = useSlipCart();
  const [sport, setSport] = useState<CreatePickSport>('football');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [basketballEvents, setBasketballEvents] = useState<SportEventItem[]>([]);
  const [rugbyEvents, setRugbyEvents] = useState<SportEventItem[]>([]);
  const [mmaEvents, setMmaEvents] = useState<SportEventItem[]>([]);
  const [volleyballEvents, setVolleyballEvents] = useState<SportEventItem[]>([]);
  const [hockeyEvents, setHockeyEvents] = useState<SportEventItem[]>([]);
  const [americanFootballEvents, setAmericanFootballEvents] = useState<SportEventItem[]>([]);
  const [tennisEvents, setTennisEvents] = useState<SportEventItem[]>([]);
  const [loadingTennis, setLoadingTennis] = useState(false);
  const [loadingBasketball, setLoadingBasketball] = useState(false);
  const [loadingRugby, setLoadingRugby] = useState(false);
  const [loadingMma, setLoadingMma] = useState(false);
  const [loadingVolleyball, setLoadingVolleyball] = useState(false);
  const [loadingHockey, setLoadingHockey] = useState(false);
  const [loadingAmericanFootball, setLoadingAmericanFootball] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [placement, setPlacement] = useState<'marketplace' | 'subscription' | 'both'>('both');
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
  const [sportLeague, setSportLeague] = useState<string>('');
  const debouncedTeamSearch = useDebounce(teamSearch, 500); // Debounce team search by 500ms
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ countries: [], tournaments: [], leagues: [] });

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
  
  // Derive unique leagues for the currently active non-football sport (for Competition dropdown)
  const uniqueSportLeagues = useMemo(() => {
    let events: SportEventItem[] = [];
    if (sport === 'basketball') events = basketballEvents;
    else if (sport === 'rugby') events = rugbyEvents;
    else if (sport === 'mma') events = mmaEvents;
    else if (sport === 'volleyball') events = volleyballEvents;
    else if (sport === 'hockey') events = hockeyEvents;
    else if (sport === 'american_football') events = americanFootballEvents;
    else if (sport === 'tennis') events = tennisEvents;
    const seen = new Set<string>();
    return events
      .map((e) => e.leagueName)
      .filter((l): l is string => !!l && !seen.has(l) && seen.add(l) !== undefined)
      .sort();
  }, [sport, basketballEvents, rugbyEvents, mmaEvents, volleyballEvents, hockeyEvents, americanFootballEvents, tennisEvents]);

  // Helper: apply common client-side filters (odds present, search, league) to a sport event list
  function filterSportEvents(events: SportEventItem[], search: string, league: string): SportEventItem[] {
    const now = new Date();
    const term = search.trim().toLowerCase();
    return events.filter((e) => {
      if (e.status !== 'NS' && e.status !== 'TBD') return false;
      if (new Date(e.eventDate) < now) return false;
      if (!e.odds || e.odds.length === 0) return false; // hide events with no odds
      if (league && e.leagueName !== league) return false;
      if (term && !e.homeTeam.toLowerCase().includes(term) && !e.awayTeam.toLowerCase().includes(term)) return false;
      return true;
    });
  }

  // Sport events (basketball/rugby) - filtered by backend as NS; ensure future
  const availableBasketballEvents = useMemo(
    () => filterSportEvents(basketballEvents, debouncedTeamSearch, sportLeague),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basketballEvents, debouncedTeamSearch, sportLeague],
  );
  const availableRugbyEvents = useMemo(
    () => filterSportEvents(rugbyEvents, debouncedTeamSearch, sportLeague),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rugbyEvents, debouncedTeamSearch, sportLeague],
  );
  const availableMmaEvents = useMemo(
    () => filterSportEvents(mmaEvents, debouncedTeamSearch, sportLeague),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mmaEvents, debouncedTeamSearch, sportLeague],
  );
  const availableVolleyballEvents = useMemo(
    () => filterSportEvents(volleyballEvents, debouncedTeamSearch, sportLeague),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [volleyballEvents, debouncedTeamSearch, sportLeague],
  );
  const availableHockeyEvents = useMemo(
    () => filterSportEvents(hockeyEvents, debouncedTeamSearch, sportLeague),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hockeyEvents, debouncedTeamSearch, sportLeague],
  );
  const availableAmericanFootballEvents = useMemo(
    () => filterSportEvents(americanFootballEvents, debouncedTeamSearch, sportLeague),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [americanFootballEvents, debouncedTeamSearch, sportLeague],
  );
  const availableTennisEvents = useMemo(
    () => filterSportEvents(tennisEvents, debouncedTeamSearch, sportLeague),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tennisEvents, debouncedTeamSearch, sportLeague],
  );

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

  // Reset sport-specific filters when switching sports (slip keeps accumulating across sports)
  useEffect(() => {
    setSportLeague('');
    setTeamSearch('');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when sport changes
  }, [sport]);

  // Fetch basketball events when sport = basketball
  useEffect(() => {
    if (sport !== 'basketball') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoadingBasketball(true);
    fetch(`${getApiUrl()}/basketball/events?days=7`, { headers })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => setBasketballEvents(data?.events ?? []))
      .catch(() => setBasketballEvents([]))
      .finally(() => setLoadingBasketball(false));
  }, [sport]);

  // Fetch rugby events when sport = rugby
  useEffect(() => {
    if (sport !== 'rugby') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoadingRugby(true);
    fetch(`${getApiUrl()}/rugby/events?days=7`, { headers })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => setRugbyEvents(data?.events ?? []))
      .catch(() => setRugbyEvents([]))
      .finally(() => setLoadingRugby(false));
  }, [sport]);

  // Fetch MMA events when sport = mma
  useEffect(() => {
    if (sport !== 'mma') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoadingMma(true);
    fetch(`${getApiUrl()}/mma/events?days=7`, { headers })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => setMmaEvents(data?.events ?? []))
      .catch(() => setMmaEvents([]))
      .finally(() => setLoadingMma(false));
  }, [sport]);

  // Fetch volleyball events when sport = volleyball
  useEffect(() => {
    if (sport !== 'volleyball') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoadingVolleyball(true);
    fetch(`${getApiUrl()}/volleyball/events?days=7`, { headers })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => setVolleyballEvents(data?.events ?? []))
      .catch(() => setVolleyballEvents([]))
      .finally(() => setLoadingVolleyball(false));
  }, [sport]);

  // Fetch hockey events when sport = hockey
  useEffect(() => {
    if (sport !== 'hockey') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoadingHockey(true);
    fetch(`${getApiUrl()}/hockey/events?days=7`, { headers })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => setHockeyEvents(data?.events ?? []))
      .catch(() => setHockeyEvents([]))
      .finally(() => setLoadingHockey(false));
  }, [sport]);

  // Fetch American Football events when sport = american_football
  useEffect(() => {
    if (sport !== 'american_football') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoadingAmericanFootball(true);
    fetch(`${getApiUrl()}/american-football/events?days=7`, { headers })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => setAmericanFootballEvents(data?.events ?? []))
      .catch(() => setAmericanFootballEvents([]))
      .finally(() => setLoadingAmericanFootball(false));
  }, [sport]);

  // Fetch Tennis events when sport = tennis
  useEffect(() => {
    if (sport !== 'tennis') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoadingTennis(true);
    fetch(`${getApiUrl()}/tennis/events?days=7`, { headers })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => setTennisEvents(data?.events ?? []))
      .catch(() => setTennisEvents([]))
      .finally(() => setLoadingTennis(false));
  }, [sport]);

  // Periodic refresh to update fixture statuses (every 30 seconds)
  // Only refresh when page is visible and user is active
  useEffect(() => {
    if (loading || sport !== 'football') return;
    
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
  }, [selectedCountry, selectedLeague, debouncedTeamSearch, loading, sport]);

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
    if (sport !== 'football') return;
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
  }, [router, selectedCountry, selectedLeague, debouncedTeamSearch, sport]);

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

  const addFootballSelection = (f: Fixture, odd: FixtureOdd) => {
    const matchDesc = `${f.homeTeamName} vs ${f.awayTeamName}`;
    const pred = `${odd.marketName}: ${odd.marketValue}`;
    const fid = f.apiId ?? f.id;
    const added = addToCart({
      fixtureId: fid,
      sport: 'football',
      matchDescription: matchDesc,
      prediction: pred,
      odds: Number(odd.odds),
      matchDate: f.matchDate,
    });
    if (!added) {
      showError(new Error('You already have a selection for this match. Remove it to pick a different outcome.'));
    }
  };

  const addSportEventSelection = (e: SportEventItem, odd: FixtureOdd, eventSport: 'basketball' | 'rugby' | 'mma' | 'volleyball' | 'hockey' | 'american_football' | 'tennis') => {
    const matchDesc = `${e.homeTeam} vs ${e.awayTeam}`;
    const pred = `${odd.marketName}: ${odd.marketValue}`;
    const added = addToCart({
      eventId: e.id,
      sport: eventSport,
      matchDescription: matchDesc,
      prediction: pred,
      odds: Number(odd.odds),
      matchDate: e.eventDate,
    });
    if (!added) {
      showError(new Error('You already have a selection for this match. Remove it to pick a different outcome.'));
    }
  };

  const removeSelection = (idx: number) => {
    removeFromCart(idx);
    if (selections.length === 1) setSlipSheetOpen(false);
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
        isMarketplace: placement === 'marketplace' || placement === 'both',
        placement: placement,
        subscriptionPackageIds: (placement === 'subscription' || placement === 'both') ? subscriptionPackageIds : undefined,
        // 'multi' when coupon spans more than one sport; otherwise the single sport
        sport: (() => {
          const sports = new Set(selections.map((s) => s.sport ?? 'football'));
          return sports.size > 1 ? 'multi' : (sports.values().next().value ?? 'football');
        })(),
        selections: selections.map((s) => ({
          fixtureId: s.fixtureId,
          eventId: s.eventId,
          sport: s.sport ?? 'football',  // per-selection sport for backend routing
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
      const msg = err?.message || err?.error || 'Failed to create pick';
      // Prefer backend message for 4xx (validation); use formatError for generic 5xx
      const errorMessage = res.status >= 500 ? formatError(new Error(msg)) : (msg || formatError(new Error(msg)));
      setError(errorMessage);
      showError(new Error(msg));
      return;
    }
    showSuccess('Pick created successfully!');
    clearCart();
    router.push('/my-picks');
  };

  return (
    <DashboardShell slipCount={selections.length}>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <div className="dashboard-bg dashboard-pattern min-h-[calc(100vh-8rem)]">
        <div className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-5 md:py-6 pb-24">
          <PageHeader
            label={t('create_pick.title')}
            title={t('create_pick.title')}
            tagline={t('create_pick.tagline')}
          />
          <div className="mb-4">
            <AdSlot zoneSlug="create-pick-full" fullWidth className="w-full" />
          </div>
          {/* Sport tabs — scrollable on mobile */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {([
              { key: 'football',          label: `⚽ ${t('create_pick.sport_football')}` },
              { key: 'basketball',        label: `🏀 ${t('create_pick.sport_basketball')}` },
              { key: 'rugby',             label: `🏉 ${t('create_pick.sport_rugby')}` },
              { key: 'mma',               label: `🥊 ${t('create_pick.sport_mma')}` },
              { key: 'volleyball',        label: `🏐 ${t('create_pick.sport_volleyball')}` },
              { key: 'hockey',            label: `🏒 ${t('create_pick.sport_hockey')}` },
              { key: 'american_football', label: `🏈 ${t('create_pick.sport_american_football')}` },
              { key: 'tennis',            label: `🎾 ${t('create_pick.sport_tennis')}` },
            ] as { key: typeof sport; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSport(key)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  sport === key
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {selections.length > 0 && (
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={() => setSlipSheetOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] text-sm font-semibold shadow-sm hover:bg-teal-100 active:scale-[0.98] transition-all touch-manipulation min-h-[44px]"
                aria-label="View slip"
              >
                <span className="text-base">📝</span>
                <span>{selections.length} {selections.length !== 1 ? t('create_pick.selections') : t('create_pick.selection')}</span>
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
                  placeholder={
                    sport === 'football' ? t('create_pick.search_football') :
                    sport === 'tennis' ? t('create_pick.search_tennis') :
                    sport === 'mma' ? t('create_pick.search_mma') :
                    t('create_pick.search_team')
                  }
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

            {/* Sport-specific filters / info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-[var(--text-muted)] text-sm">
                  {sport === 'football' && t('create_pick.click_hint')}
                  {sport !== 'football' && t('create_pick.click_hint_other')}
                </p>
                <p className="text-[var(--text)] text-sm font-medium">
                  {sport === 'football' && (
                    <><strong>{availableFixtures.length}</strong> available fixture{availableFixtures.length !== 1 ? 's' : ''}</>
                  )}
                  {sport === 'basketball' && (
                    <><strong>{availableBasketballEvents.length}</strong> available game{availableBasketballEvents.length !== 1 ? 's' : ''}</>
                  )}
                  {sport === 'rugby' && (
                    <><strong>{availableRugbyEvents.length}</strong> available match{availableRugbyEvents.length !== 1 ? 'es' : ''}</>
                  )}
                  {sport === 'mma' && (
                    <><strong>{availableMmaEvents.length}</strong> available fight{availableMmaEvents.length !== 1 ? 's' : ''}</>
                  )}
                  {sport === 'volleyball' && (
                    <><strong>{availableVolleyballEvents.length}</strong> available match{availableVolleyballEvents.length !== 1 ? 'es' : ''}</>
                  )}
                  {sport === 'hockey' && (
                    <><strong>{availableHockeyEvents.length}</strong> available game{availableHockeyEvents.length !== 1 ? 's' : ''}</>
                  )}
                  {sport === 'american_football' && (
                    <><strong>{availableAmericanFootballEvents.length}</strong> available game{availableAmericanFootballEvents.length !== 1 ? 's' : ''}</>
                  )}
                  {sport === 'tennis' && (
                    <><strong>{availableTennisEvents.length}</strong> available match{availableTennisEvents.length !== 1 ? 'es' : ''}</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Football: Country + Competition filters (API-backed) */}
                {sport === 'football' && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-[var(--text)] whitespace-nowrap">{t('create_pick.country')}</label>
                      <select
                        value={selectedCountry}
                        onChange={(e) => {
                          setSelectedCountry(e.target.value);
                          setSelectedLeague('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all min-w-[140px]"
                      >
                        <option value="">{t('create_pick.all_countries')}</option>
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
                          title={selectedCountry ? (selectedCountry === 'World' ? t('create_pick.international_only') : t('create_pick.leagues_in', { country: selectedCountry })) : t('create_pick.filter_by_league')}
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
                        onClick={() => { setSelectedCountry(''); setSelectedLeague(''); setTeamSearch(''); }}
                        title="Clear all filters"
                        className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        {t('create_pick.clear_filters')}
                      </button>
                    )}
                  </>
                )}

                {/* Non-football: Competition/League filter (client-side from loaded events) */}
                {sport !== 'football' && uniqueSportLeagues.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-[var(--text)] whitespace-nowrap">Competition</label>
                    <select
                      value={sportLeague}
                      onChange={(e) => setSportLeague(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all min-w-[200px]"
                    >
                      <option value="">All competitions</option>
                      {uniqueSportLeagues.map((league) => (
                        <option key={league} value={league}>{league}</option>
                      ))}
                    </select>
                  </div>
                )}
                {sport !== 'football' && (sportLeague || teamSearch) && (
                  <button
                    onClick={() => { setSportLeague(''); setTeamSearch(''); }}
                    title="Clear all filters"
                    className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            {loading && sport === 'football' && <LoadingSkeleton count={4} />}

            {/* Basketball */}
            {sport === 'basketball' && loadingBasketball && <SportLoadingSpinner label="Loading basketball games…" />}
            {sport === 'basketball' && !loadingBasketball && availableBasketballEvents.length === 0 && (
              basketballEvents.filter((e) => e.odds && e.odds.length > 0).length === 0
                ? <SportEmptyState emoji="🏀" label="No upcoming basketball games with odds" hint="Basketball data syncs daily. Odds become available shortly after events are synced." />
                : <SportEmptyState emoji="🏀" label="No games match your filters" hint="Try clearing the Competition filter or changing your search." />
            )}

            {/* Rugby */}
            {sport === 'rugby' && loadingRugby && <SportLoadingSpinner label="Loading rugby matches…" />}
            {sport === 'rugby' && !loadingRugby && availableRugbyEvents.length === 0 && (
              rugbyEvents.filter((e) => e.odds && e.odds.length > 0).length === 0
                ? <SportEmptyState emoji="🏉" label="No upcoming rugby matches with odds" hint="Rugby data syncs daily. Odds become available shortly after events are synced." />
                : <SportEmptyState emoji="🏉" label="No matches match your filters" hint="Try clearing the Competition filter or changing your search." />
            )}

            {/* MMA */}
            {sport === 'mma' && loadingMma && <SportLoadingSpinner label="Loading MMA fights…" />}
            {sport === 'mma' && !loadingMma && availableMmaEvents.length === 0 && (
              mmaEvents.filter((e) => e.odds && e.odds.length > 0).length === 0
                ? <SportEmptyState emoji="🥊" label="No upcoming MMA fights with odds" hint="MMA data syncs daily. Odds are typically available for major promotions like UFC." />
                : <SportEmptyState emoji="🥊" label="No fights match your filters" hint="Try clearing the Competition filter or changing your search." />
            )}

            {/* Volleyball */}
            {sport === 'volleyball' && loadingVolleyball && <SportLoadingSpinner label="Loading volleyball matches…" />}
            {sport === 'volleyball' && !loadingVolleyball && availableVolleyballEvents.length === 0 && (
              volleyballEvents.filter((e) => e.odds && e.odds.length > 0).length === 0
                ? <SportEmptyState emoji="🏐" label="No upcoming volleyball matches with odds" hint="Volleyball data syncs daily at 07:00. Odds may not be available for all leagues." />
                : <SportEmptyState emoji="🏐" label="No matches match your filters" hint="Try clearing the Competition filter or changing your search." />
            )}

            {/* Hockey */}
            {sport === 'hockey' && loadingHockey && <SportLoadingSpinner label="Loading hockey games…" />}
            {sport === 'hockey' && !loadingHockey && availableHockeyEvents.length === 0 && (
              hockeyEvents.filter((e) => e.odds && e.odds.length > 0).length === 0
                ? <SportEmptyState emoji="🏒" label="No upcoming hockey games with odds" hint="Hockey data syncs daily. Odds are available for NHL and major European leagues." />
                : <SportEmptyState emoji="🏒" label="No games match your filters" hint="Try clearing the Competition filter or changing your search." />
            )}

            {/* American Football */}
            {sport === 'american_football' && loadingAmericanFootball && <SportLoadingSpinner label="Loading American Football games…" />}
            {sport === 'american_football' && !loadingAmericanFootball && availableAmericanFootballEvents.length === 0 && (
              americanFootballEvents.filter((e) => e.odds && e.odds.length > 0).length === 0
                ? <SportEmptyState emoji="🏈" label="No upcoming NFL/NCAAF games with odds" hint="NFL is off-season. NCAAF games will appear when the season starts. Data syncs daily." />
                : <SportEmptyState emoji="🏈" label="No games match your filters" hint="Try clearing the Competition filter or changing your search." />
            )}

            {/* Tennis */}
            {sport === 'tennis' && loadingTennis && <SportLoadingSpinner label="Loading tennis matches…" />}
            {sport === 'tennis' && !loadingTennis && availableTennisEvents.length === 0 && (
              tennisEvents.filter((e) => e.odds && e.odds.length > 0).length === 0
                ? <SportEmptyState emoji="🎾" label="No upcoming tennis matches with odds" hint="Tennis data syncs daily at 08:30. Odds are available for ATP/WTA tour events." />
                : <SportEmptyState emoji="🎾" label="No matches match your filters" hint="Try clearing the Competition filter or changing your search." />
            )}
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
            {!loading && !error && sport === 'football' && availableFixtures.length === 0 && fixtures.length === 0 && (
              <div className="bg-[var(--card)] rounded-card border border-[var(--border)] p-6">
                <EmptyState
                  title={
                    selectedCountry || selectedLeague || debouncedTeamSearch
                      ? t('create_pick.no_fixtures_filtered')
                      : t('create_pick.no_fixtures')
                  }
                  description={
                    selectedCountry || selectedLeague || debouncedTeamSearch
                      ? t('create_pick.fixtures_sync_filtered')
                      : t('create_pick.fixtures_sync')
                  }
                  actionLabel={selectedCountry || selectedLeague || debouncedTeamSearch ? t('create_pick.clear_filters') : t('create_pick.go_dashboard')}
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
            {!loading && !error && sport === 'football' && availableFixtures.length === 0 && fixtures.length > 0 && (
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
            {!loading && sport === 'football' && availableFixtures.length > 0 && (
              <div className="space-y-4">
                {availableFixtures.map((f) => (
                  <FootballFixtureCard
                    key={f.id}
                    fixture={f}
                    isLoadingOdds={loadingOdds.has(f.id)}
                    isCollapsed={collapsedOdds.has(f.id)}
                    onLoadOdds={loadFixtureOdds}
                    onToggleCollapsed={(id) =>
                      setCollapsedOdds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      })
                    }
                    onAddSelection={addFootballSelection}
                  />
                ))}
              </div>
            )}
            {sport === 'basketball' && availableBasketballEvents.length > 0 && (
              <div className="space-y-4">
                {availableBasketballEvents.map((e) => (
                  <SportEventCard
                    key={e.id}
                    event={e}
                    marketOrder={SPORT_MARKET_ORDERS.basketball}
                    sport="basketball"
                    onAddSelection={addSportEventSelection}
                  />
                ))}
              </div>
            )}
            {sport === 'rugby' && availableRugbyEvents.length > 0 && (
              <div className="space-y-4">
                {availableRugbyEvents.map((e) => (
                  <SportEventCard
                    key={e.id}
                    event={e}
                    marketOrder={SPORT_MARKET_ORDERS.rugby}
                    sport="rugby"
                    onAddSelection={addSportEventSelection}
                  />
                ))}
              </div>
            )}
            {sport === 'mma' && availableMmaEvents.length > 0 && (
              <div className="space-y-4">
                {availableMmaEvents.map((e) => (
                  <SportEventCard
                    key={e.id}
                    event={e}
                    marketOrder={SPORT_MARKET_ORDERS.mma}
                    sport="mma"
                    onAddSelection={addSportEventSelection}
                    leagueLabel="Event"
                  />
                ))}
              </div>
            )}
            {sport === 'volleyball' && availableVolleyballEvents.length > 0 && (
              <div className="space-y-4">
                {availableVolleyballEvents.map((e) => (
                  <SportEventCard
                    key={e.id}
                    event={e}
                    marketOrder={SPORT_MARKET_ORDERS.volleyball}
                    sport="volleyball"
                    onAddSelection={addSportEventSelection}
                  />
                ))}
              </div>
            )}
            {sport === 'hockey' && availableHockeyEvents.length > 0 && (
              <div className="space-y-4">
                {availableHockeyEvents.map((e) => (
                  <SportEventCard
                    key={e.id}
                    event={e}
                    marketOrder={SPORT_MARKET_ORDERS.hockey}
                    sport="hockey"
                    onAddSelection={addSportEventSelection}
                  />
                ))}
              </div>
            )}
            {sport === 'american_football' && availableAmericanFootballEvents.length > 0 && (
              <div className="space-y-4">
                {availableAmericanFootballEvents.map((e) => (
                  <SportEventCard
                    key={e.id}
                    event={e}
                    marketOrder={SPORT_MARKET_ORDERS.american_football}
                    sport="american_football"
                    onAddSelection={addSportEventSelection}
                  />
                ))}
              </div>
            )}
            {sport === 'tennis' && availableTennisEvents.length > 0 && (
              <div className="space-y-4">
                {availableTennisEvents.map((e) => (
                  <SportEventCard
                    key={e.id}
                    event={e}
                    marketOrder={SPORT_MARKET_ORDERS.tennis}
                    sport="tennis"
                    onAddSelection={addSportEventSelection}
                    leagueLabel="Tournament"
                  />
                ))}
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
                    {t('create_pick.pick_slip')}
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
                      {t('create_pick.slip_empty')}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {t('create_pick.tap_to_add')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {selections.map((s, i) => {
                        const SLIP_SPORT_ICONS: Record<string, string> = {
                          football: '⚽', basketball: '🏀', rugby: '🏉', mma: '🥊',
                          volleyball: '🏐', hockey: '🏒', american_football: '🏈', tennis: '🎾',
                        };
                        const sportIcon = SLIP_SPORT_ICONS[s.sport ?? 'football'] ?? '🎯';
                        return (
                          <div
                            key={i}
                            className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-xs">{sportIcon}</span>
                                  <p className="text-xs font-semibold text-[var(--text)] truncate">
                                    {s.matchDescription}
                                  </p>
                                </div>
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
                        );
                      })}
                    </div>

                    {/* Total Odds */}
                    <div className="bg-[var(--card)] rounded-lg p-4 border-2 border-[var(--primary)]/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--text-muted)]">{t('create_pick.total_odds')}</span>
                        <span className="text-xl font-bold text-[var(--primary)]">
                          {totalOdds.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {selections.length} {selections.length !== 1 ? t('create_pick.selections') : t('create_pick.selection')}
                      </div>
                    </div>

                    {/* Pick Details Form */}
                    <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text)] mb-1">
                          {t('create_pick.title_label')} <span className="text-red-500">*</span>
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
                          {t('create_pick.price_label')} <span className="text-[var(--text-muted)]">{t('create_pick.price_note')}</span>
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
                        {submitting ? t('create_pick.creating') : t('create_pick.create_btn')}
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
                  <span>📝</span> {t('create_pick.pick_slip')}
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
                {selections.map((s, i) => {
                  const SHEET_SPORT_ICONS: Record<string, string> = {
                    football: '⚽', basketball: '🏀', rugby: '🏉', mma: '🥊',
                    volleyball: '🏐', hockey: '🏒', american_football: '🏈', tennis: '🎾',
                  };
                  const sheetSportIcon = SHEET_SPORT_ICONS[s.sport ?? 'football'] ?? '🎯';
                  return (
                    <div
                      key={i}
                      className="bg-[var(--bg-warm)] rounded-xl p-4 border border-[var(--border)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm">{sheetSportIcon}</span>
                            <p className="text-sm font-semibold text-[var(--text)] truncate">{s.matchDescription}</p>
                          </div>
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
                  );
                })}
              </div>
              <div className="bg-[var(--primary-light)]/50 rounded-xl p-4 border-2 border-[var(--primary)]/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-muted)]">{t('create_pick.total_odds')}</span>
                  <span className="text-xl font-bold text-[var(--primary)]">{totalOdds.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">{t('create_pick.title_label')} <span className="text-red-500">*</span></label>
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
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">{t('create_pick.price_label')} {t('create_pick.price_note')}</label>
                  <input
                    type="number"
                    min={0}
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-4 py-3 text-base rounded-xl border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Placement</label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value as 'marketplace' | 'subscription' | 'both')}
                    className="w-full px-4 py-3 text-base rounded-xl border border-[var(--border)] bg-[var(--card)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  >
                    <option value="marketplace">Marketplace only</option>
                    <option value="subscription">Subscription only</option>
                    <option value="both">Both marketplace & subscription</option>
                  </select>
                </div>
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
                  {submitting ? t('create_pick.creating') : t('create_pick.create_btn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
