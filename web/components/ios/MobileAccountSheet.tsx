'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BottomSheet } from './BottomSheet';
import { GroupedListSection, GroupedListButton } from './GroupedList';
import {
  IconDashboard,
  IconTable,
  IconPerson,
  IconWallet,
  IconEarnings,
  IconPicks,
  IconBag,
  IconStar,
  IconBell,
  IconLogout,
} from './icons';

export interface MobileAccountSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  doneLabel: string;
  logoutLabel: string;
  balance: number | null;
  balanceFormatted: string;
  walletLabel: string;
  pendingWithdrawalCount: number;
  unreadCount: number;
  onSignOut: () => void;
  labels: {
    dashboard: string;
    leagueTables: string;
    profile: string;
    wallet: string;
    earnings: string;
    myPicks: string;
    myPurchases: string;
    subscriptions: string;
    notifications: string;
  };
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function MobileAccountSheet({
  open,
  onClose,
  title,
  doneLabel,
  logoutLabel,
  balance,
  balanceFormatted,
  walletLabel,
  pendingWithdrawalCount,
  unreadCount,
  onSignOut,
  labels,
}: MobileAccountSheetProps) {
  const pathname = usePathname();
  const router = useRouter();

  const nav = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClose();
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    router.push(href);
  };

  const items = [
    { href: '/dashboard', icon: <IconDashboard />, label: labels.dashboard },
    { href: '/league-tables', icon: <IconTable />, label: labels.leagueTables },
    { href: '/profile', icon: <IconPerson />, label: labels.profile },
    {
      href: '/wallet',
      icon: <IconWallet />,
      label: labels.wallet,
      badge: pendingWithdrawalCount > 0 ? String(pendingWithdrawalCount) : undefined,
      badgeClassName: 'bg-amber-500',
    },
    { href: '/earnings', icon: <IconEarnings />, label: labels.earnings },
    { href: '/my-picks', icon: <IconPicks />, label: labels.myPicks },
    { href: '/my-purchases', icon: <IconBag />, label: labels.myPurchases },
    { href: '/subscriptions', icon: <IconStar />, label: labels.subscriptions },
    {
      href: '/notifications',
      icon: <IconBell />,
      label: labels.notifications,
      badge: unreadCount > 0 ? String(unreadCount) : undefined,
      badgeClassName: 'bg-red-500',
    },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title={title} doneLabel={doneLabel} maxHeightClass="max-h-[min(88dvh,640px)]">
      {balance !== null ? (
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">{walletLabel}</p>
          <p className="text-xl font-semibold text-[var(--text)] tabular-nums">{balanceFormatted}</p>
        </div>
      ) : null}
      <GroupedListSection className="mb-0 mt-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={nav(item.href)}
            className={`ios-list-row flex items-center gap-3 px-4 py-3 min-h-[44px] border-b border-[var(--separator)] last:border-b-0 transition-colors touch-manipulation ${
              isActive(pathname, item.href)
                ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                : 'text-[var(--text)] hover:bg-[var(--fill-secondary)]'
            }`}
          >
            <span className="shrink-0 text-[var(--primary)]">{item.icon}</span>
            <span className="flex-1 text-[15px]">{item.label}</span>
            {item.badge ? (
              <span
                className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-bold text-white rounded-full ${item.badgeClassName}`}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
        <GroupedListButton
          icon={<IconLogout />}
          label={logoutLabel}
          onClick={() => {
            onClose();
            onSignOut();
          }}
          destructive
        />
      </GroupedListSection>
    </BottomSheet>
  );
}
