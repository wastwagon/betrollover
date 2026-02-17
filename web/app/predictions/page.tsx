'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  matchStatus?: string;
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

function SmartCouponsContent() {
  /* eslint-disable-next-line react-hooks/rules-of-hooks */
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams?.get('tab') === 'archive') ? 'archive' : (searchParams?.get('tab') === 'upcoming' ? 'upcoming' : 'active');

  // Use a single state for all active/pending coupons, then filter
  const [allActiveCoupons, setAllActiveCoupons] = useState<SmartCoupon[]>([]);
  const [archiveCoupons, setArchiveCoupons] = useState<SmartCoupon[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'upcoming' | 'archive'>(initialTab as any);

  const handleTabChange = (newTab: 'active' | 'upcoming' | 'archive') => {
    setTab(newTab);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', newTab);
    router.replace(`/predictions?${newParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab as any);
    }
  }, [initialTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [activeRes, archiveRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/coupons/high-value?limit=20`), // Fetches all pending/active
          fetch(`${API_URL}/coupons/archive`),
          fetch(`${API_URL}/coupons/archive/stats`),
        ]);

        const activeData = activeRes.ok ? await activeRes.json() : [];
        const archiveData = archiveRes.ok ? await archiveRes.json() : [];
        const statsData = statsRes.ok ? await statsRes.json() : null;

        setAllActiveCoupons(Array.isArray(activeData) ? activeData : []);
        setArchiveCoupons(Array.isArray(archiveData) ? archiveData : []);
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
    avatarUrl: '/avatars/ai-avatar.png',
    winRate: stats?.total ? (stats.won / stats.total) * 100 : 0,
    totalPicks: stats?.total || 0,
    wonPicks: stats?.won || 0,
    lostPicks: stats?.lost || 0,
    rank: 1,
  };

  // Filter coupons based on date for Active vs Upcoming
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const activeCoupons = allActiveCoupons.filter(c => c.date <= today).sort((a, b) => a.totalOdds - b.totalOdds);
  const upcomingCoupons = allActiveCoupons.filter(c => c.date > today).sort((a, b) => a.date.localeCompare(b.date));

  let displayedCoupons: SmartCoupon[] = [];
  if (tab === 'active') displayedCoupons = activeCoupons;
  else if (tab === 'upcoming') displayedCoupons = upcomingCoupons;
  else displayedCoupons = archiveCoupons;

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
        <div className="flex items-center gap-2 mb-8 border-b border-[var(--border)] pb-1 overflow-x-auto">
          <button
            onClick={() => handleTabChange('active')}
            className={`px-6 py-3 rounded-t-lg font-medium text-sm transition-all relative top-[1px] whitespace-nowrap ${tab === 'active'
              ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--primary)]/5'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)]'
              }`}
          >
            Active Today ({activeCoupons.length})
          </button>
          <button
            onClick={() => handleTabChange('upcoming')}
            className={`px-6 py-3 rounded-t-lg font-medium text-sm transition-all relative top-[1px] whitespace-nowrap ${tab === 'upcoming'
              ? 'text-[var(--primary)] border-b-2 border-[var(--primary)] bg-[var(--primary)]/5'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)]'
              }`}
          >
            Upcoming ({upcomingCoupons.length})
          </button>
          <button
            onClick={() => handleTabChange('archive')}
            className={`px-6 py-3 rounded-t-lg font-medium text-sm transition-all relative top-[1px] whitespace-nowrap ${tab === 'archive'
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
            title={
              tab === 'active' ? 'No active coupons today' :
                tab === 'upcoming' ? 'No upcoming coupons' :
                  'No archive data'
            }
            description={
              tab === 'active'
                ? 'Check "Upcoming" for future predictions or browse the marketplace.'
                : tab === 'upcoming'
                  ? 'Check back later for new high-confidence predictions.'
                  : 'Past results will appear here once coupons are settled.'
            }
            actionLabel={tab === 'active' ? 'View Upcoming' : (tab === 'upcoming' ? 'Browse Marketplace' : 'View Today\'s Coupons')}
            actionHref={tab === 'active' ? undefined : (tab === 'upcoming' ? '/marketplace' : undefined)}
            onActionClick={tab === 'active' ? () => handleTabChange('upcoming') : (tab === 'upcoming' ? undefined : () => handleTabChange('active'))}
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
                  fixtureStatus: f.matchStatus,
                  status: f.status,
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

export default function SmartCouponsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={6} variant="cards" />}>
      <SmartCouponsContent />
    </Suspense>
  );
}
