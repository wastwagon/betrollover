'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface CouponFixture {
  home: string;
  away: string;
  league: string;
  market: string;
  tip: string;
  confidence: number;
  odds: number;
}

interface SmartCoupon {
  id: number;
  date: string;
  totalOdds: number;
  status: string;
  fixtures: CouponFixture[];
}

export function HighValueCoupons() {
  const [coupons, setCoupons] = useState<SmartCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/coupons/high-value?limit=6`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCoupons(Array.isArray(data) ? data : []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-20 md:py-28 bg-[var(--bg)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">High-Value Coupons</h2>
            <p className="mt-3 text-[var(--text-muted)]">Smart Double Chance strategy — 85%+ win rate</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-[var(--card)] border border-[var(--border)]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (coupons.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-[var(--bg)] border-y border-[var(--border)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--primary)]/5 to-transparent pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">High-Value Coupons</h2>
          <p className="mt-3 text-[var(--text-muted)]">
            Smart Double Chance strategy — validated 85%+ win rate, global competitions
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((c) => (
            <Link
              key={c.id}
              href="/coupons/archive"
              className="block p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-xl hover:shadow-[var(--primary)]/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-[var(--primary)]">
                  {new Date(c.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span className="text-lg font-bold text-[var(--text)]">{Number(c.totalOdds).toFixed(2)}</span>
              </div>
              <div className="space-y-3">
                {(c.fixtures || []).map((f, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-[var(--text)]">
                      {f.home} v {f.away}
                    </p>
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">{f.league}</p>
                    <p className="text-[var(--primary)] font-medium mt-1">{f.tip}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-between text-xs text-[var(--text-muted)]">
                <span>2 picks</span>
                <span>Odds: 1.60–2.00</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/coupons/archive"
            className="inline-block px-8 py-3.5 rounded-2xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
          >
            View Archive & Stats
          </Link>
        </div>
      </div>
    </section>
  );
}
