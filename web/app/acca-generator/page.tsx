'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AccaFamilyNav } from '@/components/AccaFamilyNav';
import { AccaGeneratorLanding } from '@/components/AccaGeneratorLanding';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getApiUrl } from '@/lib/site-config';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useT } from '@/context/LanguageContext';
import type { TranslationKey } from '@/lib/translations/en';

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

const RISK_DESC_KEYS: Record<AccaRiskKey, TranslationKey> = {
  sure: 'acca.risk_sure_desc',
  safe: 'acca.risk_safe_desc',
  medium: 'acca.risk_medium_desc',
  high: 'acca.risk_high_desc',
};

function isAccaRiskKey(v: string | undefined | null): v is AccaRiskKey {
  return !!v && (ACCA_RISK_KEYS as string[]).includes(v);
}

function formatOdds(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e6) return n.toExponential(2);
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
  t: (key: TranslationKey, vars?: Record<string, string>) => string,
): { label: string; detail: string } {
  const bandScore =
    riskKey === 'sure' ? 0.35 : riskKey === 'safe' ? 1 : riskKey === 'medium' ? 2 : 3;
  const score = bandScore + Math.max(0, fixtureCount - 2) * 0.55;
  if (score <= 2.2) {
    return {
      label: t('acca.exposure_lower'),
      detail: t('acca.exposure_lower_detail'),
    };
  }
  if (score <= 4) {
    return {
      label: t('acca.exposure_moderate'),
      detail: t('acca.exposure_moderate_detail'),
    };
  }
  return {
    label: t('acca.exposure_higher'),
    detail: t('acca.exposure_higher_detail'),
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
  const t = useT();
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
      ? t('acca.select_markets')
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : t('acca.markets_selected', { n: String(selectedLabels.length) });

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
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-[var(--card)] px-3.5 py-3 text-left transition ${
          open
            ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20'
            : 'border-[var(--border)] hover:border-[var(--primary)]/40'
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {t('acca.markets_label')}
          </span>
          <span
            className={`mt-0.5 block truncate text-sm font-medium ${
              selectedLabels.length ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {summary}
          </span>
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] transition ${
            open ? 'rotate-180 text-[var(--primary)]' : ''
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
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--separator)] bg-[var(--fill-secondary)] px-3 py-2">
            <p className="text-[11px] font-medium text-[var(--text-muted)]">
              {t('acca.selected_of', { n: String(value.length), total: String(options.length) })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
              >
                {t('acca.select_all')}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {t('common.clear')}
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
                      on ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'text-[var(--text)] hover:bg-[var(--fill-secondary)]'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        on
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                          : 'border-[var(--border)] bg-[var(--card)]'
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
                      <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-muted)]">
                        {t(
                          m.fixtureCount === 1 ? 'acca.fixture_count' : 'acca.fixture_count_plural',
                          { n: String(m.fixtureCount) },
                        )}
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
  const t = useT();
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
        throw new Error(getApiErrorMessage(body, t('acca.load_failed')));
      }
      const data = (await res.json()) as Config;
      setConfig(data);
      const preferred =
        data.defaults?.markets?.length ? data.defaults.markets : data.markets.slice(0, 4).map((m) => m.key);
      setSelectedMarkets(preferred);
      setLegs(Math.min(data.maxLegs, Math.max(data.minLegs, data.defaults?.legs ?? 4)));
      const rl = data.defaults?.riskLevel;
      setRiskLevel(isAccaRiskKey(rl) ? rl : 'safe');
      // Once per browser session — feeds Acca Gen funnel analytics
      try {
        if (!sessionStorage.getItem('br_acca_tool_open')) {
          sessionStorage.setItem('br_acca_tool_open', '1');
          void fetch(`${getApiUrl()}/acca-generator/track`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ eventType: 'tool_open' }),
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        /* private mode */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('acca.config_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        throw new Error(getApiErrorMessage(body, t('acca.availability_failed')));
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
      setError(e instanceof Error ? e.message : t('acca.availability_failed'));
    } finally {
      setAvailabilityLoading(false);
    }
  }, [t]);

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
      return q.exempt ? t('acca.quota_admin') : t('acca.quota_used_unlimited', { n: String(q.usedToday) });
    }
    return t('acca.quota_left', { remaining: String(q.remaining), max: String(q.maxPerDay) });
  }, [config, result, t]);

  const riskProfiles = config?.riskProfiles?.length ? config.riskProfiles : FALLBACK_RISK_PROFILES;
  const activeRisk = riskProfiles.find((p) => p.key === riskLevel) || riskProfiles[1];
  const combinedBand = activeRisk ? estimateCombinedBand(activeRisk, legs) : null;
  const overallExposure = overallExposureLabel(riskLevel, legs, t);

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
      if (!res.ok) throw new Error(getApiErrorMessage(body, t('acca.generate_failed')));
      const data = body as GenerateResult;
      setResult(data);
      setTitle(
        t('acca.default_title', {
          n: String(data.legs.length),
          odds: formatOdds(Number(data.combinedOdds)),
        }),
      );
      if (config) setConfig({ ...config, quota: data.quota });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('acca.generate_failed'));
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
          description: t('acca.publish_description'),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getApiErrorMessage(body, t('acca.publish_failed')));
      const ticketId = body?.ticket?.id || body?.publishedTicketId;
      setResult(null);
      setTitle('');
      setSuccess(
        ticketId
          ? t('acca.publish_success_id', { id: String(ticketId) })
          : t('acca.publish_success'),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('acca.publish_failed'));
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
            {t('acca.loading')}
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-8rem)] bg-[var(--bg)] w-full min-w-0 max-w-full">
        <div className="section-ux-dashboard-shell min-w-0 max-w-full">
          <PageHeader
            label={t('acca.landing_label')}
            title={t('nav.acca_generator')}
            tagline={t('acca.landing_disclaimer')}
          />
          <AccaFamilyNav current="build" />

          {quotaLabel && (
            <p className="mb-4 text-sm text-[var(--text-muted)]">{quotaLabel}</p>
          )}
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            {t('acca.same_day_note')}
          </p>

          <aside
            className="mb-5 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-light)] px-4 py-3.5 text-sm text-[var(--text)]"
            role="note"
            aria-label={t('acca.disclaimer_aria')}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
              {t('acca.landing_disclaimer_kicker')}
            </p>
            <p className="mt-1.5 leading-relaxed">{t('acca.tool_disclaimer')}</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              {t('acca.gamble_afford')}{' '}
              <Link
                href="/responsible-gambling"
                className="font-semibold underline underline-offset-2 text-[var(--text)] hover:text-[var(--primary)]"
              >
                {t('resp.page_label')}
              </Link>
              {' · '}
              {t('acca.if_not_fun')}
            </p>
          </aside>

          {!config?.enabled && (
            <div className="mb-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-3 text-sm text-[var(--text)]">
              {generatorAllowed
                ? t('acca.disabled_admin')
                : t('acca.disabled_users')}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-[var(--primary)]/25 bg-[var(--primary-light)] px-4 py-3 text-sm text-[var(--primary)]">
              {success}{' '}
              <Link href="/marketplace" className="underline font-medium">
                {t('acca.view_marketplace')}
              </Link>
              {' · '}
              <Link href="/my-picks" className="underline font-medium">
                {t('nav.my_picks')}
              </Link>
            </div>
          )}

          <div className="mx-auto max-w-3xl">
      <section className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">{t('acca.risk_level')}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {t('acca.risk_level_hint')}
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
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[var(--primary)]/20'
                      : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40'
                  }`}
                >
                  <span className="block text-sm font-semibold text-[var(--text)]">{p.label}</span>
                  <span className="mt-1 block text-xs font-medium tabular-nums text-[var(--primary)]">
                    {p.oddMin.toFixed(2)} – {p.oddMax.toFixed(2)}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-[var(--text-muted)]">
                    {isAccaRiskKey(p.key) ? t(RISK_DESC_KEYS[p.key]) : p.description}
                  </span>
                </button>
              );
            })}
          </div>
          {activeRisk && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {t('acca.risk_target', { odd: activeRisk.targetOdd.toFixed(2), label: activeRisk.label })}
              {availability
                ? ` · ${t('acca.fixtures_in_band', { n: String(availability.fixtureCount) })}`
                : ''}
              {availabilityLoading ? ` · ${t('acca.checking')}` : ''}
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
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {t('acca.markets_hint')}
            {availability && selectedMarkets.length > 0
              ? ` · ${t('acca.markets_fixtures', { n: String(availability.selectedFixtureCount) })}`
              : ''}
          </p>
          {!availabilityLoading && availability && availableMarketOptions.length === 0 && (
            <p className="mt-2 text-xs text-[var(--accent)]">
              {t('acca.markets_empty')}
            </p>
          )}
        </div>

        <div>
          <div className="max-w-xs">
            <Input
              id="acca-legs"
              label={t('acca.legs_label')}
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
              hint={[
                t('acca.legs_hint_range', {
                  min: String(config?.minLegs ?? 2),
                  max: String(config?.maxLegs ?? 8),
                }),
                availability && selectedMarkets.length > 0
                  ? t('acca.legs_hint_capped', { n: String(maxSelectableLegs) })
                  : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          </div>
          <p className="mt-2 max-w-xl text-xs text-[var(--text-muted)]">
            {t('acca.legs_more_risk')}
          </p>
          {combinedBand && (
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--fill-secondary)] px-4 py-3.5">
              <p className="text-sm font-semibold text-[var(--text)]">
                {t('acca.slip_picture', { label: activeRisk?.label ?? '', legs: String(legs) })}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--primary)]">{overallExposure.label}</p>
              <p className="mt-1 text-sm leading-snug text-[var(--text)]">{overallExposure.detail}</p>
              <p className="mt-3 text-sm tabular-nums text-[var(--text)]">
                {t('acca.combined_odds_near')}{' '}
                <span className="font-semibold">
                  ~{formatOdds(combinedBand.min)} – {formatOdds(combinedBand.max)}
                </span>
                <span className="text-[var(--text-muted)]">
                  {' '}
                  · {t('acca.combined_target', { odd: formatOdds(combinedBand.target) })}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">{t('acca.estimate_only')}</p>
            </div>
          )}
        </div>

        <Button
          type="button"
          disabled={generating || !canGenerate}
          onClick={() => void onGenerate()}
          fullWidth
        >
          {generating ? t('acca.generating') : t('acca.generate')}
        </Button>
        {!canGenerate && generatorAllowed && !availabilityLoading && (
          <p className="text-center text-xs text-[var(--text-muted)]">
            {selectedMarkets.length === 0
              ? t('acca.select_market')
              : (availability?.selectedFixtureCount ?? 0) < (config?.minLegs ?? 2)
                ? t('acca.not_enough_fixtures')
                : (availability?.selectedFixtureCount ?? 0) < legs
                  ? t('acca.lower_legs')
                  : t('acca.adjust_to_generate')}
          </p>
        )}
        <p className="text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
          {t('acca.samples_not_tips')}{' '}
          <Link href="/responsible-gambling" className="underline underline-offset-2 hover:text-[var(--text)]">
            {t('acca.bet_responsibly')}
          </Link>
          .
        </p>
      </section>

      {result && (
        <section className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">{t('acca.suggested_slip')}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {t('acca.combined_odds_line', { odds: formatOdds(Number(result.combinedOdds)) })}
                {' · '}
                {t('acca.legs_count', { n: String(result.legs.length) })}
                {result.riskLevel ? ` · ${t('acca.risk_suffix', { level: result.riskLevel })}` : ''}
                {' · '}
                {t('acca.legs_band', {
                  min: Number(result.oddMin).toFixed(2),
                  max: Number(result.oddMax).toFixed(2),
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onGenerate()}
              disabled={generating || !canGenerate}
              className="text-xs font-medium text-[var(--primary)] hover:underline disabled:text-[var(--text-muted)] disabled:no-underline"
            >
              {t('acca.regenerate')}
            </button>
          </div>

          <ul className="divide-y divide-[var(--separator)] border border-[var(--separator)] rounded-xl overflow-hidden">
            {result.legs.map((leg) => (
              <li key={`${leg.fixtureId}-${leg.outcomeKey}`} className="px-4 py-3 bg-[var(--fill-secondary)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{leg.matchDescription}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {leg.leagueName || t('create_pick.sport_football')} ·{' '}
                      {new Date(leg.matchDate).toLocaleString(undefined, {
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-[var(--primary)] mt-1">{leg.prediction}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{Number(leg.odds).toFixed(2)}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {t('acca.implied', { pct: String(Math.round(leg.probability * 100)) })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Input
            id="acca-title"
            label={t('acca.title_label')}
            type="text"
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Button
            type="button"
            disabled={publishing}
            onClick={() => void onPublish()}
            fullWidth
          >
            {publishing ? t('acca.publishing') : t('acca.publish_free')}
          </Button>
          <p className="text-xs text-[var(--text-muted)] text-center">
            {t('acca.publish_note')}
          </p>
        </section>
      )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
