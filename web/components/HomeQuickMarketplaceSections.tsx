'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string;
}

interface Tipster {
  id?: number;
  displayName: string;
  username: string;
  winRate: number;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  rank: number | null;
  avatarUrl?: string | null;
}

interface MarketplaceCardItem {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  purchaseCount?: number;
  sport?: string;
  status?: string;
  result?: string;
  picks?: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
}

function parseMarketplacePayload(data: unknown): MarketplaceCardItem[] {
  const items = (data as { items?: unknown })?.items;
  return Array.isArray(items) ? (items as MarketplaceCardItem[]) : [];
}

function leaderboardUsernameSet(data: unknown): Set<string> {
  const raw = (data as { leaderboard?: unknown[] })?.leaderboard;
  if (!Array.isArray(raw)) return new Set();
  const names = new Set<string>();
  for (const row of raw) {
    const u = (row as { username?: string })?.username?.trim().toLowerCase();
    if (u) names.add(u);
  }
  return names;
}

/** Prefer picks from all-time leaderboard tipsters; fill with newest listings if needed. */
function pickEliteShowcase(all: MarketplaceCardItem[], eliteNames: Set<string>, max = 6): MarketplaceCardItem[] {
  const seen = new Set<number>();
  const out: MarketplaceCardItem[] = [];
  for (const a of all) {
    const u = a.tipster?.username?.trim().toLowerCase();
    if (u && eliteNames.has(u) && !seen.has(a.id)) {
      seen.add(a.id);
      out.push(a);
      if (out.length >= max) return out;
    }
  }
  for (const a of all) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      out.push(a);
      if (out.length >= max) return out;
    }
  }
  return out;
}

export function HomeQuickMarketplaceSections() {
  const t = useT();
  const [elite, setElite] = useState<MarketplaceCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const api = getApiUrl();
    (async () => {
      try {
        const [lbRes, allRes] = await Promise.all([
          fetch(`${api}/leaderboard?period=all_time&limit=24`),
          fetch(`${api}/accumulators/marketplace/public?limit=48`),
        ]);
        const lbJson = lbRes.ok ? await lbRes.json() : {};
        const allJson = allRes.ok ? await allRes.json() : {};
        if (cancelled) return;
        const eliteNames = leaderboardUsernameSet(lbJson);
        const allItems = parseMarketplacePayload(allJson);
        setElite(pickEliteShowcase(allItems, eliteNames, 8));
      } catch {
        if (!cancelled) {
          setElite([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const skeleton = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-40 sm:h-44 rounded-2xl bg-[var(--card)] animate-pulse border border-[var(--border)]" />
      ))}
    </div>
  );

  const renderCards = (items: MarketplaceCardItem[]) =>
    items.map((a) => (
      <PickCard
        key={a.id}
        id={a.id}
        title={a.title}
        totalPicks={a.totalPicks}
        totalOdds={a.totalOdds}
        price={a.price}
        purchaseCount={a.purchaseCount}
        sport={a.sport}
        status={a.status}
        result={a.result}
        picks={a.picks || []}
        tipster={a.tipster ?? null}
        createdAt={a.createdAt}
        viewOnly
        detailsHref={`/coupons/${a.id}`}
        onPurchase={() => {}}
        purchasing={false}
      />
    ));

  return (
    <>
      <section className="py-12 md:py-16 border-t border-[var(--border)] bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="section-ux-gutter-wide w-full min-w-0">
          <div className="text-center mb-6 sm:mb-8 max-w-2xl mx-auto px-1">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-2">
              {t('home.marketplace_active_badge')}
            </span>
            <h2 className="text-lg font-bold text-[var(--text)] sm:text-xl md:text-2xl">{t('home.marketplace_active_title')}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{t('home.marketplace_active_sub')}</p>
          </div>
          {loading ? (
            skeleton
          ) : elite.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">{renderCards(elite)}</div>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-8 text-sm">{t('common.no_results')}</p>
          )}
          <div className="text-center mt-6">
            <Link
              href="/tipsters"
              className="inline-flex items-center justify-center text-sm font-semibold text-[var(--primary)] hover:underline min-h-[44px] sm:min-h-0"
            >
              {t('home.marketplace_active_cta')} →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
