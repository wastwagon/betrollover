'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';
import { getPickCardSocialProps, mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
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
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  bookingCodeCopyCount?: number;
  reactionCount?: number;
  hasReacted?: boolean;
  commentCount?: number;
}

function parseFreeTip(data: unknown): FreeTip | null {
  if (!data || typeof data !== 'object' || !('id' in data)) return null;
  return data as FreeTip;
}

function parseMarketItems(data: unknown[]): FreeTip[] {
  return data.filter((item) => item && typeof item === 'object' && 'id' in item) as FreeTip[];
}

function buildVisibleTips(freeTip: FreeTip | null, marketItems: FreeTip[]): FreeTip[] {
  const combined = [freeTip, ...marketItems].filter(Boolean) as FreeTip[];
  const seen = new Set<number>();
  return combined.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function HomeFreeTipOfTheDay({
  initialFreeTip = null,
  initialMarketItems = [],
}: {
  initialFreeTip?: Record<string, unknown> | null;
  initialMarketItems?: Record<string, unknown>[];
}) {
  const t = useT();
  const router = useRouter();
  const seededFree = parseFreeTip(initialFreeTip);
  const seededMarket = parseMarketItems(initialMarketItems).filter((i) => i.price === 0);
  const seededVisible = buildVisibleTips(seededFree, seededMarket).slice(0, 4);

  const [tip, setTip] = useState<FreeTip | null>(seededFree);
  const [tips, setTips] = useState<FreeTip[]>(seededVisible);
  const [loading, setLoading] = useState(seededVisible.length === 0);
  const [purchasing, setPurchasing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);

  const applySocialCounts = (pickId: number, counts: import('@/components/pick-social/PickSocialBar').PickSocialCounts) => {
    setTips((prev) => mergeSocialCountsIntoList(prev, pickId, counts));
    setTip((prev) => (prev?.id === pickId ? { ...prev, ...counts } : prev));
  };

  useEffect(() => {
    const api = getApiUrl();
    const token = localStorage.getItem('token');
    const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

    Promise.all([
      fetch(`${api}/accumulators/free-tip-of-the-day`, { headers: auth }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${api}/accumulators/marketplace/public?limit=12&priceFilter=free`, { headers: auth }).then((r) =>
        r.ok ? r.json() : { items: [] },
      ),
      fetch(`${api}/accumulators/marketplace/public?limit=12`, { headers: auth }).then((r) =>
        r.ok ? r.json() : { items: [] },
      ),
    ])
      .then(([featured, market, anyMarket]) => {
        const marketItems = Array.isArray((market as { items?: unknown[] })?.items)
          ? ((market as { items?: FreeTip[] }).items ?? [])
          : [];
        const anyItems = Array.isArray((anyMarket as { items?: unknown[] })?.items)
          ? ((anyMarket as { items?: FreeTip[] }).items ?? [])
          : [];
        const featuredTip = parseFreeTip(featured);
        const uniqueVisible = buildVisibleTips(featuredTip, [...marketItems, ...anyItems]).slice(0, 4);
        setTip(featuredTip);
        setTips(uniqueVisible);
      })
      .catch(() => {
        if (seededVisible.length === 0) {
          setTip(null);
          setTips([]);
        }
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
        const { hapticSuccess } = await import('@/lib/haptic');
        hapticSuccess();
      }
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
              bookmakerKey={item.bookmakerKey}
              bookingCode={item.bookingCode}
              bookingCodeCopyCount={item.bookingCodeCopyCount ?? 0}
              {...getPickCardSocialProps(item, {
                onCountsChange: applySocialCounts,
                loginRedirectPath: currentLoginRedirectPath('/'),
              })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
