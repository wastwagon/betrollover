'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { getApiUrl } from '@/lib/site-config';

const mainNavItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  {
    label: 'Picks',
    children: [
      { href: '/create-pick', label: 'Create Pick' },
      { href: '/my-picks', label: 'My Picks' },
    ],
  },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/my-purchases', label: 'My Purchases' },
  {
    label: 'Account',
    children: [
      { href: '/wallet', label: 'Wallet' },
      { href: '/profile', label: 'Profile' },
    ],
  },
];

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface AppHeaderProps {
  slipCount?: number;
}

function NavLink({
  href,
  label,
  isActive,
  badge,
  onClick,
}: {
  href: string;
  label: string;
  isActive: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative py-3 px-1 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px ${
        isActive
          ? 'text-[var(--primary)] border-[var(--primary)]'
          : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text)]'
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-semibold bg-[var(--primary)]/15 text-[var(--primary)] rounded-full">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

export function AppHeader({ slipCount }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setBalance(Number(data.balance)))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/notifications?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close dropdown when route changes (e.g. after clicking Create Pick or My Picks)
  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isInGroup = (children: { href: string }[]) =>
    children.some((c) => c.href === pathname);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-[var(--border)] shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo - links to main site home */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-[var(--text)] hover:opacity-90 transition-opacity shrink-0 group"
          >
            <span className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold shadow-md group-hover:bg-[var(--primary-hover)] transition-colors">
              BR
            </span>
            <span className="tracking-tight">BetRollover</span>
          </Link>

          {/* Desktop nav - minimal, text-only with subtle active indicator */}
          <nav ref={dropdownRef} className="hidden lg:flex items-center gap-8">
            {mainNavItems.map((item) => {
              if ('href' in item && item.href) {
                const href = item.href;
                const isActive = pathname === href;
                const showBadge = href === '/create-pick' && slipCount !== undefined && slipCount > 0;
                return (
                  <NavLink
                    key={href}
                    href={href}
                    label={item.label}
                    isActive={isActive}
                    badge={showBadge ? slipCount : undefined}
                  />
                );
              }
              if (!('children' in item) || !item.children) return null;
              const group = item;
              const isActive = isInGroup(group.children);
              // Only open when user explicitly opens (hover/click), NOT when on child page - so dropdown closes after selection
              const isOpen = openDropdown === group.label;
              const showBadge = group.children.some((c) => c.href === '/create-pick') && slipCount !== undefined && slipCount > 0;
              return (
                <div
                  key={group.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(group.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((prev) => (prev === group.label ? null : group.label))}
                    className={`relative py-3 px-1 -mb-px text-sm font-medium transition-colors duration-200 border-b-2 ${
                      isActive
                        ? 'text-[var(--primary)] border-[var(--primary)]'
                        : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text)]'
                    }`}
                  >
                    {group.label}
                    {showBadge && (
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-semibold bg-[var(--primary)]/15 text-[var(--primary)] rounded-full">
                        {slipCount! > 9 ? '9+' : slipCount}
                      </span>
                    )}
                    <svg
                      className={`inline-block w-3.5 h-3.5 ml-1 -mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="absolute left-0 top-full pt-1 animate-fade-in">
                      <div className="py-2 min-w-[180px] bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-xl shadow-black/5">
                        {group.children.map((child) => {
                          const childActive = pathname === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setOpenDropdown(null)}
                              className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                                childActive
                                  ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                                  : 'text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]'
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right side - compact utilities */}
          <div className="flex items-center gap-4">
            {balance !== null && (
              <Link
                href="/wallet"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-[var(--primary)] bg-[var(--primary-light)] hover:bg-teal-100 border border-teal-200/60 transition-all duration-200"
              >
                <span className="tabular-nums">GHS {balance.toFixed(2)}</span>
              </Link>
            )}
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-[var(--accent)] text-white rounded-full ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden sm:block text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Sign out
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[var(--border)]">
            <nav className="flex flex-col gap-0.5">
              {mainNavItems.flatMap((item) => {
                if ('href' in item && item.href) {
                  const href = item.href;
                  const isActive = pathname === href;
                  const showBadge = href === '/create-pick' && slipCount !== undefined && slipCount > 0;
                  return [
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                          : 'text-[var(--text)] hover:bg-[var(--bg)]'
                      }`}
                    >
                      {item.label}
                      {showBadge && slipCount! > 0 && (
                        <span className="text-[10px] font-semibold bg-[var(--primary)]/20 text-[var(--primary)] rounded-full px-2 py-0.5">
                          {slipCount}
                        </span>
                      )}
                    </Link>,
                  ];
                }
                if (!('children' in item) || !item.children) return [];
                return item.children.map((child) => {
                  const isActive = pathname === child.href;
                  const showBadge = child.href === '/create-pick' && slipCount !== undefined && slipCount > 0;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                          : 'text-[var(--text)] hover:bg-[var(--bg)]'
                      }`}
                    >
                      {child.label}
                      {showBadge && slipCount! > 0 && (
                        <span className="text-[10px] font-semibold bg-[var(--primary)]/20 text-[var(--primary)] rounded-full px-2 py-0.5">
                          {slipCount}
                        </span>
                      )}
                    </Link>
                  );
                });
              })}
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex gap-3">
                {balance !== null && (
                  <Link
                    href="/wallet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2.5 text-center rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50"
                  >
                    GHS {balance.toFixed(2)}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg)]"
                >
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
