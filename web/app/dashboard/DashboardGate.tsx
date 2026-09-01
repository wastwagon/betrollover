'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { usePendingWithdrawalCount } from '@/hooks/usePendingWithdrawalCount';
import { AdminDashboardHome } from './AdminDashboardHome';
import { UserDashboardHome } from './UserDashboardHome';
import { useDashboardData } from './useDashboardData';
import type { DashboardSurface } from './types';

function DashboardSpinner() {
  const t = useT();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] relative w-full min-w-0 max-w-full">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        <p className="text-[var(--text-muted)] font-medium">{t('dashboard.loading')}</p>
      </div>
    </div>
  );
}

export function DashboardGate({ surface }: { surface: DashboardSurface }) {
  const router = useRouter();
  const { format } = useCurrency();
  const pendingWithdrawalCount = usePendingWithdrawalCount();
  const dash = useDashboardData(surface === 'sell' ? '/dashboard/sell' : '/dashboard');

  useEffect(() => {
    if (surface === 'sell' && !dash.loading && dash.user?.role === 'admin') {
      router.replace('/dashboard');
    }
  }, [surface, dash.loading, dash.user, router]);

  if (dash.loading || (surface === 'sell' && dash.user?.role === 'admin')) {
    return <DashboardSpinner />;
  }

  if (surface === 'buy' && dash.user?.role === 'admin') {
    return (
      <AdminDashboardHome
        user={dash.user}
        stats={dash.stats}
        settling={dash.settling}
        onSettle={dash.runSettlement}
      />
    );
  }

  return (
    <UserDashboardHome
      surface={surface}
      user={dash.user}
      loading={dash.loading}
      onRefresh={dash.refreshDashboard}
      dailyQuota={dash.dailyQuota}
      purchaseStats={dash.purchaseStats}
      pendingWithdrawalCount={pendingWithdrawalCount}
      unreadNotifications={dash.unreadNotifications}
      tipsterStats={dash.tipsterStats}
      walletBalance={dash.walletBalance}
      formatPrimary={(n) => format(n).primary}
      vipFeedPicks={dash.vipFeedPicks}
      onVipCountsChange={dash.onVipCountsChange}
      following={dash.following}
      feedPicks={dash.feedPicks}
      purchases={dash.purchases}
      feedPurchasing={dash.feedPurchasing}
      onPurchaseFeed={dash.purchaseFeedPick}
      onFeedCountsChange={dash.onFeedCountsChange}
      minimumROI={dash.minimumROI}
      minimumWinRate={dash.minimumWinRate}
    />
  );
}
