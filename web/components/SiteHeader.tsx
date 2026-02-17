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
  { href: '/resources', label: 'Resource Centre' },
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
    <header className="sticky top-0 z-50 w-full bg-[var(--bg)]/80 backdrop-blur-xl border-b border-white/5 supports-[backdrop-filter]:bg-[var(--bg)]/60">
      <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[var(--primary)]/30 to-transparent opacity-50" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-xl text-[var(--text)] hover:text-white transition-colors group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--primary)] blur opacity-40 group-hover:opacity-60 transition-opacity rounded-xl" />
              <span className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white text-sm font-extrabold shadow-lg shadow-[var(--primary)]/20 border border-white/10">
                BR
              </span>
            </div>
            <span className="tracking-tight">BetRollover</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href + '/'));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                    ? 'text-white bg-white/5'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                    }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-[var(--primary)] rounded-full shadow-[0_0_8px_var(--primary)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-white font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/50 transition-all shadow-lg shadow-[var(--primary)]/5"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-white font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="group relative px-6 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg shadow-[var(--primary)]/20 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] transition-all group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <span className="relative">Get Started</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl text-[var(--text-muted)] hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10"
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
          <div className="md:hidden py-4 border-t border-white/5 animate-fade-in-up">
            <nav className="flex flex-col gap-1.5">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== '/' && pathname.startsWith(link.href + '/'));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl font-medium transition-colors ${isActive
                      ? 'text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20'
                      : 'text-[var(--text)] hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                {isSignedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-3 text-center rounded-xl font-medium border border-white/10 text-[var(--text)] hover:bg-white/5"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex-1 py-3 text-center rounded-xl font-semibold bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-3 text-center rounded-xl font-medium border border-white/10 text-[var(--text)] hover:bg-white/5 transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-3 text-center rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/20"
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
