'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';

const SPORT_META: Record<string, { label: string; emoji: string }> = {
  football:          { label: 'Football',          emoji: '⚽' },
  basketball:        { label: 'Basketball',         emoji: '🏀' },
  rugby:             { label: 'Rugby',              emoji: '🏉' },
  mma:               { label: 'MMA',               emoji: '🥊' },
  volleyball:        { label: 'Volleyball',         emoji: '🏐' },
  hockey:            { label: 'Hockey',             emoji: '🏒' },
  american_football: { label: 'American Football',  emoji: '🏈' },
  tennis:            { label: 'Tennis',             emoji: '🎾' },
};

interface Pick {
  id: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
  matchDate?: string;
}

interface Tipster {
  id: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  isAi?: boolean;
  winRate: number;
  roi?: number;
  totalPicks?: number;
  wonPicks?: number;
  lostPicks?: number;
  rank: number | null;
}

interface FreeTip {
  id: number;
  title: string;
  sport?: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  picks: Pick[];
  tipster?: Tipster | null;
}

export function HomeFreeTipOfTheDay() {
  const t = useT();
  const router = useRouter();
  const [tip, setTip] = useState<FreeTip | null>(null);
  const [tips, setTips] = useState<FreeTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${getApiUrl()}/accumulators/free-tip-of-the-day`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${getApiUrl()}/accumulators/marketplace/public?limit=12&priceFilter=free`).then((r) => (r.ok ? r.json() : { items: [] })),
      fetch(`${getApiUrl()}/accumulators/marketplace/public?limit=12`).then((r) => (r.ok ? r.json() : { items: [] })),
    ])
      .then(([featured, market, anyMarket]) => {
        const marketItems = Array.isArray((market as { items?: unknown[] })?.items)
          ? ((market as { items?: FreeTip[] }).items ?? [])
          : [];
        const anyItems = Array.isArray((anyMarket as { items?: unknown[] })?.items)
          ? ((anyMarket as { items?: FreeTip[] }).items ?? [])
          : [];
        const combined = [featured, ...marketItems, ...anyItems].filter(Boolean) as FreeTip[];
        const seen = new Set<number>();
        const uniqueVisible = combined.filter((item) => {
          if (!item?.id || seen.has(item.id)) return false;
          seen.add(item.id);
          // Safety net: negative-ROI AI must never show in this homepage section.
          return !(item.tipster?.isAi && Number(item.tipster.roi ?? 0) < 0);
        });
        setTip(featured as FreeTip | null);
        setTips(uniqueVisible.slice(0, 4));
      })
      .catch(() => {
        setTip(null);
        setTips([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/#free-tip-of-the-day');
      return;
    }
    if (!tip?.id) return;
    setPurchasing(true);
    try {
      const res = await fetch(`${getApiUrl()}/accumulators/${tip.id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsPurchased(true);
      } else {
        router.push(`/marketplace?highlight=${tip.id}`);
      }
    } catch {
      router.push(`/marketplace?highlight=${tip.id}`);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12 md:py-16 border-t border-[var(--border)] bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="section-ux-gutter-wide w-full min-w-0">
          <h2 className="text-base font-semibold text-[var(--text)] mb-4 sm:mb-6 sm:text-lg md:text-xl">{t('home.free_tip')}</h2>
          <div className="max-w-md h-64 rounded-2xl bg-[var(--card)] animate-pulse" />
        </div>
      </section>
    );
  }

  if (!tip && tips.length === 0) {
    return null;
  }

  const primary = tip ?? tips[0];
  const sportKey = primary?.sport?.toLowerCase() ?? 'football';
  const sportMeta = SPORT_META[sportKey] ?? SPORT_META['football'];

  return (
    <section className="py-12 md:py-16 border-t border-[var(--border)] bg-gradient-to-br from-amber-50/50 dark:from-amber-950/20 to-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="section-ux-gutter-wide w-full min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 text-xs font-semibold">
                {t('home.free_tip_badge_free')}
              </span>
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold">
                {sportMeta.emoji} {sportMeta.label}
              </span>
            </div>
            <h2 className="text-base font-semibold text-[var(--text)] sm:text-lg md:text-xl">{t('home.free_tip')}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {t('home.free_tip_attribution', {
                name: primary?.tipster?.displayName ?? t('home.free_tip_expert_fallback'),
              })}
            </p>
          </div>
          <Link
            href="/marketplace"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline shrink-0 w-fit"
          >
            {t('home.free_tip_browse_all')}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
          {(tips.length > 0 ? tips : (primary ? [primary] : [])).map((item) => (
            <PickCard
              key={item.id}
              id={item.id}
              title={item.title}
              sport={item.sport}
              totalPicks={item.totalPicks}
              totalOdds={item.totalOdds}
              price={0}
              picks={item.picks}
              tipster={item.tipster ? { ...item.tipster, totalPicks: item.tipster.totalPicks ?? 0, wonPicks: item.tipster.wonPicks ?? 0, lostPicks: item.tipster.lostPicks ?? 0 } : null}
              isPurchased={isPurchased && item.id === tip?.id}
              canPurchase={!(isPurchased && item.id === tip?.id)}
              onPurchase={item.id === tip?.id ? handlePurchase : () => router.push(`/coupons/${item.id}`)}
              purchasing={purchasing && item.id === tip?.id}
              viewOnly={item.id !== tip?.id}
              detailsHref={item.id !== tip?.id ? `/coupons/${item.id}` : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
