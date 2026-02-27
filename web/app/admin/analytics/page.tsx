'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
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

interface SportStat {
  sport: string;
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  pendingPicks: number;
  winRate: number;
  revenue: number;
  avgOdds: number;
}

interface RevenueTrendPoint {
  date: string;
  revenue: number;
  purchases: number;
}

interface TopTipsterBySport {
  sport: string;
  userId: number;
  displayName: string;
  username: string;
  totalPicks: number;
  wonPicks: number;
  winRate: number;
  roi: number;
}

interface CommissionRevenue {
  allTime: number;
  last30d: number;
  last7d: number;
  recentTransactions: Array<{
    id: number;
    amount: number;
    reference: string | null;
    description: string | null;
    createdAt: string;
    userId: number;
  }>;
}

const SPORT_COLORS: Record<string, string> = {
  Football:          '#10b981',
  Basketball:        '#f97316',
  Rugby:             '#f59e0b',
  MMA:               '#ef4444',
  Volleyball:        '#3b82f6',
  Hockey:            '#06b6d4',
  'American Football': '#8b5cf6',
  Tennis:            '#eab308',
};
const SPORT_ICONS: Record<string, string> = {
  Football: '⚽', Basketball: '🏀', Rugby: '🏉', MMA: '🥊',
  Volleyball: '🏐', Hockey: '🏒', 'American Football': '🏈', Tennis: '🎾',
};

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
  const [visitorStats, setVisitorStats] = useState<{
    uniqueSessions: number;
    pageViews: number;
    topPages: { page: string; views: number }[];
    dailyVisitors?: { date: string; uniqueSessions: number; pageViews: number }[];
    todayVisitors?: number;
    todayPageViews?: number;
    totalVisitors?: number;
    activeSessionsNow?: number;
    trafficSources?: { source: string; count: number; percent: number }[];
    deviceBreakdown?: { device: string; count: number }[];
    byCountry?: { country: string; count: number }[];
    avgSessionDurationSec?: number;
    conversionBySource?: { source: string; sessions: number; percent: number }[];
  } | null>(null);
  const [sportBreakdown, setSportBreakdown] = useState<SportStat[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [topTipstersBySport, setTopTipstersBySport] = useState<TopTipsterBySport[]>([]);
  const [commissionRevenue, setCommissionRevenue] = useState<CommissionRevenue | null>(null);
  const [chatStats, setChatStats] = useState<{ totalMessages: number; todayMessages: number; flaggedMessages: number; activeBans: number; roomBreakdown: { name: string; icon: string; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'picks' | 'engagement' | 'visitors' | 'ai' | 'sports'>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'ai') setActiveTab('ai');
    if (tab === 'visitors') setActiveTab('visitors');
    if (tab === 'sports') setActiveTab('sports');
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
      fetch(`${getApiUrl()}/admin/analytics/visitors?days=${days}`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => { console.error('Visitors error:', e); return null; }),
      fetch(`${getApiUrl()}/admin/analytics/sport-breakdown`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${getApiUrl()}/admin/analytics/revenue-trend?days=${days}`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${getApiUrl()}/admin/analytics/top-tipsters-by-sport?limit=3`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${getApiUrl()}/admin/analytics/commission-revenue`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([ts, f, ub, rev, pp, eng, rt, ai, coh, ret, vis, sb, rt2, ttbs, commRev]) => {
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
        setSportBreakdown(Array.isArray(sb) ? sb : []);
        setRevenueTrend(Array.isArray(rt2) ? rt2 : []);
        setTopTipstersBySport(Array.isArray(ttbs) ? ttbs : []);
        setCommissionRevenue(commRev ?? null);

        // Fetch chat stats separately (non-blocking)
        fetch(`${getApiUrl()}/chat/admin/flagged?page=1`, { headers })
          .then((r) => r.ok ? r.json() : null)
          .then((flaggedData) => {
            Promise.all([
              fetch(`${getApiUrl()}/chat/rooms`, { headers }).then((r) => r.ok ? r.json() : []),
              fetch(`${getApiUrl()}/chat/admin/bans`, { headers }).then((r) => r.ok ? r.json() : {}),
            ]).then(([roomsData, bansData]) => {
              const rooms = Array.isArray(roomsData) ? roomsData : [];
              const today = rooms.reduce((s: number, r: any) => s + (r.todayMessages || 0), 0);
              setChatStats({
                totalMessages: rooms.reduce((s: number, r: any) => s + (r.todayMessages || 0), 0),
                todayMessages: today,
                flaggedMessages: flaggedData?.total ?? 0,
                activeBans: (bansData as any)?.data?.length ?? (Array.isArray(bansData) ? bansData.length : 0),
                roomBreakdown: rooms.map((r: any) => ({ name: r.name, icon: r.icon, count: r.todayMessages || 0 })),
              });
            }).catch(() => {});
          }).catch(() => {});
      })
      .catch((e) => { console.error('Analytics fetch error:', e); })
      .finally(() => setLoading(false));
  }, [router, dateRange]);

  const chartColors: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f97316',
    red: '#ef4444',
  };

  const SimpleChart = ({ data, color = 'blue', height = 200, valueLabel = 'value' }: { data: { date: string; value: number }[]; color?: string; height?: number; valueLabel?: string }) => {
    if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">No data available</div>;
    const fill = chartColors[color] || chartColors.blue;
    const chartData = data.map((d) => ({ ...d, name: d.date }));
    return (
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              formatter={(v: number | undefined) => [v != null ? v.toLocaleString() : '—', valueLabel]}
              labelFormatter={(l) => `Date: ${l}`}
            />
            <Bar dataKey="value" fill={fill} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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

        {/* Visitor & Traffic KPI Cards - Self-hosted analytics */}
        {visitorStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Today&apos;s Visitors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{visitorStats.todayVisitors ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Unique sessions today</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Visitors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{visitorStats.totalVisitors ?? visitorStats.uniqueSessions ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">All-time unique sessions</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Active Now</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{visitorStats.activeSessionsNow ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Sessions in last 5 min</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Page Views Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{visitorStats.todayPageViews ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total views today</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Period Sessions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{visitorStats.uniqueSessions}</p>
              <p className="text-xs text-gray-500 mt-1">Last {dateRange} unique</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Period Page Views</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{visitorStats.pageViews}</p>
              <p className="text-xs text-gray-500 mt-1">Last {dateRange} total</p>
            </div>
          </div>
        )}

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
              <p className="text-sm opacity-90 mb-1">Coupon Revenue (24h)</p>
              <p className="text-3xl font-bold">GHS {(realTime.revenue.last24h ?? 0).toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-2">GHS {(realTime.revenue.last7d ?? 0).toFixed(2)} this week</p>
            </div>
          </div>
        )}

        {/* Platform Commission Revenue strip */}
        {commissionRevenue && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-1 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl shadow-xl p-5 text-white">
              <p className="text-xs font-semibold opacity-90 uppercase tracking-wider mb-1">Commission (All Time)</p>
              <p className="text-2xl font-bold">GHS {commissionRevenue.allTime.toFixed(2)}</p>
              <p className="text-xs opacity-80 mt-1">Platform revenue from settlements</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last 30 Days</p>
              <p className="text-xl font-bold text-amber-600">GHS {commissionRevenue.last30d.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last 7 Days</p>
              <p className="text-xl font-bold text-amber-600">GHS {commissionRevenue.last7d.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow p-5 flex flex-col justify-between">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Settlements</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{commissionRevenue.recentTransactions.length}</p>
              <button
                onClick={() => setActiveTab('revenue')}
                className="text-xs text-amber-600 hover:underline mt-auto"
              >
                View commission log →
              </button>
            </div>
          </div>
        )}

        {/* Community Chat Stats */}
        {chatStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-indigo-600 rounded-2xl p-5 text-white">
              <p className="text-xs font-semibold opacity-90 uppercase tracking-wider mb-1">Messages Today</p>
              <p className="text-3xl font-bold">{chatStats.todayMessages}</p>
              <p className="text-xs opacity-80 mt-1">Across all rooms</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Flagged Messages</p>
              <p className={`text-2xl font-bold ${chatStats.flaggedMessages > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {chatStats.flaggedMessages}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active Bans</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{chatStats.activeBans}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex flex-col justify-between">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Chat Rooms</p>
              <p className="text-2xl font-bold text-indigo-600">{chatStats.roomBreakdown.length}</p>
              <Link href="/admin/chat" className="text-xs text-indigo-600 hover:underline mt-auto">Manage chat →</Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-3 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {(['overview', 'sports', 'revenue', 'users', 'picks', 'engagement', 'visitors', 'ai'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'sports' ? '🌍 Sports' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Time Series Charts - with numeric axes and tooltips */}
            {timeSeries && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Growth</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">New registrations per day</p>
                  <SimpleChart data={timeSeries.users} color="blue" valueLabel="Users" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pick Creation</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Picks created per day</p>
                  <SimpleChart data={timeSeries.picks} color="purple" valueLabel="Picks" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Purchases</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Purchases per day</p>
                  <SimpleChart data={timeSeries.purchases} color="green" valueLabel="Purchases" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">GHS per day</p>
                  <SimpleChart data={timeSeries.revenue.map((r) => ({ ...r, value: Math.round(r.value * 100) / 100 }))} color="orange" valueLabel="GHS" />
                </div>
              </div>
            )}

            {/* Visitor Traffic Chart - from self-hosted tracking */}
            {visitorStats?.dailyVisitors && visitorStats.dailyVisitors.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Visitors</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Unique sessions per day (from page tracking beacon)</p>
                <SimpleChart
                  data={visitorStats.dailyVisitors.map((d) => ({ date: d.date, value: d.uniqueSessions }))}
                  color="blue"
                  valueLabel="Sessions"
                />
              </div>
            )}

            {/* Traffic Sources */}
            {visitorStats?.trafficSources && visitorStats.trafficSources.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Traffic Sources</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Where visitors come from (last {dateRange})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {visitorStats.trafficSources.map((s) => (
                    <div key={s.source} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.source}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{s.percent}%</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4" style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={visitorStats.trafficSources.filter((s) => s.count > 0)}
                        dataKey="count"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={(entry: { source?: string; percent?: number }) => `${entry?.source ?? 'Unknown'} ${((entry?.percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {visitorStats.trafficSources.filter((s) => s.count > 0).map((_, i) => (
                          <Cell key={i} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f97316'][i % 4]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, _n, props) => {
  const p = props as { payload?: { percent?: number; source?: string } };
  const val = typeof v === 'number' ? v : 0;
  const pct = (p?.payload?.percent ?? 0) < 1 ? (p?.payload?.percent ?? 0) * 100 : (p?.payload?.percent ?? 0);
  return [`${val} (${pct.toFixed(1)}%)`, p?.payload?.source ?? ''];
}} />
                    </PieChart>
                  </ResponsiveContainer>
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
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            {/* Commission revenue summary */}
            {commissionRevenue && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      🏛 Platform Commission Revenue
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Automatically deducted from tipster payouts on winning coupon settlements.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-600">GHS {commissionRevenue.allTime.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">All time</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-amber-100 dark:border-amber-800/30">
                    <p className="text-xs text-gray-500 mb-1">Last 30 Days</p>
                    <p className="text-xl font-bold text-amber-600">GHS {commissionRevenue.last30d.toFixed(2)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-amber-100 dark:border-amber-800/30">
                    <p className="text-xs text-gray-500 mb-1">Last 7 Days</p>
                    <p className="text-xl font-bold text-amber-600">GHS {commissionRevenue.last7d.toFixed(2)}</p>
                  </div>
                </div>
                {/* Commission log table */}
                {commissionRevenue.recentTransactions.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-amber-100 dark:border-amber-800/30">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-amber-50 dark:bg-amber-900/20 text-left">
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pick Ref</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipster ID</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-amber-50 dark:divide-amber-900/10">
                        {commissionRevenue.recentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                            <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">
                              {tx.reference ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                              #{tx.userId}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-amber-600 whitespace-nowrap">
                              GHS {Number(tx.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-50 dark:bg-amber-900/20 font-semibold">
                          <td colSpan={3} className="px-4 py-2.5 text-gray-700 dark:text-gray-300">Total (shown)</td>
                          <td className="px-4 py-2.5 text-right text-amber-700 dark:text-amber-400">
                            GHS {commissionRevenue.recentTransactions.reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {revenue && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Coupon Sales Revenue</p>
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
            </div>}

            {revenue && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Coupon Sales Revenue Trend</h3>
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
              </>
            )}
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Visitor & Traffic Analytics</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Self-hosted analytics from the page tracking beacon. No third-party scripts.</p>

            {visitorStats && (
              <>
                {/* Visitor KPI summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Today&apos;s Visitors</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{visitorStats.todayVisitors ?? 0}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Visitors</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{visitorStats.totalVisitors ?? visitorStats.uniqueSessions ?? 0}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active Now</p>
                    <p className="text-xl font-bold text-emerald-600">{visitorStats.activeSessionsNow ?? 0}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Page Views (period)</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{visitorStats.pageViews}</p>
                  </div>
                </div>

                {/* Traffic Sources */}
                {visitorStats.trafficSources && visitorStats.trafficSources.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Traffic Sources (Last {dateRange})</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Where visitors come from: direct, organic search, social, referral</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {visitorStats.trafficSources.map((s) => (
                        <div key={s.source} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                          <p className="text-xs font-semibold text-gray-500 uppercase">{s.source}</p>
                          <p className="text-2xl font-bold">{s.count}</p>
                          <p className="text-sm text-gray-600">{s.percent}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversion by source + session duration + device + country */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {visitorStats.conversionBySource && visitorStats.conversionBySource.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversion by Source</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Logged-in sessions by traffic source</p>
                      <div className="space-y-2">
                        {visitorStats.conversionBySource.map((s) => (
                          <div key={s.source} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <span className="font-medium capitalize">{s.source}</span>
                            <span>{s.sessions} ({s.percent}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-6">
                    {visitorStats.avgSessionDurationSec != null && visitorStats.avgSessionDurationSec > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Avg Session Duration</h3>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.floor(visitorStats.avgSessionDurationSec / 60)}m {Math.round(visitorStats.avgSessionDurationSec % 60)}s
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Multi-page sessions only</p>
                      </div>
                    )}
                    {visitorStats.deviceBreakdown && visitorStats.deviceBreakdown.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Breakdown</h3>
                        <div className="flex flex-wrap gap-3">
                          {visitorStats.deviceBreakdown.map((d) => (
                            <span key={d.device} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium">
                              {d.device}: {d.count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {visitorStats.byCountry && visitorStats.byCountry.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Countries</h3>
                        <div className="space-y-6 max-h-48 overflow-y-auto">
                          {visitorStats.byCountry.slice(0, 10).map((c) => (
                            <div key={c.country} className="flex justify-between items-center">
                              <span className="font-mono text-sm">{c.country === 'unknown' ? '—' : c.country}</span>
                              <span className="font-semibold">{c.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Individual Page Performance */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Page Performance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Views per page (last {dateRange})</p>
                  {visitorStats.topPages && visitorStats.topPages.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-600 text-left">
                            <th className="py-3 px-2 font-semibold text-gray-500 uppercase tracking-wider">#</th>
                            <th className="py-3 px-2 font-semibold text-gray-500 uppercase tracking-wider">Page</th>
                            <th className="py-3 px-2 font-semibold text-gray-500 uppercase tracking-wider text-right">Views</th>
                            <th className="py-3 px-2 font-semibold text-gray-500 uppercase tracking-wider text-right">% of Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visitorStats.topPages.map((p, i) => (
                            <tr key={i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                              <td className="py-2 px-2 font-mono text-gray-900 dark:text-white">{p.page || '/'}</td>
                              <td className="py-2 px-2 text-right font-semibold">{p.views.toLocaleString()}</td>
                              <td className="py-2 px-2 text-right text-gray-600">
                                {visitorStats.pageViews > 0 ? ((p.views / visitorStats.pageViews) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 py-4">No page data yet. Tracking populates as users browse the site.</p>
                  )}
                </div>

                {/* Daily visitor chart */}
                {visitorStats.dailyVisitors && visitorStats.dailyVisitors.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Visitors Trend</h3>
                    <SimpleChart
                      data={visitorStats.dailyVisitors.map((d) => ({ date: d.date, value: d.uniqueSessions }))}
                      color="blue"
                      valueLabel="Sessions"
                    />
                  </div>
                )}

                {visitorStats.uniqueSessions === 0 && (
                  <p className="text-sm text-gray-500 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    Visitor tracking will populate as users browse the site. The beacon runs on every page load. Ensure AnalyticsBeacon is mounted in your layout.
                  </p>
                )}
              </>
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
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {aiMetrics.system_health.api_uptime != null ? `${aiMetrics.system_health.api_uptime}%` : '—'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {aiMetrics.system_health.average_response_time != null ? `${aiMetrics.system_health.average_response_time} ms` : '—'}
                  </p>
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

        {/* Sports Tab */}
        {activeTab === 'sports' && (
          <div className="space-y-8">
            {sportBreakdown.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="text-5xl mb-4">🌍</div>
                <p className="text-gray-500 text-lg">No sport data yet — create picks across different sports to see breakdown here.</p>
              </div>
            ) : (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {sportBreakdown.map((s) => (
                    <div key={s.sport} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                      <p className="text-2xl mb-1">{SPORT_ICONS[s.sport] ?? '🎽'}</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{s.sport}</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{s.totalPicks}</p>
                      <p className="text-xs text-gray-500 mt-0.5">picks total</p>
                      <div className="mt-2 flex gap-2 text-xs">
                        <span className="text-emerald-600 font-semibold">{s.winRate}% WR</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-600 dark:text-gray-400">{s.avgOdds}x odds</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Picks by sport — horizontal bar chart */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Picks by Sport</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Total, won, and lost coupons per sport</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={sportBreakdown} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="sport" type="category" tick={{ fontSize: 12 }} width={110} />
                      <Tooltip
                        formatter={(value: any, name: any) => [value, (name as string) === 'totalPicks' ? 'Total' : name === 'wonPicks' ? 'Won' : 'Lost']}
                        contentStyle={{ borderRadius: 8, fontSize: 13 }}
                      />
                      <Legend formatter={(v) => v === 'totalPicks' ? 'Total' : v === 'wonPicks' ? 'Won' : 'Lost'} />
                      <Bar dataKey="totalPicks" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="wonPicks" fill="#10b981" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="lostPicks" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Win rate & Revenue — side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Win rate by sport */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Win Rate by Sport</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">% of settled coupons that won</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={sportBreakdown.filter((s) => s.totalPicks - s.pendingPicks > 0)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="sport" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.split(' ')[0]} />
                        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Win Rate"] as any} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                        <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                          {sportBreakdown.map((s) => (
                            <Cell key={s.sport} fill={SPORT_COLORS[s.sport] ?? '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Revenue by sport — pie */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Revenue by Sport</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">From paid coupon purchases</p>
                    {sportBreakdown.every((s) => s.revenue === 0) ? (
                      <div className="py-10 text-center text-gray-400 text-sm">No paid pick revenue yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={sportBreakdown.filter((s) => s.revenue > 0)}
                            dataKey="revenue"
                            nameKey="sport"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(props: any) =>
                              `${SPORT_ICONS[props.sport] ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                            }
                          >
                            {sportBreakdown.filter((s) => s.revenue > 0).map((s) => (
                              <Cell key={s.sport} fill={SPORT_COLORS[s.sport] ?? '#6366f1'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: any) => [`GHS ${Number(v).toFixed(2)}`, "Revenue"] as any} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Revenue trend (30d line chart) */}
                {revenueTrend.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Revenue Trend</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Daily paid pick revenue (GHS)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={revenueTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                        <YAxis tickFormatter={(v: number) => `GHS ${v}`} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: any, name: any) => [name === 'revenue' ? `GHS ${Number(v).toFixed(2)}` : v, name === 'revenue' ? 'Revenue' : 'Purchases'] as any}
                          contentStyle={{ borderRadius: 8, fontSize: 13 }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="revenue" />
                        <Line type="monotone" dataKey="purchases" stroke="#6366f1" strokeWidth={2} dot={false} name="purchases" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top tipsters by sport — table */}
                {topTipstersBySport.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Top Tipsters by Sport</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ranked by win rate (settled picks only)</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Sport</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Tipster</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Picks</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Won</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Win Rate</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">ROI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topTipstersBySport.map((t, i) => (
                            <tr key={`${t.sport}-${t.userId}`} className={`border-b border-gray-100 dark:border-gray-700/50 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'}`}>
                              <td className="py-2.5 px-3">
                                <span className="flex items-center gap-1.5">
                                  <span>{SPORT_ICONS[t.sport] ?? '🎽'}</span>
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">{t.sport}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-gray-900 dark:text-white">{t.displayName}</span>
                                <span className="text-gray-400 text-xs ml-1">@{t.username}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{t.totalPicks}</td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 font-semibold">{t.wonPicks}</td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${t.winRate >= 60 ? 'bg-emerald-100 text-emerald-700' : t.winRate >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  {t.winRate}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums">
                                <span className={`font-semibold ${t.roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {t.roi >= 0 ? '+' : ''}{t.roi}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
