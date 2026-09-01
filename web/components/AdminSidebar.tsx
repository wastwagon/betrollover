'use client';

import { useState, useEffect, useCallback, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { emitAuthStorageSync } from '@/lib/auth-storage-sync';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
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
  IconLogout,
} from '@/components/ios/icons';

type MenuItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
};

const menuItems: MenuItem[] = [
  { href: '/', icon: IconHome, label: 'Home' },
  { href: '/dashboard', icon: IconDashboard, label: 'Dashboard' },
  { href: '/admin/analytics', icon: IconTrending, label: 'Analytics' },
  { href: '/admin/ai-predictions', icon: IconTarget, label: 'AI Predictions' },
  { href: '/admin/acca-desk', icon: IconChart, label: 'Acca Desk' },
  ...(isSubscriptionsEnabled()
    ? [
        { href: '/admin/ai-tipster-packages', icon: IconPackage, label: 'AI Packages' },
        { href: '/admin/subscriptions', icon: IconStar, label: 'VIP subscribers' },
      ]
    : []),
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
];

function SidebarContent({
  onItemClick,
  linkMode = 'default',
}: {
  onItemClick: () => void;
  /** Mobile drawer: avoid full-screen backdrop eating taps + force client navigation from portal */
  linkMode?: 'default' | 'spa-push';
}) {
  const pathname = usePathname();
  const router = useRouter();

  const onNavLink = useCallback(
    (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      onItemClick();
      if (linkMode !== 'spa-push') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      router.push(href);
    },
    [onItemClick, linkMode, router],
  );

  return (
    <>
      <div className="p-4 border-b border-[var(--border)] shrink-0 min-w-0">
        <div className="flex items-center justify-between min-w-0 gap-2">
          <Link
            href="/dashboard"
            onClick={onNavLink('/dashboard')}
            className="font-bold text-lg text-[var(--text)] hover:text-[var(--primary)] transition-colors min-w-0 truncate"
          >
            BetRollover Admin
          </Link>
        </div>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as const }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavLink(item.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-w-0 ${
                isActive ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--border)] shrink-0">
        <Link
          href="/"
          onClick={(e) => {
            localStorage.removeItem('token');
            emitAuthStorageSync();
            onItemClick();
            if (linkMode === 'spa-push') {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              router.push('/');
            }
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors min-w-0"
        >
          <IconLogout className="w-5 h-5" />
          <span className="text-sm font-medium min-w-0 truncate">Sign Out</span>
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lock body scroll when mobile drawer is open
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleItemClick = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* Hamburger button — visible on mobile only, positioned to not overlap content */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="admin-mobile-nav-trigger md:hidden fixed left-4 z-[60] p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors shadow-lg top-[calc(env(safe-area-inset-top,0px)+0.75rem)]"
        aria-label="Open admin menu"
        aria-expanded={mobileOpen}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop sidebar — always visible on md+ */}
      <aside className="hidden md:flex w-56 min-h-screen min-w-0 bg-[var(--card)] border-r border-[var(--border)] flex-col fixed left-0 top-0 bottom-0 z-50 shadow-card overflow-x-hidden">
        <SidebarContent onItemClick={() => {}} linkMode="default" />
      </aside>

      {/* Mobile drawer — portal; drawer first, backdrop only beside it (no overlay on menu taps) */}
      {mobileOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex flex-row md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation menu"
        >
          <div
            className="relative z-10 w-[280px] sm:w-[320px] max-w-[85vw] shrink-0 min-w-0 h-full min-h-[100dvh] min-h-screen bg-[var(--card)] border-r border-[var(--border)] shadow-2xl flex flex-col animate-slide-in-left pointer-events-auto overflow-x-hidden"
            style={{
              paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
              paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="p-4 border-b border-[var(--border)] shrink-0 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <h2 className="text-base font-semibold text-[var(--text)] min-w-0 flex-1 truncate pr-2">BetRollover Admin</h2>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <SidebarContent onItemClick={handleItemClick} linkMode="spa-push" />
          </div>
          <button
            type="button"
            className="flex-1 min-w-0 min-h-0 self-stretch bg-black/50"
            style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        </div>,
        document.body
      )}
    </>
  );
}
