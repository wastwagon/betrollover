'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';
import { getPickCardSocialProps, mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
import { useT } from '@/context/LanguageContext';
import { isDiscoverySportAllowed } from '@/lib/football-only-discovery';
import {
  FREE_TIP_OF_THE_DAY_LIMIT,
  freeTipOfTheDayQuery,
  parseFreeTipItems,
} from '@/lib/free-tip-of-the-day';

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

function visibleFreeTips(items: FreeTip[]): FreeTip[] {
  return items.filter((item) => isDiscoverySportAllowed(item.sport)).slice(0, FREE_TIP_OF_THE_DAY_LIMIT);
}

export function HomeFreeTipOfTheDay({
  initialFreeTips = [],
}: {
  initialFreeTips?: Record<string, unknown>[];
}) {
  const t = useT();
  const seeded = visibleFreeTips(parseFreeTipItems<FreeTip>({ items: initialFreeTips }));
  const [tips, setTips] = useState<FreeTip[]>(seeded);
  const [loading, setLoading] = useState(seeded.length === 0);

  useEffect(() => {
    const api = getApiUrl();
    const token = localStorage.getItem('token');
    const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

    fetch(`${api}/accumulators/free-tip-of-the-day?${freeTipOfTheDayQuery()}`, { headers: auth })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        setTips(visibleFreeTips(parseFreeTipItems<FreeTip>(payload)));
      })
      .catch(() => {
        if (seeded.length === 0) setTips([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-12 md:py-16 border-t border-[var(--border)] bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="section-ux-gutter-wide w-full min-w-0">
          <h2 className="text-base font-semibold text-[var(--text)] mb-4 sm:mb-6 sm:text-lg md:text-xl">{t('home.free_tip')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 sm:h-44 rounded-2xl bg-[var(--card)] animate-pulse border border-[var(--border)]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (tips.length === 0) return null;

  return (
    <section className="py-12 md:py-16 border-t border-[var(--border)] bg-[var(--bg)] w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="section-ux-gutter-wide w-full min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="min-w-0">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 text-xs font-semibold mb-2">
              {t('home.free_tip_badge_free')}
            </span>
            <h2 className="text-base font-semibold text-[var(--text)] sm:text-lg md:text-xl">{t('home.free_tip')}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{t('home.free_tip_sub')}</p>
          </div>
          <Link
            href="/marketplace"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline shrink-0 w-fit"
          >
            {t('home.free_tip_browse_all')}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
          {tips.map((item) => (
            <PickCard
              key={item.id}
              id={item.id}
              title={item.title}
              sport={item.sport}
              totalPicks={item.totalPicks}
              totalOdds={item.totalOdds}
              price={0}
              picks={item.picks}
              tipster={
                item.tipster
                  ? {
                      ...item.tipster,
                      totalPicks: item.tipster.totalPicks ?? 0,
                      wonPicks: item.tipster.wonPicks ?? 0,
                      lostPicks: item.tipster.lostPicks ?? 0,
                    }
                  : null
              }
              viewOnly
              detailsHref={`/coupons/${item.id}`}
              onPurchase={() => {}}
              bookmakerKey={item.bookmakerKey}
              bookingCode={item.bookingCode}
              bookingCodeCopyCount={item.bookingCodeCopyCount ?? 0}
              {...getPickCardSocialProps(item, {
                onCountsChange: (pickId, counts) =>
                  setTips((prev) => mergeSocialCountsIntoList(prev, pickId, counts)),
                loginRedirectPath: currentLoginRedirectPath('/'),
              })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
