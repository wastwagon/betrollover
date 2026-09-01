'use client';

import Link from 'next/link';
import Image from 'next/image';
import { DashboardShell } from '@/components/DashboardShell';
import { PageHeader } from '@/components/PageHeader';
import { AdSlot } from '@/components/AdSlot';
import { PickCard } from '@/components/PickCard';
import { PickQuotaBanner } from '@/components/PickQuotaBanner';
import { PullToRefresh } from '@/components/ios/PullToRefresh';
import { IconStar, IconEarnings, IconTrending } from '@/components/ios/icons';
import { useT } from '@/context/LanguageContext';
import { getAvatarUrl, shouldUnoptimizeGoogleAvatar } from '@/lib/site-config';
import { getPickCardSocialProps } from '@/lib/pick-card-social';
import { currentLoginRedirectPath } from '@/lib/login-redirect-path';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { buttonClassName } from '@/components/ui/Button';
import type { DailyCouponQuota } from '@/lib/daily-coupon-quota';
import type { PickSocialCounts } from '@/components/pick-social/PickSocialBar';
import { SegmentedControl } from '@/components/ios/SegmentedControl';
import { useRouter } from 'next/navigation';
import { resultChipClass } from '@/lib/result-chip';
import { DashboardActionGroups } from './DashboardActionGroups';
import { StatCard } from './StatCard';
import type { FeedPick, FollowedTipster, Purchase, PurchaseStats, TipsterStats, User, DashboardSurface } from './types';

export function UserDashboardHome({
  surface,
  user,
  loading,
  onRefresh,
  dailyQuota,
  purchaseStats,
  pendingWithdrawalCount,
  unreadNotifications,
  tipsterStats,
  walletBalance,
  formatPrimary,
  vipFeedPicks,
  onVipCountsChange,
  following,
  feedPicks,
  purchases,
  feedPurchasing,
  onPurchaseFeed,
  onFeedCountsChange,
  minimumROI,
  minimumWinRate,
}: {
  surface: DashboardSurface;
  user: User | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  dailyQuota: DailyCouponQuota | null;
  purchaseStats: PurchaseStats | null;
  pendingWithdrawalCount: number;
  unreadNotifications: number;
  tipsterStats: TipsterStats | null;
  walletBalance: number | null;
  formatPrimary: (n: number) => string;
  vipFeedPicks: FeedPick[];
  onVipCountsChange: (id: number, counts: PickSocialCounts) => void;
  following: FollowedTipster[];
  feedPicks: FeedPick[];
  purchases: Purchase[];
  feedPurchasing: number | null;
  onPurchaseFeed: (pick: FeedPick) => Promise<void>;
  onFeedCountsChange: (id: number, counts: PickSocialCounts) => void;
  minimumROI: number | null;
  minimumWinRate: number | null;
}) {
  const t = useT();
  const router = useRouter();
  const loginPath = surface === 'sell' ? '/dashboard/sell' : '/dashboard';
  const atDailyLimit =
    dailyQuota != null && dailyQuota.remaining === 0 && !dailyQuota.exempt && dailyQuota.maxPerDay > 0;
  const canSellPaid =
    tipsterStats != null &&
    minimumROI != null &&
    minimumWinRate != null &&
    tipsterStats.roi >= minimumROI &&
    tipsterStats.winRate >= minimumWinRate;

  return (
    <DashboardShell>
      <div className="min-h-[calc(100vh-8rem)] bg-[var(--bg)] relative">
        <PullToRefresh onRefresh={onRefresh} disabled={loading}>
          <div className="section-ux-dashboard-shell-spacious">
            <PageHeader
              label={t('dashboard.tipster_label')}
              title={`${t('dashboard.welcome')}, ${user?.displayName || 'User'}`}
              tagline={surface === 'sell' ? t('dashboard.sell_tagline') : t('dashboard.buy_tagline')}
            />

            <div className="mb-6">
              <SegmentedControl
                aria-label={t('nav.dashboard')}
                options={[
                  { value: 'buy' as const, label: t('dashboard.section_buy') },
                  { value: 'sell' as const, label: t('dashboard.section_sell') },
                ]}
                value={surface}
                onChange={(next) => router.push(next === 'sell' ? '/dashboard/sell' : '/dashboard')}
              />
            </div>

            <div className="mb-6">
              <AdSlot zoneSlug="dashboard-full" fullWidth className="w-full max-w-3xl" />
            </div>

            {surface === 'buy' ? (
            <Link
              href="/invite"
              className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[var(--radius)] border border-[var(--separator)] bg-[var(--card)] transition-colors hover:border-[var(--primary)]/35"
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <span className="w-12 h-12 rounded-xl bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0 text-[var(--primary)]">
                  <IconStar className="w-6 h-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-[var(--text)] block">{t('dashboard.invite')}</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {t('dashboard.card_invite_desc')} — {t('dashboard.invite_cta_short')}
                  </span>
                </div>
              </div>
              <span className="text-sm font-medium text-[var(--primary)] flex-shrink-0 self-end sm:self-center">→</span>
            </Link>
            ) : null}

            {surface === 'sell' && dailyQuota ? (
              <PickQuotaBanner dailyQuota={dailyQuota} atDailyLimit={atDailyLimit} className="sm:mb-5 rounded-2xl" />
            ) : null}

            <DashboardActionGroups
              surface={surface}
              user={user}
              purchaseStats={purchaseStats}
              pendingWithdrawalCount={pendingWithdrawalCount}
              unreadNotifications={unreadNotifications}
            />

            {surface === 'buy' && !isFootballOnlyDiscovery() ? (
              <section className="mb-6 sm:mb-8">
                <div className="rounded-[var(--radius)] overflow-hidden border border-[var(--separator)] bg-[var(--card)]">
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-[var(--fill-secondary)] text-[var(--text-muted)] flex items-center justify-center text-xs font-semibold">
                          Live
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold text-[var(--text)] text-base sm:text-lg mb-1">
                            {t('dashboard.multisport_title')}
                          </h3>
                          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{t('dashboard.multisport_desc')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:shrink-0 min-w-0">
                        {['Football', 'Basketball', 'Tennis'].map((label) => (
                          <div
                            key={label}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--fill-secondary)] text-[var(--text)]"
                          >
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {surface === 'sell' && tipsterStats ? (
              <section className="mb-6 sm:mb-8">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">
                  {t('dashboard.performance')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard title={t('dashboard.roi')} value={tipsterStats.roi} suffix="%" variant="teal" glass index={0} />
                  <StatCard title={t('dashboard.win_rate')} value={tipsterStats.winRate} suffix="%" variant="emerald" glass index={1} />
                  <StatCard title={t('dashboard.total_picks')} value={tipsterStats.totalPicks} variant="amber" glass index={2} />
                  <StatCard
                    title={t('dashboard.card_wallet')}
                    value={walletBalance ?? 0}
                    format="currency"
                    displayValue={formatPrimary(walletBalance ?? 0)}
                    variant="teal"
                    link="/wallet"
                    glass
                    index={3}
                  />
                </div>
              </section>
            ) : null}

            {surface === 'buy' && isSubscriptionsEnabled() && vipFeedPicks.length > 0 ? (
              <section className="mb-6 sm:mb-8">
                <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2 mb-2 sm:mb-3 px-0.5 min-w-0">
                  <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {t('dashboard.vip_picks_section_title')}
                  </h2>
                  <Link href="/subscriptions" className="text-xs font-medium text-[var(--primary)] hover:underline w-fit">
                    {t('dashboard.vip_picks_see_all')}
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  {vipFeedPicks.slice(0, 4).map((pick) => {
                    const tip = pick.tipster;
                    const tipster = tip
                      ? {
                          id: tip.id ?? 0,
                          displayName: tip.displayName,
                          username: tip.username,
                          avatarUrl: tip.avatarUrl ?? null,
                          isAi: tip.isAi === true,
                          winRate: tip.winRate,
                          totalPicks: tip.totalPicks ?? 0,
                          wonPicks: tip.wonPicks ?? 0,
                          lostPicks: tip.lostPicks ?? 0,
                          rank: tip.rank ?? null,
                        }
                      : null;
                    return (
                      <PickCard
                        key={`vip-${pick.id}`}
                        id={pick.id}
                        title={pick.title}
                        totalPicks={pick.totalPicks}
                        totalOdds={pick.totalOdds}
                        price={pick.price}
                        purchaseCount={pick.purchaseCount}
                        picks={pick.picks || []}
                        tipster={tipster}
                        bookmakerKey={pick.bookmakerKey}
                        bookingCode={pick.bookingCode}
                        bookingCodeCopyCount={pick.bookingCodeCopyCount ?? 0}
                        isPurchased
                        canPurchase={false}
                        walletBalance={null}
                        onPurchase={() => {}}
                        viewOnly
                        purchasing={false}
                        {...getPickCardSocialProps(pick, {
                          onCountsChange: onVipCountsChange,
                          loginRedirectPath: currentLoginRedirectPath(loginPath),
                        })}
                      />
                    );
                  })}
                </div>
              </section>
            ) : null}

            {surface === 'buy' ? (
            <section className="mb-6 sm:mb-8">
              <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">
                {t('dashboard.followed_tipsters')}
              </h2>
              <div className="rounded-[var(--radius)] overflow-hidden border border-[var(--separator)] bg-[var(--card)]">
                <div className="p-4 sm:p-6">
                  {following.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {following.map((person) => (
                        <Link
                          key={person.id}
                          href={`/tipsters/${person.username}`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg)]/70 hover:bg-[var(--fill-secondary)] border border-[var(--border)]/60 transition-colors"
                        >
                          {person.avatarUrl ? (
                            <Image
                              src={getAvatarUrl(person.avatarUrl, 24)!}
                              alt=""
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover"
                              unoptimized={shouldUnoptimizeGoogleAvatar(getAvatarUrl(person.avatarUrl, 24))}
                            />
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-xs font-bold text-[var(--primary)]">
                              {person.displayName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          )}
                          <span className="font-medium text-[var(--text)] text-sm">{person.displayName}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  {feedPicks.length > 0 ? (
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-3">{t('dashboard.latest_picks')}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {feedPicks.slice(0, 4).map((pick) => {
                          const isPurchased = purchases.some((p) => p.accumulatorId === pick.id);
                          const canPurchase = pick.price === 0 || (walletBalance !== null && walletBalance >= pick.price);
                          return (
                            <PickCard
                              key={pick.id}
                              id={pick.id}
                              title={pick.title}
                              totalPicks={pick.totalPicks}
                              totalOdds={pick.totalOdds}
                              price={pick.price}
                              purchaseCount={pick.purchaseCount}
                              picks={pick.picks || []}
                              tipster={pick.tipster}
                              picksRevealed={pick.picksRevealed === true}
                              bookmakerKey={pick.bookmakerKey}
                              bookingCode={pick.bookingCode}
                              bookingCodeCopyCount={pick.bookingCodeCopyCount ?? 0}
                              isPurchased={isPurchased}
                              canPurchase={canPurchase}
                              walletBalance={walletBalance}
                              onPurchase={() => onPurchaseFeed(pick)}
                              purchasing={feedPurchasing === pick.id}
                              {...getPickCardSocialProps(pick, {
                                onCountsChange: onFeedCountsChange,
                                loginRedirectPath: currentLoginRedirectPath(loginPath),
                              })}
                            />
                          );
                        })}
                      </div>
                      <Link href="/marketplace" className="inline-block mt-3 text-sm font-medium text-[var(--primary)] hover:underline">
                        {t('dashboard.view_all_marketplace')}
                      </Link>
                    </div>
                  ) : following.length > 0 ? (
                    <p className="text-[var(--text-muted)] text-sm">
                      {t('dashboard.no_new_picks')}{' '}
                      <Link href="/tipsters" className="text-[var(--primary)] hover:underline">
                        {t('dashboard.follow_more')}
                      </Link>
                    </p>
                  ) : (
                    <p className="text-[var(--text-muted)] text-sm">
                      <Link href="/tipsters" className="text-[var(--primary)] hover:underline font-medium">
                        {t('dashboard.follow_more')}
                      </Link>{' '}
                      {t('dashboard.follow_tipsters')}
                    </p>
                  )}
                </div>
              </div>
            </section>
            ) : null}

            {surface === 'buy' && purchaseStats !== null ? (
              <section className="mb-6 sm:mb-8">
                <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3 px-0.5">
                  {t('dashboard.purchase_summary')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <StatCard title={t('dashboard.purchases')} value={purchaseStats.total} variant="slate" link="/my-purchases" glass index={4} />
                  <StatCard
                    title={t('dashboard.total_spent')}
                    value={purchaseStats.totalSpent}
                    format="currency"
                    displayValue={formatPrimary(purchaseStats.totalSpent)}
                    variant="slate"
                    glass
                    index={5}
                    hint={t('dashboard.total_spent_hint')}
                  />
                  <StatCard title={t('status.active')} value={purchaseStats.active} variant="slate" glass index={6} />
                </div>
                {purchaseStats.pendingEscrowAmount > 0 ? (
                  <p className="text-xs text-[var(--text-muted)] mt-3 px-0.5 leading-relaxed">
                    {t('dashboard.pending_escrow_note', {
                      amount: formatPrimary(purchaseStats.pendingEscrowAmount),
                    })}
                  </p>
                ) : null}
              </section>
            ) : null}

            {surface === 'sell' && tipsterStats && minimumROI !== null && minimumWinRate !== null ? (
              <section className="mb-6 sm:mb-8">
                <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-[var(--card)] border border-[var(--border)]">
                  <div className="p-5 sm:p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-6 min-w-0">
                      <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                        <div
                          className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                            canSellPaid
                              ? 'bg-[var(--success)] text-white'
                              : 'bg-[var(--accent)] text-white'
                          }`}
                        >
                          {canSellPaid ? (
                            <IconEarnings className="w-6 h-6 sm:w-7 sm:h-7" />
                          ) : (
                            <IconTrending className="w-6 h-6 sm:w-7 sm:h-7" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg sm:text-xl font-bold mb-1.5 ${canSellPaid ? 'text-[var(--success)]' : 'text-[var(--accent)]'}`}>
                            {canSellPaid ? t('dashboard.earn_ready') : t('dashboard.earn_build_performance')}
                          </h3>
                          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                            {canSellPaid
                              ? t('dashboard.earn_meets_both', {
                                  roi: tipsterStats.roi.toFixed(2),
                                  wr: String(tipsterStats.winRate),
                                  minRoi: String(minimumROI),
                                  minWr: String(minimumWinRate),
                                })
                              : t('dashboard.earn_below_detail', {
                                  roi: tipsterStats.roi.toFixed(2),
                                  minRoi: String(minimumROI),
                                  wr: String(tipsterStats.winRate),
                                  minWr: String(minimumWinRate),
                                })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 sm:flex-nowrap md:shrink-0 min-w-0">
                        {canSellPaid ? (
                          <>
                            <Link href="/create-pick" className={buttonClassName({ className: 'flex-1 sm:flex-none' })}>
                              {t('dashboard.create_paid_pick')}
                            </Link>
                            <Link href="/marketplace" className={buttonClassName({ variant: 'secondary', className: 'flex-1 sm:flex-none' })}>
                              {t('dashboard.marketplace')}
                            </Link>
                          </>
                        ) : (
                          <Link
                            href="/create-pick"
                            className={buttonClassName({ className: 'w-full sm:w-auto flex-1 sm:flex-none' })}
                          >
                            {t('dashboard.create_free_pick')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {surface === 'buy' ? (
            <section className="mb-6 sm:mb-8">
              <div className="rounded-[var(--radius)] overflow-hidden border border-[var(--separator)] bg-[var(--card)]">
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--border)]/80 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap min-w-0 sm:gap-3">
                  <h2 className="font-semibold text-[var(--text)] text-base sm:text-lg">{t('dashboard.recent_purchases')}</h2>
                  {purchases.length > 0 ? (
                    <Link href="/my-purchases" className="text-sm font-medium text-[var(--primary)] hover:underline w-fit">
                      {t('dashboard.view_all')}
                    </Link>
                  ) : null}
                </div>
                <div className="p-4 sm:p-6">
                  {purchases.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {purchases.slice(0, 5).map((purchase) => {
                        if (!purchase.pick) return null;
                        const totalOdds = Number(purchase.pick.totalOdds || 0);
                        const isActive = purchase.pick.status === 'active' && purchase.pick.result === 'pending';
                        return (
                          <Link
                            key={purchase.id}
                            href="/my-purchases"
                            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 p-3 sm:p-4 rounded-xl bg-[var(--bg)]/70 hover:bg-[var(--fill-secondary)] border border-transparent hover:border-[var(--separator)] transition-colors min-w-0"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                                {purchase.pick.totalPicks} picks · {totalOdds.toFixed(2)} odds
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-2 sm:gap-3 shrink-0 sm:justify-end w-full sm:w-auto min-w-0">
                              <span
                                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  isActive
                                    ? resultChipClass('active')
                                    : resultChipClass(purchase.pick.result)
                                }`}
                              >
                                {isActive
                                  ? t('status.active')
                                  : purchase.pick.result === 'won'
                                    ? t('status.won')
                                    : purchase.pick.result === 'lost'
                                      ? t('status.lost')
                                      : purchase.pick.status || '—'}
                              </span>
                              <span className="font-semibold text-[var(--text)] tabular-nums text-sm sm:text-base">
                                {formatPrimary(Number(purchase.purchasePrice || 0))}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 sm:py-12">
                      <p className="text-[var(--text-muted)] mb-4 sm:mb-6">{t('my_purchases.no_purchases')}</p>
                      <Link href="/marketplace" className={buttonClassName()}>
                        {t('my_purchases.browse_marketplace')}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </section>
            ) : null}
          </div>
        </PullToRefresh>
      </div>
    </DashboardShell>
  );
}
