'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { hapticLight } from '@/lib/haptic';
import { AdSlot } from '@/components/AdSlot';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { formatError } from '@/utils/errorMessages';
import { ErrorToast } from '@/components/ErrorToast';
import { SuccessToast } from '@/components/SuccessToast';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { fetchSellingThresholds, type SellingThresholds } from '@/lib/selling-thresholds';
import { TipsterSellUnlockChecklist } from '@/components/TipsterSellUnlockChecklist';
import { Button } from '@/components/ui/Button';
import { CreatePickLanding } from '@/components/CreatePickLanding';
import { fetchDailyCouponQuota, type DailyCouponQuota } from '@/lib/daily-coupon-quota';
import { useSlipCart } from '@/context/SlipCartContext';
import type { Fixture, FixtureOdd, SportEventItem, CreatePickSport, FilterOptions, NonFootballSport } from './types';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { CreatePickSportChips } from './components/CreatePickSportChips';
import { CreatePickStepsNav } from './components/CreatePickStepsNav';
import { PickQuotaBanner } from '@/components/PickQuotaBanner';
import { CreatePickSelectPanel } from './components/CreatePickSelectPanel';
import { CreatePickSlipColumn } from './components/CreatePickSlipColumn';
import { CreatePickMobileSlipSheet } from './components/CreatePickMobileSlipSheet';

export default function CreatePickPage() {
  const router = useRouter();
  const t = useT();
  const { selections, addSelection: addToCart, removeSelection: removeFromCart, clearCart } = useSlipCart();
  const [guest, setGuest] = useState<boolean | null>(null);
  const [sport, setSport] = useState<CreatePickSport>('football');
  useEffect(() => {
    setGuest(!localStorage.getItem('token'));
  }, []);
  useEffect(() => {
    if (isFootballOnlyDiscovery() && sport !== 'football') setSport('football');
  }, [sport]);
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
  const [bookmakerKey, setBookmakerKey] = useState('');
  const [bookingCode, setBookingCode] = useState('');
  const [price, setPrice] = useState(0);
  const [placement, setPlacement] = useState<'marketplace' | 'subscription'>('marketplace');
  const [subscriptionPackageIds, setSubscriptionPackageIds] = useState<number[]>([]);
  useEffect(() => {
    if (!isSubscriptionsEnabled() && placement !== 'marketplace') {
      setPlacement('marketplace');
      setSubscriptionPackageIds([]);
    }
  }, [placement]);
  const [myPackages, setMyPackages] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  /** Fixture list / API fetch only — never reuse for publish validation (avoids “Error loading fixtures” for business rules). */
  const [fixtureError, setFixtureError] = useState<string | null>(null);
  /** Title, selections, paid thresholds, or POST /accumulators validation. */
  const [formError, setFormError] = useState<string | null>(null);
  const { showError, showSuccess, clearError, clearSuccess, error: toastError, success: toastSuccess } = useToast();
  // Removed step state - slip widget is always visible on the right
  const [loadingOdds, setLoadingOdds] = useState<Set<number>>(new Set());
  const [collapsedOdds, setCollapsedOdds] = useState<Set<number>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [slipSheetOpen, setSlipSheetOpen] = useState(false);
  const [sellTh, setSellTh] = useState<SellingThresholds | null>(null);
  const [dailyQuota, setDailyQuota] = useState<DailyCouponQuota | null>(null);
  const [myTipStats, setMyTipStats] = useState<{ roi: number; winRate: number } | null>(null);
  const [sportLeague, setSportLeague] = useState<string>('');
  const debouncedTeamSearch = useDebounce(teamSearch, 500); // Debounce team search by 500ms
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ countries: [], tournaments: [], leagues: [] });

  const atDailyLimit =
    dailyQuota != null &&
    dailyQuota.remaining === 0 &&
    !dailyQuota.exempt &&
    dailyQuota.maxPerDay > 0;

  /** Paid (price > 0) requires settled ROI + win rate ≥ admin minimums. Server enforces too — keep in sync. */
  const paidSaleAllowed = useMemo(() => {
    const p = Number(price) || 0;
    if (p <= 0) return true;
    if (!sellTh || !myTipStats) return false;
    return myTipStats.roi >= sellTh.minimumROI && myTipStats.winRate >= sellTh.minimumWinRate;
  }, [price, sellTh, myTipStats]);

  const subscriptionMissingPackages =
    placement === 'subscription' && subscriptionPackageIds.length === 0;

  const createPickDisabled =
    submitting ||
    selections.length === 0 ||
    !title.trim() ||
    atDailyLimit ||
    !paidSaleAllowed ||
    subscriptionMissingPackages;

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

  /** One league insights block per competition — avoid repeated accordions when many fixtures share a league. */
  const firstFixtureIdPerLeagueApi = useMemo(() => {
    const firstByApi = new Map<number, number>();
    for (const f of availableFixtures) {
      const apiId = f.league?.apiId;
      if (apiId == null) continue;
      if (!firstByApi.has(apiId)) firstByApi.set(apiId, f.id);
    }
    return firstByApi;
  }, [availableFixtures]);

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
      setFixtureError(null);
      try {
        const params = new URLSearchParams();
        params.append('days', '7'); // Match fixture sync window (7 days)
        if (selectedCountry) params.append('country', selectedCountry);
        if (selectedLeague) params.append('league', selectedLeague);
        if (debouncedTeamSearch.trim()) params.append('team', debouncedTeamSearch.trim());

        const fixRes = await fetch(`${getApiUrl()}/fixtures?${params.toString()}`, { headers });
        if (!fixRes.ok) {
          await fixRes.text().catch(() => '');
          const msg = t('create_pick.fixtures_load_http_error', { status: String(fixRes.status) });
          setFixtureError(formatError(new Error(msg)));
          showError(new Error(msg));
          setFixtures([]);
          return;
        }
        const data = await fixRes.json();
        console.log('Fixtures loaded:', Array.isArray(data) ? data.length : 0);
        setFixtures(Array.isArray(data) ? data : []);
        if (!Array.isArray(data) || data.length === 0) {
          // Don't show error, just empty state - user can change filters
          setFixtureError(null);
        }
      } catch (err: any) {
        const errorMessage = formatError(err);
        setFixtureError(errorMessage);
        showError(err);
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [router, selectedCountry, selectedLeague, debouncedTeamSearch, sport, showError, t]);

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

  useEffect(() => {
    if (placement === 'subscription' && myPackages.length === 1) {
      setSubscriptionPackageIds([myPackages[0].id]);
    }
  }, [placement, myPackages]);

  useEffect(() => {
    void fetchSellingThresholds().then(setSellTh);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    void fetchDailyCouponQuota(token).then(setDailyQuota);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/tipster/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.roi === 'number' && typeof d.winRate === 'number') {
          setMyTipStats({ roi: d.roi, winRate: d.winRate });
        }
      })
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
                      ? { ...fix, oddsError: t('create_pick.odds_not_available_yet') }
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
                ? { ...fix, oddsError: t('create_pick.odds_fetch_failed') }
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
      showError(new Error(t('create_pick.error_duplicate_same_match')));
    }
  };

  const addSportEventSelection = (e: SportEventItem, odd: FixtureOdd, eventSport: NonFootballSport) => {
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
      showError(new Error(t('create_pick.error_duplicate_same_match')));
    }
  };

  const removeSelection = (idx: number) => {
    removeFromCart(idx);
    if (selections.length === 1) setSlipSheetOpen(false);
  };

  const totalOdds = selections.reduce((a, s) => a * s.odds, 1);

  const retryFootballFixtures = () => {
    setFixtureError(null);
    const token = localStorage.getItem('token');
    if (!token) return;
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
          setFixtureError(null);
        }
      })
      .catch((err) => {
        setFixtureError(formatError(err));
        showError(err);
      })
      .finally(() => setLoading(false));
  };

  const submit = async () => {
    if (selections.length === 0) {
      setFormError(t('create_pick.error_no_selections'));
      return;
    }
    if (!title.trim()) {
      setFormError(t('create_pick.error_no_title'));
      return;
    }
    if (placement === 'subscription' && subscriptionPackageIds.length === 0) {
      setFormError(t('create_pick.error_vip_packages_required'));
      return;
    }
    const keyTrim = bookmakerKey.trim().toLowerCase();
    const codeTrim = bookingCode.trim();
    if ((keyTrim && !codeTrim) || (!keyTrim && codeTrim)) {
      setFormError(t('create_pick.error_bookie_code_pair'));
      return;
    }
    const priceNum = Number(price) || 0;
    if (priceNum > 0 && !paidSaleAllowed) {
      setFormError(
        sellTh && myTipStats
          ? t('create_pick.error_paid_requires_stats', {
              minRoi: String(sellTh.minimumROI),
              minWr: String(sellTh.minimumWinRate),
            })
          : t('create_pick.error_stats_loading_for_paid'),
      );
      return;
    }
    setFormError(null);
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
        ...(keyTrim && codeTrim ? { bookmakerKey: keyTrim, bookingCode: codeTrim } : {}),
        price: Number(price) || 0,
        isMarketplace: placement === 'marketplace',
        placement,
        subscriptionPackageIds: placement === 'subscription' ? subscriptionPackageIds : undefined,
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
      const err = (await res.json().catch(() => ({}))) as { message?: unknown; error?: string };
      const msg =
        getApiErrorMessage(err, '') ||
        (typeof err?.error === 'string' ? err.error : '') ||
        t('create_pick.submit_failed_default');
      const errorMessage = res.status >= 500 ? formatError(new Error(msg)) : (msg || formatError(new Error(msg)));
      setFormError(errorMessage);
      // Avoid duplicate toast for expected 4xx validation; toast only for server errors.
      if (res.status >= 500) {
        showError(new Error(msg));
      }
      return;
    }
    showSuccess(t('create_pick.toast_success_created'));
    clearCart();
    router.push('/my-picks');
  };

  const publishFields = {
    title,
    bookmakerKey,
    bookingCode,
    price,
    placement,
    subscriptionPackageIds,
    myPackages,
    sellTh,
    myTipStats,
    paidSaleAllowed,
    formError,
    createPickDisabled,
    submitting,
    onTitle: setTitle,
    onBookmaker: setBookmakerKey,
    onBookingCode: setBookingCode,
    onPrice: setPrice,
    onPlacement: setPlacement,
    onPackages: setSubscriptionPackageIds,
    onClearError: () => setFormError(null),
    onSubmit: submit,
  };

  if (guest === null) {
    return (
      <DashboardShell>
        <div className="section-ux-dashboard-shell min-h-[40vh]" />
      </DashboardShell>
    );
  }
  if (guest) {
    return <CreatePickLanding />;
  }

  return (
    <DashboardShell slipCount={selections.length}>
      {toastError ? <ErrorToast error={toastError} onClose={clearError} /> : null}
      {toastSuccess ? <SuccessToast message={toastSuccess} onClose={clearSuccess} /> : null}
      <div className="min-h-[calc(100vh-8rem)] bg-[var(--bg)] w-full min-w-0 max-w-full">
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <PageHeader
            label={t('create_pick.title')}
            title={t('create_pick.title')}
            tagline={t('create_pick.tagline')}
          />
          <div className="mb-4">
            <TipsterSellUnlockChecklist compact />
          </div>
          {dailyQuota ? <PickQuotaBanner dailyQuota={dailyQuota} atDailyLimit={atDailyLimit} /> : null}
          <div className="mb-4">
            <AdSlot zoneSlug="create-pick-full" fullWidth className="w-full" />
          </div>
          <CreatePickStepsNav />
          <CreatePickSportChips sport={sport} onSport={setSport} />
          {selections.length > 0 ? (
            <div className="flex justify-end mb-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSlipSheetOpen(true)}
                className="lg:hidden"
                aria-label="View slip"
              >
                <span>{selections.length} {selections.length !== 1 ? t('create_pick.selections') : t('create_pick.selection')}</span>
                <span className="text-[var(--primary)] font-bold ml-0.5">@ {totalOdds.toFixed(2)}</span>
              </Button>
            </div>
          ) : null}

          <div className="flex flex-col lg:flex-row gap-4 pb-6 min-w-0 w-full max-w-full">
            <CreatePickSelectPanel
              sport={sport}
              teamSearch={teamSearch}
              onTeamSearch={setTeamSearch}
              searchApplied={debouncedTeamSearch}
              selectedCountry={selectedCountry}
              onCountry={(v) => {
                setSelectedCountry(v);
                setSelectedLeague('');
              }}
              selectedLeague={selectedLeague}
              onLeague={setSelectedLeague}
              sportLeague={sportLeague}
              onSportLeague={setSportLeague}
              onClearFootballFilters={() => {
                setSelectedCountry('');
                setSelectedLeague('');
                setTeamSearch('');
              }}
              onClearSportFilters={() => {
                setSportLeague('');
                setTeamSearch('');
              }}
              countries={filterOptions.countries}
              competitionOptions={competitionOptions}
              uniqueSportLeagues={uniqueSportLeagues}
              footballLoading={loading}
              fixtureError={fixtureError}
              onRetryFixtures={retryFootballFixtures}
              availableFixtures={availableFixtures}
              fixtures={fixtures}
              firstFixtureIdPerLeagueApi={firstFixtureIdPerLeagueApi}
              loadingOdds={loadingOdds}
              collapsedOdds={collapsedOdds}
              onLoadOdds={loadFixtureOdds}
              onToggleCollapsed={(id) =>
                setCollapsedOdds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onAddFootball={addFootballSelection}
              boards={{
                basketball: { available: availableBasketballEvents, all: basketballEvents, loading: loadingBasketball },
                rugby: { available: availableRugbyEvents, all: rugbyEvents, loading: loadingRugby },
                mma: { available: availableMmaEvents, all: mmaEvents, loading: loadingMma },
                volleyball: { available: availableVolleyballEvents, all: volleyballEvents, loading: loadingVolleyball },
                hockey: { available: availableHockeyEvents, all: hockeyEvents, loading: loadingHockey },
                american_football: { available: availableAmericanFootballEvents, all: americanFootballEvents, loading: loadingAmericanFootball },
                tennis: { available: availableTennisEvents, all: tennisEvents, loading: loadingTennis },
              }}
              onAddSportEvent={addSportEventSelection}
            />
            <CreatePickSlipColumn
              selections={selections}
              totalOdds={totalOdds}
              onRemove={removeSelection}
              title={title}
              price={price}
              publish={publishFields}
            />
          </div>
        </div>
      </div>

      {selections.length > 0 ? (
        <div
          className="lg:hidden fixed left-0 right-0 z-40 px-4 min-w-0 max-w-full pointer-events-none"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
        >
          <Button
            type="button"
            onClick={() => {
              hapticLight();
              setSlipSheetOpen(true);
            }}
            className={`pointer-events-auto w-full min-w-0 max-w-full justify-between ${
              createPickDisabled && selections.length > 0 ? 'opacity-85' : ''
            }`}
            aria-label="Open pick slip to review and create"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <span className="w-10 h-10 rounded-[var(--radius-sm)] bg-white/20 flex items-center justify-center text-sm font-bold tabular-nums shrink-0" aria-hidden>
                {selections.length}
              </span>
              <div className="text-left min-w-0">
                <p className="font-semibold text-sm truncate">
                  {selections.length} selection{selections.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-white/85 tabular-nums">Total @ {totalOdds.toFixed(2)}</p>
                {createPickDisabled && selections.length > 0 ? (
                  <p className="text-[10px] text-white/75 mt-0.5 max-w-full sm:max-w-[200px] leading-tight">
                    {t('create_pick.slip_bar_hint')}
                  </p>
                ) : null}
              </div>
            </div>
            <span className="font-bold text-sm sm:text-base shrink-0 whitespace-nowrap">Review & Create</span>
          </Button>
        </div>
      ) : null}

      <CreatePickMobileSlipSheet
        open={slipSheetOpen}
        onClose={() => setSlipSheetOpen(false)}
        selections={selections}
        totalOdds={totalOdds}
        onRemove={removeSelection}
        title={title}
        price={price}
        publish={publishFields}
      />
    </DashboardShell>
  );
}
