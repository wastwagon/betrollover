'use client';

import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
import { PageHeader } from '@/components/PageHeader';
import { useT } from '@/context/LanguageContext';
import { adminNavFor } from '@/lib/admin-nav';
import { IconBolt } from '@/components/ios/icons';
import { buttonClassName } from '@/components/ui/Button';
import { StatCard } from './StatCard';
import type { Stats, User } from './types';

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="text-[13px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em] mb-2 sm:mb-3 px-0.5">
      {children}
    </h2>
  );
}

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

  const overviewRows: Array<{
    label: string;
    value?: string;
    link?: { href: string; text: string };
    highlight?: boolean;
  }> = [
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
    { label: 'Pending settlement', value: escrowHeld, link: { href: '/admin/escrow', text: escrowHeld } },
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
      link: { href: '/admin/deposits', text: stats?.deposits?.pending != null ? `${stats.deposits.pending}` : '—' },
    },
    {
      label: 'Pending Withdrawals',
      value: stats?.withdrawals?.pending != null ? `${stats.withdrawals.pending}` : '—',
      highlight: (stats?.withdrawals?.pending ?? 0) > 0,
      link: {
        href: '/admin/withdrawals',
        text: stats?.withdrawals?.pending != null ? `${stats.withdrawals.pending}` : '—',
      },
    },
    { label: 'Discovery', value: 'Football marketplace' },
    { label: 'Multi-Sport Sync', link: { href: '/admin/sports', text: 'View sync status' } },
    { label: 'Fixtures', link: { href: '/admin/fixtures', text: 'View & sync' } },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--bg)] w-full min-w-0 max-w-full">
      <AdminSidebar />
      <main className="admin-main-sibling section-ux-admin-shell min-w-0">
        <div className="px-4 pb-10 pt-4 md:px-6 md:pt-6 max-w-[1600px] mx-auto w-full min-w-0">
          <PageHeader
            label="Admin"
            title={`Welcome, ${user?.displayName || 'Administrator'}`}
            tagline="Marketplace health, escrow, and settlement at a glance."
            action={
              <button
                type="button"
                onClick={onSettle}
                disabled={settling}
                className={buttonClassName({
                  className: 'inline-flex items-center gap-2 disabled:opacity-50',
                })}
              >
                <IconBolt className="w-4 h-4" />
                {settling ? 'Running settlement…' : 'Run settlement'}
              </button>
            }
          />

          <section className="mb-6 sm:mb-8">
            <SectionLabel>Accounts</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <StatCard
                title="Member accounts"
                hint="Users with role user or tipster (excludes admins)."
                value={stats?.users?.total ?? 0}
                glass
              />
              <StatCard
                title="Active tipster profiles"
                hint="tipsters.is_active — matches public homepage count."
                value={stats?.users?.tipsters ?? 0}
                glass
              />
              <StatCard title="Wallets" value={stats?.wallets?.count ?? 0} link="/admin/wallet" glass />
              <StatCard title="Total Balance (GHS)" value={stats?.wallets?.totalBalance ?? 0} format="currency" glass />
            </div>
          </section>

          <section className="mb-6 sm:mb-8">
            <SectionLabel>Marketplace picks</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <StatCard
                title={t('admin.stats_all_picks_title')}
                hint={t('admin.stats_all_picks_hint')}
                value={stats?.picks?.total ?? 0}
                glass
              />
              <StatCard
                title={t('admin.stats_marketplace_buyable_title')}
                hint={t('admin.stats_marketplace_buyable_hint')}
                value={stats?.picks?.liveMarketplace ?? 0}
                glass
              />
              <StatCard
                title={t('admin.stats_marketplace_active_title')}
                hint={t('admin.stats_marketplace_active_hint')}
                value={stats?.picks?.activeMarketplace ?? 0}
                glass
              />
            </div>
          </section>

          <section className="mb-6 sm:mb-8">
            <SectionLabel>Purchases</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <StatCard
                title="Total purchases"
                hint="All pick checkouts (includes non-marketplace paths)."
                value={stats?.purchases?.total ?? 0}
                glass
              />
              <StatCard
                title="Gross purchase revenue"
                hint="Sum of purchase prices (not platform commission or net tipster pay)."
                value={stats?.purchases?.revenue ?? 0}
                format="currency"
                glass
              />
              <StatCard
                title="Marketplace purchases"
                hint="Joined to pick_marketplace — aligns with public homepage."
                value={stats?.purchases?.marketplaceCount ?? 0}
                glass
              />
              <StatCard
                title="Marketplace revenue (GHS)"
                hint="Gross spend on marketplace-listed picks only."
                value={stats?.purchases?.marketplaceRevenue ?? 0}
                format="currency"
                glass
              />
            </div>
          </section>

          <section className="mb-6 sm:mb-8">
            <SectionLabel>Ops queue</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <StatCard title="Pending Deposits" value={stats?.deposits?.pending ?? 0} link="/admin/deposits" variant="amber" glass />
              <StatCard
                title="Pending Withdrawals"
                value={stats?.withdrawals?.pending ?? 0}
                link="/admin/withdrawals"
                variant="amber"
                glass
              />
              <StatCard
                title="Pending settlement (GHS)"
                value={stats?.escrow?.held ?? 0}
                format="currency"
                link="/admin/escrow"
                glass
              />
            </div>
          </section>

          <section className="mb-6 sm:mb-8">
            <SectionLabel>Sports overview</SectionLabel>
            <div className="ios-grouped-section p-4 sm:p-5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center rounded-full bg-[var(--fill-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                  Football marketplace
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                Public discovery is football-only. Multi-sport can be re-enabled via{' '}
                <code className="text-[12px] text-[var(--text)]">NEXT_PUBLIC_FOOTBALL_ONLY_DISCOVERY=false</code> when API
                access is funded.
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <section className="min-w-0">
              <SectionLabel>{t('dashboard.quick_actions')}</SectionLabel>
              <div className="ios-grouped-section overflow-hidden divide-y divide-[var(--separator)]">
                {adminNavFor('dashboard').map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-4 py-3.5 sm:px-5 min-h-[48px] text-[15px] font-medium text-[var(--text)] hover:bg-[var(--fill-secondary)]/50 transition-colors"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--fill-secondary)] text-[var(--text-muted)]">
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="truncate min-w-0 flex-1">{label}</span>
                    <span className="text-[var(--text-tertiary)] text-sm" aria-hidden>
                      ›
                    </span>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={onSettle}
                  disabled={settling}
                  className="flex w-full items-center gap-3 px-4 py-3.5 sm:px-5 min-h-[48px] text-left text-[15px] font-medium text-[var(--text)] hover:bg-[var(--fill-secondary)]/50 transition-colors disabled:opacity-50"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--fill-secondary)] text-[var(--text-muted)]">
                    <IconBolt className="w-[18px] h-[18px]" />
                  </span>
                  <span className="truncate min-w-0 flex-1">
                    {settling ? 'Running settlement…' : 'Run settlement now'}
                  </span>
                </button>
              </div>
            </section>

            <section className="min-w-0">
              <SectionLabel>Platform overview</SectionLabel>
              <dl className="ios-grouped-section overflow-hidden divide-y divide-[var(--separator)] text-[14px]">
                {overviewRows.map(({ label, value, link, highlight }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-baseline px-4 py-3 sm:px-5 min-w-0 sm:gap-3"
                  >
                    <dt className="text-[var(--text-muted)] shrink-0">{label}</dt>
                    <dd
                      className={`font-medium sm:text-right min-w-0 break-words ${
                        highlight ? 'text-[var(--accent)]' : 'text-[var(--text)]'
                      }`}
                    >
                      {link ? (
                        <Link href={link.href} className="text-[var(--primary)] font-semibold hover:underline inline-block">
                          {link.text}
                        </Link>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
