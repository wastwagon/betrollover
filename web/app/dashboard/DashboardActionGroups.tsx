'use client';

import { useT } from '@/context/LanguageContext';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { DashAction } from './DashAction';
import type { DashboardSurface, PurchaseStats, User } from './types';

export function DashboardActionGroups({
  surface,
  user,
  purchaseStats,
  pendingWithdrawalCount,
  unreadNotifications,
}: {
  surface: DashboardSurface;
  user: User | null;
  purchaseStats: PurchaseStats | null;
  pendingWithdrawalCount: number;
  unreadNotifications: number;
}) {
  const t = useT();
  const vip = isSubscriptionsEnabled();

  return (
    <section className="mb-6 sm:mb-8 space-y-6">
      {surface === 'buy' ? (
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">
          {t('dashboard.section_buy')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <DashAction href="/marketplace" badge="Market" title={t('dashboard.marketplace')} desc={t('dashboard.card_marketplace_desc')} />
          <DashAction
            href="/my-purchases"
            badge="Buy"
            title={t('nav.purchases')}
            desc={
              purchaseStats && purchaseStats.total > 0
                ? t('dashboard.card_my_purchases_total', { n: String(purchaseStats.total) })
                : t('dashboard.card_my_purchases_empty')
            }
          />
          {vip ? (
            <DashAction
              href="/subscriptions/marketplace"
              badge="VIP"
              title={t('dashboard.card_vip_marketplace')}
              desc={t('dashboard.card_vip_marketplace_desc')}
            />
          ) : null}
          <DashAction href="/leaderboard" badge="Rank" title={t('dashboard.card_leaderboard')} desc={t('dashboard.card_leaderboard_desc')} />
        </div>
      </div>
      ) : null}
      {surface === 'sell' ? (
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">
          {t('dashboard.section_sell')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <DashAction href="/create-pick" badge="New" title={t('dashboard.create_pick')} desc={t('dashboard.card_create_desc')} primary />
          <DashAction href="/my-picks" badge="Picks" title={t('dashboard.my_picks')} desc={t('dashboard.card_my_picks_desc')} />
          {vip ? (
            <DashAction
              href="/dashboard/subscription-packages"
              badge="Pack"
              title={t('tipster.subscription_packages')}
              desc={t('dashboard.card_subscription_desc')}
            />
          ) : null}
          <DashAction href="/earnings" badge="Earn" title={t('dashboard.card_earnings')} desc={t('dashboard.card_earnings_desc')} />
          <DashAction href="/wallet" badge="Wallet" title={t('dashboard.card_wallet')} desc={t('dashboard.card_wallet_desc')} />
          <DashAction
            href="/wallet#withdraw"
            badge="Out"
            title={t('dashboard.card_withdrawals')}
            desc={
              <>
                {t('dashboard.card_withdrawals_desc')}
                {pendingWithdrawalCount > 0 ? (
                  <span className="text-[var(--accent)] font-medium">
                    {' · '}
                    {t('dashboard.pending_withdrawal_hint', { n: String(pendingWithdrawalCount) })}
                  </span>
                ) : null}
              </>
            }
            overlay={
              pendingWithdrawalCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-[var(--accent)] text-[var(--bg)] text-[10px] font-bold flex items-center justify-center border-2 border-[var(--card)]">
                  {pendingWithdrawalCount > 9 ? '9+' : pendingWithdrawalCount}
                </span>
              ) : null
            }
          />
        </div>
      </div>
      ) : null}
      {surface === 'buy' ? (
      <div>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">
          {t('dashboard.section_account')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <DashAction href="/profile" badge="Me" title={t('dashboard.card_profile')} desc={t('dashboard.card_profile_desc')} />
          <DashAction
            href={user?.username ? `/tipsters/${user.username}` : '/tipsters'}
            badge="Tip"
            title={t('dashboard.card_my_profile')}
            desc={t('dashboard.card_my_profile_desc')}
          />
          <DashAction href="/invite" badge="Invite" title={t('dashboard.invite')} desc={t('dashboard.card_invite_desc')} />
          <DashAction
            href="/notifications"
            badge="Alert"
            title={t('dashboard.card_notifications')}
            desc={
              unreadNotifications > 0
                ? t('dashboard.card_notifications_unread', { n: String(unreadNotifications) })
                : t('dashboard.card_notifications_none')
            }
            overlay={
              unreadNotifications > 0 ? (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--destructive)] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              ) : null
            }
          />
          {vip ? (
            <DashAction href="/subscriptions" badge="Sub" title={t('dashboard.card_subscriptions')} desc={t('dashboard.card_subscriptions_desc')} />
          ) : null}
          <DashAction href="/community" badge="Chat" title={t('dashboard.card_community')} desc={t('dashboard.card_community_desc')} />
          <DashAction href="/support" badge="Help" title={t('dashboard.card_support')} desc={t('dashboard.card_support_desc')} />
        </div>
      </div>
      ) : null}
    </section>
  );
}
