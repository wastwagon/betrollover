'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { NavBar } from '@/components/ios/NavBar';
import { AccaGeneratorLanding } from '@/components/AccaGeneratorLanding';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';

type MarketOption = { key: string; label: string; fixtureCount?: number };

type Quota = {
  maxPerDay: number;
  usedToday: number;
  remaining: number | null;
  exempt: boolean;
  resetsAtUtc: string;
};

type AccaRiskKey = 'sure' | 'safe' | 'medium' | 'high';

type RiskProfile = {
  key: AccaRiskKey;
  label: string;
  description: string;
  oddMin: number;
  oddMax: number;
  targetOdd: number;
};

type AvailabilityMarket = {
  key: string;
  label: string;
  fixtureCount: number;
  available: boolean;
};

type Availability = {
  riskLevel: string;
  oddMin: number;
  oddMax: number;
  targetOdd: number;
  date: string;
  asOf: string;
  fixtureCount: number;
  selectedFixtureCount: number;
  markets: AvailabilityMarket[];
  availableMarketKeys: string[];
  source: string;
};

type Config = {
  enabled: boolean;
  minLegs: number;
  maxLegs: number;
  dailyGenerations: number;
  sameDayOnly?: boolean;
  /** True when the signed-in user is admin (may use tool while disabled). */
  adminBypassDisabled?: boolean;
  riskProfiles?: RiskProfile[];
  markets: MarketOption[];
  defaults: {
    riskLevel?: AccaRiskKey;
    legs: number;
    markets: string[];
  };
  quota: Quota;
};

type Leg = {
  fixtureId: number;
  apiFixtureId: number;
  matchDescription: string;
  prediction: string;
  outcomeKey: string;
  marketName: string;
  marketValue: string;
  odds: number;
  matchDate: string;
  leagueName: string | null;
  probability: number;
};

type GenerateResult = {
  generationId: number;
  legs: Leg[];
  combinedOdds: number;
  markets: string[];
  riskLevel?: string;
  oddMin: number;
  oddMax: number;
  quota: Quota;
};

/** Offline fallback — keep in sync with backend ACCA_RISK_PROFILES. */
const FALLBACK_RISK_PROFILES: RiskProfile[] = [
  {
    key: 'sure',
    label: 'Sure',
    description:
      'Shortest per-leg prices — often favorites / DC / totals. Higher hit-rate per leg; still not guaranteed.',
    oddMin: 1.2,
    oddMax: 1.4,
    targetOdd: 1.28,
  },
  {
    key: 'safe',
    label: 'Safe',
    description: 'Shorter per-leg prices — steadier singles, still multiplies with more fixtures.',
    oddMin: 1.4,
    oddMax: 1.75,
    targetOdd: 1.55,
  },
  {
    key: 'medium',
    label: 'Medium',
    description: 'Balanced per-leg prices — mix of value and hit-rate.',
    oddMin: 1.7,
    oddMax: 2.4,
    targetOdd: 2.0,
  },
  {
    key: 'high',
    label: 'High',
    description: 'Longer per-leg prices — bigger upside, lower hit-rate per leg.',
    oddMin: 2.2,
    oddMax: 3.8,
    targetOdd: 2.8,
  },
];

const ACCA_RISK_KEYS: AccaRiskKey[] = ['sure', 'safe', 'medium', 'high'];

function isAccaRiskKey(v: string | undefined | null): v is AccaRiskKey {
  return !!v && (ACCA_RISK_KEYS as string[]).includes(v);
}

function formatOdds(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/** Rough combined-odds band if every leg sat at min / target / max of the risk profile. */
function estimateCombinedBand(profile: RiskProfile, fixtureCount: number) {
  const n = Math.max(1, fixtureCount);
  return {
    min: profile.oddMin ** n,
    target: profile.targetOdd ** n,
    max: profile.oddMax ** n,
  };
}

function overallExposureLabel(
  riskKey: AccaRiskKey,
  fixtureCount: number,
): { label: string; detail: string } {
  const bandScore =
    riskKey === 'sure' ? 0.35 : riskKey === 'safe' ? 1 : riskKey === 'medium' ? 2 : 3;
  const score = bandScore + Math.max(0, fixtureCount - 2) * 0.55;
  if (score <= 2.2) {
    return {
      label: 'Lower overall exposure',
      detail: 'Fewer legs and shorter prices — still not a sure thing.',
    };
  }
  if (score <= 4) {
    return {
      label: 'Moderate overall exposure',
      detail: 'More fixtures means every leg must land; combined odds rise quickly.',
    };
  }
  return {
    label: 'Higher overall exposure',
    detail: 'Longer slips (or longer prices) are harder to hit — treat as entertainment, not advice.',
  };
}

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    Authorization: `Bearer ${token || ''}`,
    'Content-Type': 'application/json',
  };
}

function MarketMultiSelect({
  options,
  value,
  onChange,
}: {
  options: MarketOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectedLabels = options.filter((o) => value.includes(o.key)).map((o) => o.label);
  const summary =
    selectedLabels.length === 0
      ? 'Select markets…'
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.length} markets selected`;

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  };

  const selectAll = () => onChange(options.map((o) => o.key));
  const clearAll = () => onChange([]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-gradient-to-b from-white to-slate-50 px-3.5 py-3 text-left shadow-sm transition ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Markets
          </span>
          <span
            className={`mt-0.5 block truncate text-sm font-medium ${
              selectedLabels.length ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            {summary}
          </span>
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition ${
            open ? 'rotate-180 text-emerald-700' : ''
          }`}
          aria-hidden
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2">
            <p className="text-[11px] font-medium text-slate-500">
              {value.length} of {options.length} selected
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {options.map((m) => {
              const on = value.includes(m.key);
              return (
                <li key={m.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(m.key)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${
                      on ? 'bg-emerald-50/80 text-emerald-950' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        on
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                      aria-hidden
                    >
                      {on && (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                          <path
                            fillRule="evenodd"
                            d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.42l2.543 2.542 6.543-6.542a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{m.label}</span>
                    {typeof m.fixtureCount === 'number' && (
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                        {m.fixtureCount} fixture{m.fixtureCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AccaGeneratorPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [legs, setLegs] = useState(4);
  const [riskLevel, setRiskLevel] = useState<AccaRiskKey>('safe');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [title, setTitle] = useState('');
  const selectedMarketsRef = useRef<string[]>([]);
  selectedMarketsRef.current = selectedMarkets;

  const loadConfig = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setGuest(true);
      setLoading(false);
      return;
    }
    setGuest(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/acca-generator/config`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.status === 401) {
        setGuest(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(body, 'Failed to load Acca Generator'));
      }
      const data = (await res.json()) as Config;
      setConfig(data);
      const preferred =
        data.defaults?.markets?.length ? data.defaults.markets : data.markets.slice(0, 4).map((m) => m.key);
      setSelectedMarkets(preferred);
      setLegs(Math.min(data.maxLegs, Math.max(data.minLegs, data.defaults?.legs ?? 4)));
      const rl = data.defaults?.riskLevel;
      setRiskLevel(isAccaRiskKey(rl) ? rl : 'safe');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const loadAvailability = useCallback(async (risk: AccaRiskKey, markets: string[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setAvailabilityLoading(true);
    try {
      const params = new URLSearchParams({ riskLevel: risk });
      if (markets.length) params.set('markets', markets.join(','));
      const res = await fetch(`${getApiUrl()}/acca-generator/availability?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(body, 'Failed to check market availability'));
      }
      const data = (await res.json()) as Availability;
      setAvailability(data);

      const availableKeys = new Set(data.availableMarketKeys);
      const pruned = markets.filter((k) => availableKeys.has(k));
      const nextMarkets =
        pruned.length > 0
          ? pruned
          : data.availableMarketKeys.slice(0, Math.min(4, data.availableMarketKeys.length));
      setSelectedMarkets((prev) => {
        const same = prev.length === nextMarkets.length && prev.every((k, i) => k === nextMarkets[i]);
        return same ? prev : nextMarkets;
      });
    } catch (e) {
      setAvailability(null);
      setError(e instanceof Error ? e.message : 'Failed to check availability');
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  // Risk-first: when risk (or config) changes, reload which markets have odds in that band.
  useEffect(() => {
    if (!config) return;
    void loadAvailability(riskLevel, selectedMarketsRef.current);
  }, [config, riskLevel, loadAvailability]);

  // When the user toggles markets, refresh selectedFixtureCount (debounced).
  useEffect(() => {
    if (!config || !availability) return;
    if (availability.riskLevel !== riskLevel) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ riskLevel });
          if (selectedMarkets.length) params.set('markets', selectedMarkets.join(','));
          const res = await fetch(`${getApiUrl()}/acca-generator/availability?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as Availability;
          if (!cancelled) {
            setAvailability((prev) =>
              prev
                ? {
                    ...prev,
                    selectedFixtureCount: data.selectedFixtureCount,
                    asOf: data.asOf,
                  }
                : data,
            );
          }
        } catch {
          /* keep last availability */
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // Only re-query when market selection changes (risk refresh handled above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarkets.join(',')]);

  const quotaLabel = useMemo(() => {
    const q = result?.quota || config?.quota;
    if (!q) return null;
    if (q.exempt || q.remaining === null) {
      return q.exempt ? 'Admin — unlimited generations' : `Used today: ${q.usedToday} (unlimited)`;
    }
    return `${q.remaining} of ${q.maxPerDay} generations left today`;
  }, [config, result]);

  const riskProfiles = config?.riskProfiles?.length ? config.riskProfiles : FALLBACK_RISK_PROFILES;
  const activeRisk = riskProfiles.find((p) => p.key === riskLevel) || riskProfiles[1];
  const combinedBand = activeRisk ? estimateCombinedBand(activeRisk, legs) : null;
  const overallExposure = overallExposureLabel(riskLevel, legs);

  const availableMarketOptions = useMemo<MarketOption[]>(() => {
    if (!availability?.markets?.length) return [];
    return availability.markets
      .filter((m) => m.available)
      .map((m) => ({ key: m.key, label: m.label, fixtureCount: m.fixtureCount }));
  }, [availability]);

  const maxSelectableLegs = useMemo(() => {
    const adminMax = config?.maxLegs ?? 8;
    const pool =
      selectedMarkets.length > 0
        ? availability?.selectedFixtureCount ?? 0
        : availability?.fixtureCount ?? 0;
    return Math.max(config?.minLegs ?? 2, Math.min(adminMax, pool || adminMax));
  }, [availability, config, selectedMarkets.length]);

  useEffect(() => {
    if (!config) return;
    setLegs((prev) => Math.min(maxSelectableLegs, Math.max(config.minLegs, prev)));
  }, [config, maxSelectableLegs]);

  const generatorAllowed =
    !!config?.enabled || !!config?.adminBypassDisabled || !!config?.quota?.exempt;

  const canGenerate =
    generatorAllowed &&
    selectedMarkets.length > 0 &&
    !availabilityLoading &&
    (availability?.selectedFixtureCount ?? 0) >= legs &&
    (availability?.selectedFixtureCount ?? 0) >= (config?.minLegs ?? 2);

  const onGenerate = async () => {
    setError(null);
    setSuccess(null);
    setGenerating(true);
    try {
      const res = await fetch(`${getApiUrl()}/acca-generator/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          markets: selectedMarkets,
          legs,
          riskLevel,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getApiErrorMessage(body, 'Generation failed'));
      const data = body as GenerateResult;
      setResult(data);
      setTitle(`Acca ${data.legs.length}-fold @ ${data.combinedOdds.toFixed(2)}`);
      if (config) setConfig({ ...config, quota: data.quota });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const onPublish = async () => {
    if (!result?.generationId) return;
    setError(null);
    setSuccess(null);
    setPublishing(true);
    try {
      const res = await fetch(`${getApiUrl()}/acca-generator/publish`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          generationId: result.generationId,
          title: title.trim() || undefined,
          description:
            'Generated with Acca Generator (free pick). Educational/informational only — not a sure bet. Gamble responsibly. 18+.',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getApiErrorMessage(body, 'Publish failed'));
      const ticketId = body?.ticket?.id || body?.publishedTicketId;
      setResult(null);
      setTitle('');
      setSuccess(
        ticketId
          ? `Free pick published (#${ticketId}). It stays on the marketplace until any leg kicks off — open marketplace soon to confirm.`
          : 'Free pick published. It stays on the marketplace until any leg kicks off.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  if (guest) {
    return <AccaGeneratorLanding />;
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="min-h-[calc(100vh-8rem)] bg-[var(--bg)] w-full">
          <div className="section-ux-dashboard-shell flex min-h-[40vh] items-center justify-center text-[var(--text-muted)]">
            Loading Acca Generator…
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-8rem)] bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <div className="lg:hidden -mx-1 mb-3">
            <NavBar
              title="Acca Generator"
              backHref="/create-pick"
              backLabel="Create pick"
              sticky={false}
            />
          </div>
          <div className="hidden lg:block">
            <PageHeader
              label="Tools"
              title="Acca Generator"
              tagline="Pick a risk band and fixture count, then markets with odds in that band. Same-day slips from synced odds — educational only, then optionally publish as a free marketplace pick."
            />
          </div>

          {quotaLabel && (
            <p className="mb-4 text-sm text-[var(--text-muted)]">{quotaLabel}</p>
          )}
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Same day only — today’s remaining kickoffs. Odds are live from our synced database (not a
            fresh bookmaker pull on each click).
          </p>

          <aside
            className="mb-5 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50"
            role="note"
            aria-label="Responsible betting disclaimer"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800/80 dark:text-amber-200/80">
              Educational &amp; informational · 18+
            </p>
            <p className="mt-1.5 leading-relaxed">
              Risk levels are only odd bands for building sample accumulators — they do{' '}
              <strong className="font-semibold">not</strong> mean a safer or surest bet. No tip,
              generator output, or free pick is guaranteed. BetRollover does not place bets for you;
              use this tool for learning and entertainment, never as financial advice.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-amber-900/85 dark:text-amber-100/85">
              Gamble only with money you can afford to lose.{' '}
              <Link
                href="/responsible-gambling"
                className="font-semibold underline underline-offset-2 hover:text-amber-950 dark:hover:text-white"
              >
                Responsible gambling
              </Link>
              {' · '}
              If betting stops being fun, stop and seek help.
            </p>
          </aside>

          {!config?.enabled && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {generatorAllowed
                ? 'Acca Generator is disabled for users. As an admin you can still generate and publish.'
                : 'Acca Generator is currently disabled by admin.'}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
              {success}{' '}
              <Link href="/marketplace" className="underline font-medium">
                View marketplace
              </Link>
              {' · '}
              <Link href="/my-picks" className="underline font-medium">
                My picks
              </Link>
            </div>
          )}

          <div className="mx-auto max-w-3xl">
      <section className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-800">Risk level</p>
          <p className="mt-1 text-xs text-slate-500">
            Sets the <span className="font-medium text-slate-600">per-leg</span> odd band only.
            Overall slip risk also rises with how many fixtures you select in step 3.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {riskProfiles.map((p) => {
              const on = riskLevel === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setRiskLevel(p.key);
                    setResult(null);
                  }}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    on
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900">{p.label}</span>
                  <span className="mt-1 block text-xs font-medium tabular-nums text-emerald-800">
                    {p.oddMin.toFixed(2)} – {p.oddMax.toFixed(2)}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-slate-500">{p.description}</span>
                </button>
              );
            })}
          </div>
          {activeRisk && (
            <p className="mt-2 text-xs text-slate-500">
              Target ~{activeRisk.targetOdd.toFixed(2)} per leg · {activeRisk.label} band
              {availability ? ` · ${availability.fixtureCount} fixtures in band today` : ''}
              {availabilityLoading ? ' · checking…' : ''}
            </p>
          )}
        </div>

        <div>
          <MarketMultiSelect
            options={availableMarketOptions}
            value={selectedMarkets}
            onChange={(next) => {
              setSelectedMarkets(next);
              setResult(null);
            }}
          />
          <p className="mt-2 text-xs text-slate-500">
            Markets with odds in your risk band
            {availability && selectedMarkets.length > 0
              ? ` · ${availability.selectedFixtureCount} fixture${
                  availability.selectedFixtureCount === 1 ? '' : 's'
                } for your selection`
              : ''}
            . Empty markets are hidden.
          </p>
          {!availabilityLoading && availability && availableMarketOptions.length === 0 && (
            <p className="mt-2 text-xs text-amber-700">
              No markets have odds in this risk band for today’s remaining kickoffs. Try another risk level.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm max-w-xs">
            <span className="font-medium text-slate-800">Number of fixtures</span>
            <input
              type="number"
              min={config?.minLegs ?? 2}
              max={maxSelectableLegs}
              value={legs}
              onChange={(e) => {
                setLegs(
                  Math.min(
                    maxSelectableLegs,
                    Math.max(config?.minLegs ?? 2, parseInt(e.target.value, 10) || (config?.minLegs ?? 2)),
                  ),
                );
                setResult(null);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Admin range: {config?.minLegs ?? 2}–{config?.maxLegs ?? 8}
              {availability && selectedMarkets.length > 0
                ? ` · capped at ${maxSelectableLegs} from available fixtures`
                : ''}
            </span>
          </label>
          <p className="mt-2 max-w-xl text-xs text-slate-500">
            More fixtures = higher overall risk, even on Sure/Safe — every leg must win for the acca
            to land.
          </p>
          {combinedBand && (
            <div className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-3.5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                Overall slip picture · {activeRisk?.label} × {legs}-fold
              </p>
              <p className="mt-1.5 text-sm font-semibold text-emerald-800">{overallExposure.label}</p>
              <p className="mt-1 text-sm leading-snug text-slate-700">{overallExposure.detail}</p>
              <p className="mt-3 text-sm tabular-nums text-slate-800">
                Illustrative combined odds near band prices:{' '}
                <span className="font-semibold">
                  ~{formatOdds(combinedBand.min)} – {formatOdds(combinedBand.max)}
                </span>
                <span className="text-slate-600"> · target ~{formatOdds(combinedBand.target)}</span>
              </p>
              <p className="mt-1.5 text-xs text-slate-600">
                Estimate only — actual slip odds depend on the selections generated.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={generating || !canGenerate}
          onClick={() => void onGenerate()}
          className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {generating ? 'Generating…' : 'Generate accumulator'}
        </button>
        {!canGenerate && generatorAllowed && !availabilityLoading && (
          <p className="text-center text-xs text-slate-500">
            {selectedMarkets.length === 0
              ? 'Select at least one market with fixtures in this risk band.'
              : (availability?.selectedFixtureCount ?? 0) < (config?.minLegs ?? 2)
                ? 'Not enough fixtures in the selected markets for this risk band.'
                : (availability?.selectedFixtureCount ?? 0) < legs
                  ? 'Lower the number of fixtures or add markets.'
                  : 'Adjust risk, markets, or legs to generate.'}
          </p>
        )}
        <p className="text-center text-[11px] leading-relaxed text-slate-400">
          Generated slips are educational samples, not tips or guarantees.{' '}
          <Link href="/responsible-gambling" className="underline underline-offset-2 hover:text-slate-600">
            Bet responsibly
          </Link>
          .
        </p>
      </section>

      {result && (
        <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Suggested slip</h2>
              <p className="text-xs text-slate-500 mt-1">
                Combined odds <strong className="text-slate-800">{Number(result.combinedOdds).toFixed(2)}</strong>
                {' · '}
                {result.legs.length} legs
                {result.riskLevel ? ` · ${result.riskLevel} risk` : ''}
                {' · '}
                legs {Number(result.oddMin).toFixed(2)}–{Number(result.oddMax).toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onGenerate()}
              disabled={generating || !canGenerate}
              className="text-xs font-medium text-emerald-700 hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              Regenerate
            </button>
          </div>

          <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {result.legs.map((leg) => (
              <li key={`${leg.fixtureId}-${leg.outcomeKey}`} className="px-4 py-3 bg-slate-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{leg.matchDescription}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {leg.leagueName || 'Football'} ·{' '}
                      {new Date(leg.matchDate).toLocaleString(undefined, {
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-emerald-800 mt-1">{leg.prediction}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{Number(leg.odds).toFixed(2)}</p>
                    <p className="text-[11px] text-slate-400">{Math.round(leg.probability * 100)}% implied</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">Title for free pick</span>
            <input
              type="text"
              value={title}
              maxLength={255}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <button
            type="button"
            disabled={publishing}
            onClick={() => void onPublish()}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            {publishing ? 'Publishing…' : 'Publish as free pick'}
          </button>
          <p className="text-xs text-[var(--text-muted)] text-center">
            Publishes under your account at price 0. Marketplace only shows picks while every leg is still upcoming
            (we require ~45 minutes to kickoff). Free picks remain informational — not a sure bet. Subject to your
            daily tipster pick limit if set.
          </p>
        </section>
      )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
