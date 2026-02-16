'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PickCard } from '@/components/PickCard';
import { getApiUrl } from '@/lib/site-config';

interface Pick {
  id?: number;
  matchDescription?: string;
  prediction?: string;
  odds?: number;
}

interface Accumulator {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
  picks?: Pick[];
}

export function FeaturedPicks() {
  const [picks, setPicks] = useState<Accumulator[]>([]);

  useEffect(() => {
    fetch(`${getApiUrl()}/accumulators/featured`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPicks(Array.isArray(data) ? data : []))
      .catch(() => setPicks([]));
  }, []);

  if (picks.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-[var(--card)] border-y border-[var(--border)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/5 to-transparent pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text)]">Marketplace Coupons</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Browse and purchase from verified tipsters</p>
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
              picks={a.picks || []}
              viewOnly={true}
              detailsHref="/marketplace"
              onPurchase={() => {}}
              purchasing={false}
            />
          ))}
        </div>
        <div className="text-center mt-6">
          <Link
            href="/marketplace"
            className="inline-block px-6 py-2.5 rounded-xl font-semibold text-sm bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    </section>
  );
}
