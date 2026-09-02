import type { ComponentType } from 'react';
import {
  IconHome,
  IconDashboard,
  IconTrending,
  IconTarget,
  IconChart,
  IconPackage,
  IconStar,
  IconUsers,
  IconCart,
  IconBag,
  IconCreditCard,
  IconEarnings,
  IconChat,
  IconClipboard,
  IconShield,
  IconWallet,
  IconBell,
  IconLive,
  IconGlobe,
  IconBook,
  IconMegaphone,
  IconMail,
  IconSettings,
} from '@/components/ios/icons';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';

export type AdminNavItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  /** Default: both. Home/Dashboard stay sidebar-only. */
  where?: 'sidebar' | 'dashboard' | 'both';
};

export function getAdminNavItems(): AdminNavItem[] {
  const vip = isSubscriptionsEnabled();
  const items: AdminNavItem[] = [
    { href: '/', icon: IconHome, label: 'Home', where: 'sidebar' },
    { href: '/dashboard', icon: IconDashboard, label: 'Dashboard', where: 'sidebar' },
    { href: '/admin/analytics', icon: IconTrending, label: 'Analytics' },
    { href: '/admin/ai-predictions', icon: IconTarget, label: 'AI Predictions' },
    { href: '/admin/acca-desk', icon: IconChart, label: 'Acca Desk' },
  ];
  if (vip) {
    items.push(
      { href: '/admin/ai-tipster-packages', icon: IconPackage, label: 'AI Packages' },
      { href: '/admin/subscriptions', icon: IconStar, label: 'VIP subscribers' },
    );
  }
  items.push(
    { href: '/admin/users', icon: IconUsers, label: 'Users' },
    { href: '/admin/marketplace', icon: IconCart, label: 'Marketplace' },
    { href: '/admin/purchases', icon: IconBag, label: 'Purchases' },
    { href: '/admin/deposits', icon: IconCreditCard, label: 'Deposits' },
    { href: '/admin/withdrawals', icon: IconEarnings, label: 'Withdrawals' },
    { href: '/admin/support', icon: IconChat, label: 'Support' },
    { href: '/admin/audit-log', icon: IconClipboard, label: 'Audit log' },
    { href: '/admin/chat', icon: IconChat, label: 'Chat Moderation' },
    { href: '/admin/pick-comments', icon: IconChat, label: 'Pick Comments' },
    { href: '/admin/escrow', icon: IconShield, label: 'Escrow' },
    { href: '/admin/wallet', icon: IconWallet, label: 'Wallet' },
    { href: '/admin/notifications', icon: IconBell, label: 'Notifications' },
    { href: '/admin/fixtures', icon: IconLive, label: 'Fixtures' },
    { href: '/admin/sports', icon: IconGlobe, label: 'Multi-Sport' },
    { href: '/admin/content', icon: IconBook, label: 'Content' },
    { href: '/admin/news', icon: IconBook, label: 'News' },
    { href: '/admin/resources', icon: IconBook, label: 'Resources' },
    { href: '/admin/ads', icon: IconMegaphone, label: 'Ads' },
    { href: '/admin/email', icon: IconMail, label: 'Email' },
    { href: '/admin/settings', icon: IconSettings, label: 'Settings' },
  );
  return items;
}

export function adminNavFor(surface: 'sidebar' | 'dashboard'): AdminNavItem[] {
  return getAdminNavItems().filter((item) => {
    const where = item.where ?? 'both';
    return where === 'both' || where === surface;
  });
}
