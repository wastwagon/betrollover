'use client';

import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { useT } from '@/context/LanguageContext';
import {
  IconUsers,
  IconCart,
  IconBag,
  IconCreditCard,
  IconEarnings,
  IconShield,
  IconWallet,
  IconLive,
  IconGlobe,
  IconTrending,
  IconChart,
  IconTarget,
  IconBook,
  IconBell,
  IconMegaphone,
  IconMail,
  IconSettings,
  IconChat,
  IconBolt,
} from '@/components/ios/icons';
import { StatCard } from './StatCard';
import type { Stats, User } from './types';

const ADMIN_LINKS = [
  { href: '/admin/users', icon: IconUsers, label: 'Users' },
  { href: '/admin/marketplace', icon: IconCart, label: 'Marketplace' },
  { href: '/admin/purchases', icon: IconBag, label: 'Purchases' },
  { href: '/admin/deposits', icon: IconCreditCard, label: 'Deposits' },
  { href: '/admin/withdrawals', icon: IconEarnings, label: 'Withdrawals' },
  { href: '/admin/escrow', icon: IconShield, label: 'Escrow' },
  { href: '/admin/wallet', icon: IconWallet, label: 'Wallet' },
  { href: '/admin/fixtures', icon: IconLive, label: 'Fixtures' },
  { href: '/admin/sports', icon: IconGlobe, label: 'Multi-Sport Sync' },
  { href: '/admin/analytics', icon: IconTrending, label: 'Analytics' },
  { href: '/admin/analytics?tab=sports', icon: IconGlobe, label: 'Sports Analytics' },
  { href: '/admin/analytics?tab=acca', icon: IconChart, label: 'Acca Gen Analytics' },
  { href: '/admin/ai-predictions', icon: IconTarget, label: 'AI Predictions' },
  { href: '/admin/acca-desk', icon: IconChart, label: 'Acca Desk' },
  { href: '/admin/news', icon: IconBook, label: 'News' },
  { href: '/admin/content', icon: IconBook, label: 'Content Pages' },
  { href: '/admin/resources', icon: IconBook, label: 'Resources' },
  { href: '/admin/notifications', icon: IconBell, label: 'Notifications' },
  { href: '/admin/ads', icon: IconMegaphone, label: 'Ads' },
  { href: '/admin/email', icon: IconMail, label: 'Email Settings' },
  { href: '/admin/settings', icon: IconSettings, label: 'Settings' },
  { href: '/community', icon: IconChat, label: 'Community Chat' },
  { href: '/admin/chat', icon: IconShield, label: 'Chat Moderation' },
] as const;

export function AdminDashboardHome({
  user,
  stats,
  settling,
  onSettle,
}: {
  user: User | null;
  stats: Stats | null;
  settling: boolean;
  onSettle: () => void;
}) {
  const t = useT();
  const escrowHeld =
    stats?.escrow?.held != null
      ? `GHS ${Number(stats.escrow.held).toFixed(2)}${
          stats.escrow.heldPick != null && stats.escrow.heldSubscription != null
            ? ` (picks ${Number(stats.escrow.heldPick).toFixed(2)} · VIP ${Number(stats.escrow.heldSubscription).toFixed(2)})`
            : ''
        }`
      : '—';

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-shell min-w-0">
        <div className="px-4 pb-8 pt-4 md:p-6 max-w-[1600px] mx-auto w-full min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6 break-words">
            Welcome, {user?.displayName || 'Administrator'}!
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard
              title="Member accounts"
              hint="Users with role user or tipster (excludes admins)."
              value={stats?.users?.total ?? 0}
            />
            <StatCard
              title="Active tipster profiles"
              hint="tipsters.is_active — matches public homepage count."
              value={stats?.users?.tipsters ?? 0}
            />
            <StatCard title="Wallets" value={stats?.wallets?.count ?? 0} />
            <StatCard title="Total Balance (GHS)" value={stats?.wallets?.totalBalance ?? 0} format="currency" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard
              title={t('admin.stats_all_picks_title')}
              hint={t('admin.stats_all_picks_hint')}
              value={stats?.picks?.total ?? 0}
            />
            <StatCard
              title={t('admin.stats_marketplace_buyable_title')}
              hint={t('admin.stats_marketplace_buyable_hint')}
              value={stats?.picks?.liveMarketplace ?? 0}
            />
            <StatCard
              title={t('admin.stats_marketplace_active_title')}
              hint={t('admin.stats_marketplace_active_hint')}
              value={stats?.picks?.activeMarketplace ?? 0}
            />
            <StatCard title="Escrow Held (GHS)" value={stats?.escrow?.held ?? 0} format="currency" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard
              title="Total purchases"
              hint="All pick checkouts (includes non-marketplace paths)."
              value={stats?.purchases?.total ?? 0}
            />
            <StatCard
              title="Gross purchase revenue"
              hint="Sum of purchase prices (not platform commission or net tipster pay)."
              value={stats?.purchases?.revenue ?? 0}
              format="currency"
            />
            <StatCard
              title="Marketplace purchases"
              hint="Joined to pick_marketplace — aligns with public homepage."
              value={stats?.purchases?.marketplaceCount ?? 0}
            />
            <StatCard
              title="Marketplace revenue (GHS)"
              hint="Gross spend on marketplace-listed picks only."
              value={stats?.purchases?.marketplaceRevenue ?? 0}
              format="currency"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard title="Pending Deposits" value={stats?.deposits?.pending ?? 0} />
            <StatCard title="Pending Withdrawals" value={stats?.withdrawals?.pending ?? 0} link="/admin/withdrawals" />
          </div>

          <div className="mb-6 sm:mb-8 bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] p-4 sm:p-6 min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 min-w-0 sm:gap-3">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text)]">Sports Overview</h2>
              <span className="inline-flex w-fit items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-300">
                Football marketplace
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 max-w-xl min-w-0">
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center bg-emerald-50 border-emerald-200">
                <span className="text-xs font-semibold text-[var(--text)]">Football</span>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Public discovery is football-only. Multi-sport can be re-enabled via NEXT_PUBLIC_FOOTBALL_ONLY_DISCOVERY=false
              when API access is funded.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] p-4 sm:p-6 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-3 sm:mb-4">{t('dashboard.quick_actions')}</h2>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-1.5">
                {ADMIN_LINKS.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 py-2.5 min-h-[44px] px-3 rounded-lg text-sm bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium transition-colors active:opacity-90"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="truncate min-w-0">{label}</span>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={onSettle}
                  disabled={settling}
                  className="flex items-center gap-2 py-2.5 min-h-[44px] px-3 rounded-lg text-sm bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium text-left disabled:opacity-50 transition-colors min-[420px]:col-span-2"
                >
                  <IconBolt className="w-4 h-4" />
                  <span>{settling ? 'Running Settlement…' : 'Run Settlement Now'}</span>
                </button>
              </div>
            </div>

            <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] p-4 sm:p-6 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-3 sm:mb-4">Platform Overview</h2>
              <dl className="space-y-0 text-sm divide-y divide-[var(--border)]">
                {[
                  { label: 'Admin', value: user?.displayName ?? '—' },
                  { label: 'Email', value: user?.email ?? '—' },
                  { label: 'Members', value: stats?.users?.total != null ? `${stats.users.total}` : '—' },
                  { label: 'Active tipsters', value: stats?.users?.tipsters != null ? `${stats.users.tipsters}` : '—' },
                  {
                    label: 'Active listing rows',
                    value: stats?.picks?.activeMarketplace != null ? `${stats.picks.activeMarketplace}` : '—',
                  },
                  {
                    label: 'Live buyable (homepage)',
                    value: stats?.picks?.liveMarketplace != null ? `${stats.picks.liveMarketplace}` : '—',
                  },
                  { label: 'Escrow Held', value: escrowHeld },
                  {
                    label: 'Gross revenue (all purchases)',
                    value: stats?.purchases?.revenue != null ? `GHS ${Number(stats.purchases.revenue).toFixed(2)}` : '—',
                  },
                  {
                    label: 'Marketplace revenue',
                    value:
                      stats?.purchases?.marketplaceRevenue != null
                        ? `GHS ${Number(stats.purchases.marketplaceRevenue).toFixed(2)}`
                        : '—',
                  },
                  {
                    label: 'Pending Deposits',
                    value: stats?.deposits?.pending != null ? `${stats.deposits.pending}` : '—',
                    highlight: (stats?.deposits?.pending ?? 0) > 0,
                  },
                  {
                    label: 'Pending Withdrawals',
                    value: stats?.withdrawals?.pending != null ? `${stats.withdrawals.pending}` : '—',
                    highlight: (stats?.withdrawals?.pending ?? 0) > 0,
                  },
                  { label: 'Sports Active', value: '7 / 7 Live' },
                  { label: 'Multi-Sport Sync', value: undefined, link: { href: '/admin/sports', text: 'View Sync Status →' } },
                  { label: 'Fixtures', value: undefined, link: { href: '/admin/fixtures', text: 'View & Sync →' } },
                ].map(({ label, value, link, highlight }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-baseline py-2.5 sm:py-2 min-w-0 sm:gap-3"
                  >
                    <dt className="text-[var(--text-muted)] shrink-0">{label}</dt>
                    <dd
                      className={`font-medium sm:text-right min-w-0 break-words ${highlight ? 'text-amber-600' : 'text-[var(--text)]'}`}
                    >
                      {link ? (
                        <Link href={link.href} className="text-[var(--primary)] hover:underline inline-block">
                          {link.text}
                        </Link>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
