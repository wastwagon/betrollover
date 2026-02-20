'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/site-config';

interface Notification {
  id: number;
  isRead: boolean;
}

interface UnifiedHeaderProps {
  slipCount?: number;
}


function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
}

export function UnifiedHeader({ slipCount }: UnifiedHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsSignedIn(!!localStorage.getItem('token'));
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setBalance(Number(data.balance)))
      .catch(() => {});
  }, [pathname, isSignedIn]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/notifications?limit=20`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: Notification[]) => setUnreadCount(arr.filter((n) => !n.isRead).length))
      .catch(() => {});
  }, [pathname, isSignedIn]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    setIsSignedIn(false);
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const navItems: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: '/', label: 'Home', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { href: '/#free-tip-of-the-day', label: 'Free Tip', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /> },
    { href: '/dashboard', label: 'Dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
    { href: '/tipsters', label: 'Tipsters', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { href: '/marketplace', label: 'Coupons', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> },
    { href: '/discover', label: 'Discover', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
  ];

  const renderNavLink = (href: string, label: string, icon: React.ReactNode) => {
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium transition-all duration-200 ${
          active
            ? 'bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/30 shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]/50 hover:border hover:border-[var(--primary)]/20'
        }`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-white via-emerald-50/95 to-teal-50/95 backdrop-blur-xl border-b border-emerald-100/80 shadow-md safe-area-inset-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[4.25rem] md:h-[4.5rem]">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-xl text-[var(--text)] hover:text-[var(--primary)] transition-colors group shrink-0"
          >
            <Image src="/BetRollover-logo.png" alt="BetRollover" width={56} height={56} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shadow-md group-hover:shadow-lg transition-shadow object-contain" priority />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-3">
            {navItems
              .filter((item) => item.href !== '/dashboard' || isSignedIn)
              .map((item) => (
                <span key={item.href}>{renderNavLink(item.href, item.label, item.icon)}</span>
              ))}
            {isSignedIn && (
              <Link
                href="/create-pick"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  isActive(pathname, '/create-pick')
                    ? 'bg-[var(--primary)] text-white shadow-md ring-2 ring-[var(--primary)]/30'
                    : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg hover:scale-[1.02]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Coupon
                {slipCount !== undefined && slipCount > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-white/25 text-white rounded-full">
                    {slipCount > 9 ? '9+' : slipCount}
                  </span>
                )}
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isSignedIn && balance !== null && (
              <Link
                href="/wallet"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-[var(--primary)] bg-[var(--primary-light)] hover:bg-emerald-100 border border-emerald-200/60 transition-all"
              >
                <span className="tabular-nums">GHS {balance.toFixed(2)}</span>
              </Link>
            )}
            {isSignedIn && (
              <Link
                href="/notifications"
                className="relative p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-warm)] transition-colors"
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
            )}
            {isSignedIn ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-warm)] transition-colors hidden sm:block"
                aria-label="Sign out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2.5 text-[var(--text-muted)] hover:text-[var(--primary)] font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors shadow-md hover:shadow-lg"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
              aria-label="Toggle menu"
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
            <nav className="flex flex-col gap-2">
              {navItems
                .filter((item) => item.href !== '/dashboard' || isSignedIn)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                      isActive(pathname, item.href)
                        ? 'text-[var(--primary)] bg-[var(--primary-light)] border border-[var(--primary)]/30'
                        : 'text-[var(--text)] hover:bg-[var(--primary-light)]/50 hover:text-[var(--primary)]'
                    }`}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {item.icon}
                    </svg>
                    {item.label}
                  </Link>
                ))}

              {isSignedIn && (
                <Link
                  href="/create-pick"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-base mt-1 ${
                    isActive(pathname, '/create-pick')
                      ? 'bg-[var(--primary)] text-white shadow-md ring-2 ring-[var(--primary)]/30'
                      : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Coupon
                  {slipCount !== undefined && slipCount > 0 && (
                    <span className="ml-0.5 min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold bg-white/25 text-white rounded-full">
                      {slipCount > 9 ? '9+' : slipCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Auth section (mobile) */}
              <div className="flex gap-3 mt-4 px-4 pt-4 border-t border-[var(--border)]">
                {isSignedIn ? (
                  <>
                    {balance !== null && (
                      <Link
                        href="/wallet"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 py-3 text-center rounded-xl font-bold text-[var(--primary)] bg-[var(--primary-light)] border border-emerald-200/60"
                      >
                        GHS {balance.toFixed(2)}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex-1 py-3 text-center rounded-xl font-semibold bg-[var(--primary)] text-white"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-3 text-center rounded-xl font-medium border-2 border-[var(--border)] text-[var(--text)]"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-3 text-center rounded-xl font-semibold bg-[var(--primary)] text-white"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
