'use client';

import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { AppFooter } from '@/components/AppFooter';
import { PickCard } from '@/components/PickCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';

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
  matchDate?: string;
  homeScore?: number;
  awayScore?: number;
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

interface ArchiveStats {
  total: number;
  won: number;
  lost: number;
  roi: number;
}

export default function SmartCouponsPage() {
  const [activeCoupons, setActiveCoupons] = useState<SmartCoupon[]>([]);
  const [archiveCoupons, setArchiveCoupons] = useState<SmartCoupon[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'archive'>('active');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [activeRes, archiveRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/coupons/high-value?limit=20`),
          fetch(`${API_URL}/coupons/archive`),
          fetch(`${API_URL}/coupons/archive/stats`),
        ]);

        const activeData = activeRes.ok ? await activeRes.json() : [];
        const archiveData = archiveRes.ok ? await archiveRes.json() : [];
        const statsData = statsRes.ok ? await statsRes.json() : null;

        setActiveCoupons(activeData);
        setArchiveCoupons(archiveData);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch smart coupons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const aiTipsterProfile = {
    id: 999999,
    displayName: 'AI Prediction Engine',
    username: 'ai_smart_system',
    avatarUrl: '/avatars/ai-avatar.png', // Assuming this exists or falls back
    winRate: stats?.total ? (stats.won / stats.total) * 100 : 0,
    totalPicks: stats?.total || 0,
    wonPicks: stats?.won || 0,
    lostPicks: stats?.lost || 0,
    rank: 1,
  };

  const displayedCoupons = tab === 'active' ? activeCoupons : archiveCoupons;

  // AI Tipster Card Component within the page header
  const renderHeader = () => (
    <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-6 md:p-10 mb-10 text-white shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-medium mb-3 backdrop-blur-sm border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            AI Powered Analysis
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Smart Coupons</h1>
          <p className="text-blue-100 max-w-xl text-lg opacity-90">
            High-confidence Double Chance selections generated daily by our advanced prediction engine.
            Targeting 70%+ win probability.
          </p>

          {stats && (
            <div className="flex flex-wrap gap-4 mt-6 justify-center md:justify-start">
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
                <span className="block text-xs text-blue-200 uppercase tracking-wider">Win Rate</span>
                <span className="text-2xl font-bold text-emerald-300">
                  {stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
                <span className="block text-xs text-blue-200 uppercase tracking-wider">History</span>
                <span className="text-2xl font-bold text-white">
                  {stats.won}W - {stats.lost}L
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
                <span className="block text-xs text-blue-200 uppercase tracking-wider">ROI</span>
                <span className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {stats.roi.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Visual Decoration or AI Icon */}
        <div className="w-32 h-32 md:w-40 md:h-40 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/5 backdrop-blur-sm shadow-inner shrink-0">
          <span className="text-6xl md:text-7xl">🤖</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {renderHeader()}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-[var(--border)] pb-1">
          <button
            onClick={() => setTab('active')}
            className={`px-6 py-3 rounded-t-lg font-medium text-sm transition-all relative top-[1px] ${tab === 'active'
              ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--primary)]/5'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)]'
              }`}
          >
            Active Coupons ({activeCoupons.length})
          </button>
          <button
            onClick={() => setTab('archive')}
            className={`px-6 py-3 rounded-t-lg font-medium text-sm transition-all relative top-[1px] ${tab === 'archive'
              ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--primary)]/5'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)]'
              }`}
          >
            Past Results
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSkeleton count={6} variant="cards" />
        ) : displayedCoupons.length === 0 ? (
          <EmptyState
            title={tab === 'active' ? 'No active coupons' : 'No archive data'}
            description={
              tab === 'active'
                ? 'Check back later for new high-confidence predictions.'
                : 'Past results will appear here once coupons are settled.'
            }
            actionLabel={tab === 'active' ? 'Browse Marketplace' : 'View Today\'s Coupons'}
            actionHref={tab === 'active' ? '/marketplace' : undefined}
            onActionClick={tab === 'active' ? undefined : () => setTab('active')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedCoupons.map((coupon) => (
              <PickCard
                key={coupon.id}
                id={coupon.id}
                title={`Smart Acca ${new Date(coupon.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                totalPicks={coupon.fixtures.length}
                totalOdds={coupon.totalOdds}
                price={0} // Free
                status={coupon.status}
                result={coupon.status === 'pending' ? undefined : coupon.status}
                picks={coupon.fixtures.map((f) => ({
                  matchDescription: `${f.home} vs ${f.away}`,
                  prediction: f.tip, // e.g. "Home or Draw"
                  odds: f.odds,
                  // We don't have exact matchDate/scores in the Coupon fixture jsonb usually, 
                  // unless we enriched it. SmartCouponFixture interface has simplified structure.
                  // If your archive includes scores, map them here:
                  homeScore: f.homeScore,
                  awayScore: f.awayScore,
                }))}
                tipster={aiTipsterProfile}
                isPurchased={true} // Always show details for free coupons
                onPurchase={() => { }} // No-op for free
                viewOnly={true}
                detailsHref={`/predictions/${coupon.id}`}
                createdAt={coupon.createdAt}
              />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
