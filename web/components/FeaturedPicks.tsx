'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PickCard } from '@/components/PickCard';
import { getPickCardSocialProps, mergeSocialCountsIntoList } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
import { getApiUrl } from '@/lib/site-config';
import { useT } from '@/context/LanguageContext';
import { buttonClassName } from '@/components/ui/Button';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
}

interface Tipster {
  id: number;
  displayName: string;
  username: string;
  isAi?: boolean;
  winRate: number;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  rank: number | null;
  avatarUrl?: string | null;
}

interface Accumulator {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  status?: string;
  result?: string;
  picks?: Pick[];
  tipster?: Tipster | null;
  createdAt?: string;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  bookingCodeCopyCount?: number;
  reactionCount?: number;
  hasReacted?: boolean;
  commentCount?: number;
}

export function FeaturedPicks({
  initialFeatured = [],
}: {
  initialFeatured?: Record<string, unknown>[];
}) {
  const t = useT();
  const [picks, setPicks] = useState<Accumulator[]>(
    Array.isArray(initialFeatured) ? (initialFeatured as unknown as Accumulator[]) : [],
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${getApiUrl()}/accumulators/featured`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPicks(Array.isArray(data) ? data : []))
      .catch(() => {
        if (initialFeatured.length === 0) setPicks([]);
      });
  }, [initialFeatured.length]);

  if (picks.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-[var(--card)] border-y border-[var(--border)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/5 to-transparent pointer-events-none" />
      <div className="relative section-ux-gutter">
        <div className="text-center mb-8">
          <h2 className="text-base md:text-lg font-semibold text-[var(--text)]">{t('marketplace.featured_section_title')}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t('marketplace.featured_section_subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {picks.map((a) => (
            <PickCard
              key={a.id}
              id={a.id}
              title={a.title}
              totalPicks={a.totalPicks}
              totalOdds={a.totalOdds}
              price={a.price}
              status={a.status}
              result={a.result}
              picks={a.picks || []}
              tipster={a.tipster}
              createdAt={a.createdAt}
              bookmakerKey={a.bookmakerKey}
              bookingCode={a.bookingCode}
              bookingCodeCopyCount={a.bookingCodeCopyCount ?? 0}
              viewOnly={true}
              detailsHref="/marketplace"
              onPurchase={() => { }}
              purchasing={false}
              {...getPickCardSocialProps(a, {
                onCountsChange: (id, counts) =>
                  setPicks((prev) => mergeSocialCountsIntoList(prev, id, counts)),
                loginRedirectPath: currentLoginRedirectPath('/'),
              })}
            />
          ))}
        </div>
        <div className="text-center mt-6">
          <Link
            href="/marketplace"
            className={buttonClassName({ className: 'inline-block' })}
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    </section>
  );
}
