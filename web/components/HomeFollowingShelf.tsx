'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';
import { getPickCardSocialProps, mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
import { useT } from '@/context/LanguageContext';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';
import { buttonClassName } from '@/components/ui/Button';

type FeedItem = {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  purchaseCount?: number;
  sport?: string;
  status?: string;
  result?: string;
  picks?: unknown[];
  tipster?: {
    displayName: string;
    username: string;
    winRate: number;
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    rank: number | null;
    avatarUrl?: string | null;
    isAi?: boolean;
    isVerified?: boolean;
  } | null;
  createdAt?: string;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  bookingCodeCopyCount?: number;
  reactionCount?: number;
  hasReacted?: boolean;
  commentCount?: number;
  picksRevealed?: boolean;
};

/**
 * Logged-in home shelf: latest marketplace picks from tipsters you follow.
 */
export function HomeFollowingShelf() {
  const t = useT();
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => setAuthed(!!localStorage.getItem('token'));
    sync();
    window.addEventListener(AUTH_STORAGE_SYNC, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_STORAGE_SYNC, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!authed) {
      setLoading(false);
      setItems([]);
      setFollowingCount(0);
      return;
    }
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    Promise.all([
      fetch(`${getApiUrl()}/tipsters/feed?limit=8`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${getApiUrl()}/tipsters/me/following`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([feed, following]) => {
        if (cancelled) return;
        setItems(Array.isArray(feed) ? (feed as FeedItem[]) : []);
        setFollowingCount(Array.isArray(following) ? following.length : 0);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setFollowingCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  if (!authed) return null;
  if (!loading && followingCount === 0 && items.length === 0) {
    return (
      <section className="pt-4 pb-8 sm:pb-10 w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="section-ux-gutter-wide w-full min-w-0">
          <div className="rounded-2xl border border-[var(--separator)] bg-[var(--card)] px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--text)]">{t('home.following_shelf_title')}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('home.following_shelf_empty_follows')}</p>
            </div>
            <Link
              href="/tipsters"
              className={buttonClassName({ size: 'sm', className: 'shrink-0' })}
            >
              {t('home.following_shelf_find_tipsters')}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-4 pb-8 sm:pb-10 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="section-ux-gutter-wide w-full min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4 sm:mb-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)] mb-1">
              {t('nav.tipsters')}
            </p>
            <h2 className="text-xl font-bold text-[var(--text)] sm:text-2xl tracking-tight">
              {t('home.following_shelf_title')}
            </h2>
          </div>
          <Link
            href="/marketplace?sort=following-only"
            className="touch-target inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-sm font-semibold text-[var(--primary)] hover:border-[var(--primary)] transition-colors shrink-0 w-fit"
          >
            {t('home.following_shelf_see_all')} →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-40 rounded-2xl bg-[var(--card)] border border-[var(--separator)] animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4">
            {t('dashboard.no_new_picks')}{' '}
            <Link href="/tipsters" className="text-[var(--primary)] hover:underline">
              {t('dashboard.follow_more')}
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
            {items.map((a) => (
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
                picks={(a.picks as never[]) || []}
                tipster={a.tipster ?? null}
                createdAt={a.createdAt}
                bookmakerKey={a.bookmakerKey}
                bookingCode={a.bookingCode}
                bookingCodeCopyCount={a.bookingCodeCopyCount ?? 0}
                picksRevealed={a.picksRevealed === true}
                viewOnly
                detailsHref={`/coupons/${a.id}`}
                onPurchase={() => {}}
                purchasing={false}
                {...getPickCardSocialProps(a, {
                  onCountsChange: (id, counts) =>
                    setItems((prev) => mergeSocialCountsIntoList(prev, id, counts)),
                  loginRedirectPath: currentLoginRedirectPath('/'),
                })}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
