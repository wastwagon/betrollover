'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getApiUrl } from '@/lib/site-config';

interface TimeSeriesData {
  users: { date: string; value: number }[];
  picks: { date: string; value: number }[];
  purchases: { date: string; value: number }[];
  revenue: { date: string; value: number }[];
  deposits: { date: string; amount: number; count: number }[];
  withdrawals: { date: string; amount: number; count: number }[];
}

interface ConversionFunnel {
  visitors: number;
  registered: number;
  contentCreators: number;
  marketplaceSellers: number;
  buyers: number;
  totalPicks: number;
  totalListings: number;
  totalPurchases: number;
  conversionRates: {
    registration: number;
    contentCreator: number;
    seller: number;
    buyer: number;
  };
}

interface UserBehavior {
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  avgPicksPerUser: number;
  avgPurchasesPerUser: number;
  topUsers: { userId: number; purchaseCount: number; totalSpent: number }[];
}

interface RevenueAnalytics {
  totalRevenue: number;
  avgOrderValue: number;
  topSellingPicks: { pickId: number; sales: number; revenue: number }[];
  revenueByTipster: { tipsterId: number; revenue: number; sales: number }[];
  revenueTrend: { date: string; revenue: number; count: number }[];
}

interface PickPerformance {
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  pendingPicks: number;
  avgOdds: number;
  winRate: number;
  topPerformers: { tipsterId: number; totalPicks: number; wonPicks: number; lostPicks: number; winRate: number }[];
}

interface EngagementMetrics {
  totalNotifications: number;
  readNotifications: number;
  unreadNotifications: number;
  readRate: number;
  avgNotificationsPerUser: number;
  activeTipsters: number;
  avgPicksPerTipster: number;
  totalReactions?: number;
  totalViews?: number;
}

interface RealTimeStats {
  users: { last24h: number; last7d: number; last30d: number };
  picks: { last24h: number; last7d: number; last30d: number };
  purchases: { last24h: number; last7d: number; last30d: number };
  revenue: { last24h: number; last7d: number; last30d: number };
}

interface AiDashboardMetrics {
  system_health: {
    predictions_generated_today: number;
    api_uptime: number;
    average_response_time: number;
    errors_today: number;
  };
  tipster_performance: {
    avg_roi_all_tipsters: number;
    best_tipster_roi: number;
    worst_tipster_roi: number;
    total_profit_all_tipsters: number;
  };
  platform_engagement: {
    active_users_today: number;
    predictions_viewed_today: number;
    predictions_followed_today: number;
    new_followers_today: number;
  };
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null);
  const [userBehavior, setUserBehavior] = useState<UserBehavior | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [pickPerformance, setPickPerformance] = useState<PickPerformance | null>(null);
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
  const [realTime, setRealTime] = useState<RealTimeStats | null>(null);
  const [aiMetrics, setAiMetrics] = useState<AiDashboardMetrics | null>(null);
  const [cohorts, setCohorts] = useState<{ week: string; signups: number }[] | null>(null);
  const [retention, setRetention] = useState<{ activeLast7d: number; activeLast14d: number; returningUsers: number; retentionRate: number } | null>(null);
  const [visitorStats, setVisitorStats] = useState<{ uniqueSessions: number; pageViews: number; topPages: { page: string; views: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'picks' | 'engagement' | 'visitors' | 'ai'>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'ai') setActiveTab('ai');
    if (tab === 'visitors') setActiveTab('visitors');
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    Promise.all([
      fetch(`${getApiUrl()}/admin/analytics/time-series?startDate=${startDate}&endDate=${endDate}&interval=day`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Time series error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/conversion-funnel`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Funnel error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/user-behavior`, { headers })
        .then(async (r) => {
          if (!r.ok) {
            const text = await r.text();
            console.error('User behavior API error:', r.status, text);
            return null;
          }
          return r.json();
        })
        .catch((e) => { console.error('User behavior error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/revenue?startDate=${startDate}&endDate=${endDate}`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Revenue error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/pick-performance`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Pick performance error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/engagement`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Engagement error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/real-time`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Real-time error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/ai-dashboard`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('AI dashboard error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/cohorts?days=${days}`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Cohorts error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/retention`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Retention error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/visitors?days=7`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Visitors error:', e); return null; }),
    ])
      .then(([ts, f, ub, rev, pp, eng, rt, ai, coh, ret, vis]) => {
        setTimeSeries(ts);
        setFunnel(f);
        setUserBehavior(ub);
        setRevenue(rev);
        setPickPerformance(pp);
        setEngagement(eng);
        setRealTime(rt);
        setAiMetrics(ai);
        setCohorts(Array.isArray(coh) ? coh : null);
        setRetention(ret);
        setVisitorStats(vis);
      })
      .catch((e) => { console.error('Analytics fetch error:', e); })
      .finally(() => setLoading(false));
  }, [router, dateRange]);

  const SimpleChart = ({ data, color = 'blue', height = 200 }: { data: { date: string; value: number }[]; color?: string; height?: number }) => {
    if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">No data available</div>;
    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const width = 100 / data.length;
    const colors = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600',
      red: 'from-red-500 to-red-600',
    };

    return (
      <div className="relative" style={{ height: `${height}px` }}>
        <svg className="w-full h-full" viewBox={`0 0 ${data.length * 20} ${height}`}>
          {data.map((point, i) => {
            const barHeight = (point.value / maxValue) * height * 0.8;
            const x = (i * width * data.length * 20) / 100;
            return (
              <rect
                key={i}
                x={x}
                y={height - barHeight}
                width={(width * data.length * 20) / 100 - 2}
                height={barHeight}
                className={`fill-gradient-to-t ${colors[color as keyof typeof colors] || colors.blue} opacity-80`}
                rx="2"
              />
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-8 md:ml-56 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 md:ml-56">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Advanced Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">Platform insights and performance metrics.</p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Real-time Stats */}
        {realTime && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
              <p className="text-sm opacity-90 mb-1">Users (24h)</p>
              <p className="text-3xl font-bold">{realTime.users.last24h}</p>
              <p className="text-xs opacity-75 mt-2">{realTime.users.last7d} this week</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
              <p className="text-sm opacity-90 mb-1">Picks (24h)</p>
              <p className="text-3xl font-bold">{realTime.picks.last24h}</p>
              <p className="text-xs opacity-75 mt-2">{realTime.picks.last7d} this week</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
              <p className="text-sm opacity-90 mb-1">Purchases (24h)</p>
              <p className="text-3xl font-bold">{realTime.purchases.last24h}</p>
              <p className="text-xs opacity-75 mt-2">{realTime.purchases.last7d} this week</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
              <p className="text-sm opacity-90 mb-1">Revenue (24h)</p>
              <p className="text-3xl font-bold">GHS {(realTime.revenue.last24h ?? 0).toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-2">GHS {(realTime.revenue.last7d ?? 0).toFixed(2)} this week</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-3 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {(['overview', 'revenue', 'users', 'picks', 'engagement', 'visitors', 'ai'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-red-600 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Time Series Charts */}
            {timeSeries && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Growth</h3>
                  <SimpleChart data={timeSeries.users} color="blue" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pick Creation</h3>
                  <SimpleChart data={timeSeries.picks} color="purple" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Purchases</h3>
                  <SimpleChart data={timeSeries.purchases} color="green" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue</h3>
                  <SimpleChart data={timeSeries.revenue} color="orange" />
                </div>
              </div>
            )}

            {/* Conversion Funnel - user-centric, % = conversion from previous step */}
            {funnel && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Conversion Funnel</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Unique users at each stage. % = conversion from previous step.</p>
                <div className="space-y-4">
                  {[
                    { label: 'Visitors / Users', value: funnel.visitors, rate: 100 },
                    { label: 'Registered', value: funnel.registered, rate: funnel.conversionRates?.registration ?? 0 },
                    { label: 'Content Creators', value: funnel.contentCreators, rate: funnel.conversionRates?.contentCreator ?? 0 },
                    { label: 'Marketplace Sellers', value: funnel.marketplaceSellers, rate: funnel.conversionRates?.seller ?? 0 },
                    { label: 'Buyers', value: funnel.buyers, rate: funnel.conversionRates?.buyer ?? 0 },
                  ].map((step, i) => {
                    const rate = Number.isFinite(step.rate) ? step.rate : 0;
                    return (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-40 text-sm font-medium text-gray-700 dark:text-gray-300">{step.label}</div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-900 dark:text-white">
                          {step.value} ({rate.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Volume metrics</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span><strong>{funnel.totalPicks ?? 0}</strong> picks created</span>
                    <span><strong>{funnel.totalListings ?? 0}</strong> marketplace listings</span>
                    <span><strong>{funnel.totalPurchases ?? 0}</strong> purchases</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && revenue && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold">GHS {(revenue.totalRevenue ?? 0).toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Average Order Value</p>
                <p className="text-3xl font-bold">GHS {(revenue.avgOrderValue ?? 0).toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Revenue Trend</p>
                <p className="text-3xl font-bold">{revenue.revenueTrend.length} days</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
              <SimpleChart data={revenue.revenueTrend.map((r) => ({ date: r.date, value: r.revenue }))} color="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Selling Picks</h3>
                <div className="space-y-3">
                  {revenue.topSellingPicks.slice(0, 5).map((pick, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Pick #{pick.pickId}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{pick.sales} sales</p>
                      </div>
                      <p className="font-semibold text-green-600 dark:text-green-400">GHS {pick.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Tipster</h3>
                <div className="space-y-3">
                  {revenue.revenueByTipster.slice(0, 5).map((tipster, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Tipster #{tipster.tipsterId}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{tipster.sales} sales</p>
                      </div>
                      <p className="font-semibold text-green-600 dark:text-green-400">GHS {tipster.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
              </div>
            ) : userBehavior ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Users</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{userBehavior.activeUsers ?? 0}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">New Users</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{userBehavior.newUsers ?? 0}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Returning Users</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{userBehavior.returningUsers ?? 0}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Purchases/User</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(userBehavior.avgPurchasesPerUser ?? 0).toFixed(1)}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Users by Purchases</h3>
                  {userBehavior.topUsers && userBehavior.topUsers.length > 0 ? (
                    <div className="space-y-3">
                      {userBehavior.topUsers.map((user, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">User #{user.userId}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{user.purchaseCount} purchases</p>
                          </div>
                          <p className="font-semibold text-green-600 dark:text-green-400">GHS {(user.totalSpent ?? 0).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="text-6xl mb-4">👥</div>
                      <p className="text-gray-600 dark:text-gray-400 text-lg">No user purchase data available</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">Unable to load user analytics</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Please try refreshing the page</p>
              </div>
            )}
          </div>
        )}

        {/* Picks Tab */}
        {activeTab === 'picks' && (
          <div className="space-y-6">
            {!pickPerformance ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Unable to load pick performance data</p>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Picks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{pickPerformance.totalPicks}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Win Rate</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{(pickPerformance.winRate ?? 0).toFixed(1)}%</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Won Picks</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{pickPerformance.wonPicks}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Odds</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{(pickPerformance.avgOdds ?? 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Tipsters</h3>
              <div className="space-y-3">
                {pickPerformance.topPerformers.map((performer, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Tipster #{performer.tipsterId}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {performer.wonPicks}W / {performer.lostPicks}L ({performer.totalPicks} total)
                      </p>
                    </div>
                    <p className="font-semibold text-green-600 dark:text-green-400">{(performer.winRate ?? 0).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* Visitors & Expanded Analytics Tab */}
        {activeTab === 'visitors' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Visitor & User Analytics</h2>

            {visitorStats && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Visitor Tracking (Last 7 Days)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unique Sessions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{visitorStats.uniqueSessions}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Page Views</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{visitorStats.pageViews}</p>
                  </div>
                </div>
                {visitorStats.topPages && visitorStats.topPages.length > 0 && (
                  <>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Top Pages</p>
                    <div className="space-y-2">
                      {visitorStats.topPages.map((p, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{p.page || '/'}</span>
                          <span className="font-semibold">{p.views} views</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {visitorStats.uniqueSessions === 0 && (
                  <p className="text-sm text-gray-500">Visitor tracking will populate as users browse the site. The beacon runs on every page load.</p>
                )}
              </div>
            )}

            {retention && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Retention</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active (7d)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{retention.activeLast7d}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active (14d)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{retention.activeLast14d}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Returning</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{retention.returningUsers}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Retention Rate</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{(retention.retentionRate ?? 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}

            {cohorts && cohorts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Signup Cohorts (by Week)</h3>
                <SimpleChart data={cohorts.map((c) => ({ date: c.week, value: c.signups }))} color="blue" height={180} />
              </div>
            )}
          </div>
        )}

        {/* AI Dashboard Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Tipsters Dashboard</h2>

            {!aiMetrics ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">Unable to load AI dashboard metrics</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Please try refreshing the page</p>
              </div>
            ) : (
              <>
            {/* System Health */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Predictions Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiMetrics.system_health.predictions_generated_today}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">API Uptime</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{aiMetrics.system_health.api_uptime}%</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiMetrics.system_health.average_response_time} ms</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Errors Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiMetrics.system_health.errors_today}</p>
                </div>
              </div>
            </div>

            {/* Tipster Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tipster Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg ROI (All Tipsters)</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiMetrics.tipster_performance.avg_roi_all_tipsters}%</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Best Tipster ROI</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{aiMetrics.tipster_performance.best_tipster_roi}%</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Worst Tipster ROI</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{aiMetrics.tipster_performance.worst_tipster_roi}%</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Profit (Units)</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiMetrics.tipster_performance.total_profit_all_tipsters}</p>
                </div>
              </div>
            </div>

            {/* Platform Engagement */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Engagement</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Users Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiMetrics.platform_engagement.active_users_today}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Predictions Viewed Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiMetrics.platform_engagement.predictions_viewed_today}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Predictions Followed Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiMetrics.platform_engagement.predictions_followed_today}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">New Followers Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{aiMetrics.platform_engagement.new_followers_today}</p>
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Engagement Tab */}
        {activeTab === 'engagement' && (
          <div className="space-y-6">
            {!engagement ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">🔔</div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Unable to load engagement data</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Notification Read Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{(engagement.readRate ?? 0).toFixed(1)}%</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Tipsters</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{engagement.activeTipsters}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Picks/Tipster</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{(engagement.avgPicksPerTipster ?? 0).toFixed(1)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Notifications</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{engagement.totalNotifications}</p>
              </div>
              {(engagement.totalReactions != null || engagement.totalViews != null) && (
                <>
                  {engagement.totalReactions != null && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Reactions (Likes)</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{engagement.totalReactions}</p>
                    </div>
                  )}
                  {engagement.totalViews != null && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Pick Views</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{engagement.totalViews}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
