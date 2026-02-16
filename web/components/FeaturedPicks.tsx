'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface Pick {
  id: number;
  title: string;
  totalOdds: number;
  totalPicks: number;
  price: number;
}

export function FeaturedPicks() {
  const [picks, setPicks] = useState<Pick[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/accumulators/featured`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPicks(Array.isArray(data) ? data : []))
      .catch(() => setPicks([]));
  }, []);

  if (picks.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-[var(--card)] border-y border-[var(--border)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/5 to-transparent pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">Popular Picks Right Now</h2>
          <p className="mt-3 text-[var(--text-muted)]">Top picks from our verified tipsters</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {picks.map((p) => (
            <Link
              key={p.id}
              href="/marketplace"
              className="block p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-xl hover:shadow-[var(--primary)]/5 hover:-translate-y-1 transition-all duration-300"
            >
              <h3 className="font-semibold text-[var(--text)] line-clamp-2">{p.title}</h3>
              <div className="mt-3 flex justify-between text-sm text-[var(--text-muted)]">
                <span>{p.totalPicks} picks</span>
                <span>Odds: {Number(p.totalOdds).toFixed(2)}</span>
              </div>
              <p className="mt-2 font-medium text-[var(--primary)]">
                {p.price === 0 ? 'Free' : `GHS ${Number(p.price).toFixed(2)}`}
              </p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/register"
            className="inline-block px-8 py-3.5 rounded-2xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
          >
            Browse All Picks
          </Link>
        </div>
      </div>
    </section>
  );
}
