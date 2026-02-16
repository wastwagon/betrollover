'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const navLinks = [
  { href: '/predictions', label: 'Smart Coupons' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/tipsters', label: 'Tipsters' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/news', label: 'News' },
];

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsSignedIn(!!localStorage.getItem('token'));
  }, [pathname]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    setIsSignedIn(false);
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--card)]/90 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl text-[var(--text)] hover:text-[var(--primary)] transition-colors group"
          >
            <span className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white text-sm font-extrabold shadow-md group-hover:bg-[var(--primary-hover)] transition-colors">
              BR
            </span>
            BetRollover
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href + '/'));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-medium transition-colors ${isActive
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--primary)]'
                    }`}
                >
                  <span className={isActive ? 'border-b-2 border-[var(--primary)] pb-0.5' : ''}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-2.5 text-[var(--text-muted)] hover:text-[var(--primary)] font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-5 py-2.5 rounded-xl font-semibold border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2.5 text-[var(--text-muted)] hover:text-[var(--primary)] font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-xl font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
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

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border)]">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== '/' && pathname.startsWith(link.href + '/'));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg font-medium ${isActive
                        ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                        : 'text-[var(--text)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]'
                      }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="flex gap-3 mt-4 px-4 pt-4 border-t border-[var(--border)]">
                {isSignedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-3 text-center rounded-xl font-medium border-2 border-[var(--border)] text-[var(--text)]"
                    >
                      Dashboard
                    </Link>
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
