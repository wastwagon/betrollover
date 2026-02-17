'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

interface SmartCouponFixture {
  fixtureId: number;
  home: string;
  away: string;
  league: string;
  market: string;
  tip: string;
  odds: number;
  status?: string;
  matchStatus?: string;
  matchDate?: string;
  homeScore?: number | null;
  awayScore?: number | null;
}

interface SmartCoupon {
  id: number;
  date: string;
  totalOdds: number;
  status: 'pending' | 'won' | 'lost';
  profit: number;
  fixtures: SmartCouponFixture[];
  createdAt: string;
}

export default function PredictionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [coupon, setCoupon] = useState<SmartCoupon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/coupons/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setCoupon)
      .catch((err) => {
        console.error(err);
        setCoupon(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const aiTipsterProfile = {
    id: 999999,
    displayName: 'AI Prediction Engine',
    username: 'ai_smart_system',
    avatarUrl: '/avatars/ai-avatar.png',
    winRate: 75.0, // Hardcoded for single view or fetch stats if needed
    totalPicks: 100,
    wonPicks: 75,
    lostPicks: 25,
    rank: 1,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SiteHeader />
        <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <LoadingSkeleton count={1} variant="cards" />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <SiteHeader />
        <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <EmptyState
            title="Coupon Not Found"
            description="The requested smart coupon could not be found or has been removed."
            actionLabel="View All Coupons"
            actionHref="/predictions"
          />
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-6">
          <Link href="/predictions" className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors inline-flex items-center gap-1">
            ← Back to Smart Coupons
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-2">Smart Coupon Details</h1>
        <p className="text-[var(--text-muted)] mb-8">
          Detailed analysis for {new Date(coupon.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="max-w-2xl">
          <PickCard
            id={coupon.id}
            title={`Smart Acca ${new Date(coupon.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
            totalPicks={coupon.fixtures.length}
            totalOdds={coupon.totalOdds}
            price={0} // Free
            status={coupon.status}
            result={coupon.status === 'pending' ? undefined : coupon.status}
            picks={coupon.fixtures.map((f) => ({
              matchDescription: `${f.home} vs ${f.away}`,
              prediction: f.tip,
              odds: f.odds,
              matchDate: f.matchDate,
              homeScore: f.homeScore ?? undefined,
              awayScore: f.awayScore ?? undefined,
              fixtureStatus: f.matchStatus,
              status: f.status
            }))}
            tipster={aiTipsterProfile}
            isPurchased={true}
            onPurchase={() => { }}
            viewOnly={true}
            // detailsHref undefined => PickCard handles 'View Details' by opening modal, 
            // but we are already on the details page. 
            // To avoid nested modal or loop, we can hide the button or just show content.
            // PickCard logic: if isPurchased=true, it shows full content inline.
            createdAt={coupon.createdAt}
            className="border-2 border-[var(--primary)]/10 shadow-2xl"
          />
        </div>

        <div className="mt-12 bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">Why this coupon?</h3>
          <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
            This coupon was generated by our AI Prediction Engine using Double Chance markers.
            The system analyzes team form, head-to-head history, and market movement to identify
            high-probability safety nets (Win or Draw) for favorites playing at home or strong teams away.
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
