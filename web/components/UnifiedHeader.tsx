'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/site-config';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { trackEvent } from '@/lib/analytics';

/* ─── Types ─────────────────────────────────────────────── */
interface Notification { id: number; isRead: boolean }
interface UnifiedHeaderProps { slipCount?: number }

type MenuKey = 'browse' | 'tipsters' | 'discover' | 'account' | null;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

/* ─── Sport coverage data ────────────────────────────────── */
const SPORTS = [
  { icon: '⚽', label: 'Football',        href: '/marketplace?sport=football' },
  { icon: '🏀', label: 'Basketball',      href: '/marketplace?sport=basketball' },
  { icon: '🏉', label: 'Rugby',           href: '/marketplace?sport=rugby' },
  { icon: '🥊', label: 'MMA',             href: '/marketplace?sport=mma' },
  { icon: '🏐', label: 'Volleyball',      href: '/marketplace?sport=volleyball' },
  { icon: '🏒', label: 'Hockey',          href: '/marketplace?sport=hockey' },
  { icon: '🏈', label: 'Amer. Football',  href: '/marketplace?sport=american_football' },
  { icon: '🎾', label: 'Tennis',          href: '/marketplace?sport=tennis' },
];

/* ─── NavChevron ─────────────────────────────────────────── */
function NavChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/* ─── MegaLink ───────────────────────────────────────────── */
function MegaLink({
  href, icon, label, desc, badge, badgeColor, onClick,
}: {
  href: string; icon: string; label: string; desc?: string;
  badge?: string; badgeColor?: string; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/80 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
    >
      <span className="text-xl leading-none mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-nowrap">
          <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors whitespace-nowrap">{label}</span>
          {badge && (
            <span className={`inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${badgeColor}`}>{badge}</span>
          )}
        </div>
        {desc && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>}
      </div>
    </Link>
  );
}

/* ─── SectionLabel ───────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{children}</p>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export function UnifiedHeader({ slipCount }: UnifiedHeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { t } = useLanguage();
  const { format, currency } = useCurrency();

  const [isSignedIn,       setIsSignedIn]       = useState(false);
  const [balance,          setBalance]          = useState<number | null>(null);
  const [unreadCount,      setUnreadCount]      = useState(0);
  const [openMenu,         setOpenMenu]         = useState<MenuKey>(null);
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [mobileSection,    setMobileSection]    = useState<MenuKey>(null);

  const hoverTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef     = useRef<HTMLElement>(null);

  /* ── Auth / data ─────────────────────────────────────── */
  useEffect(() => {
    setIsSignedIn(!!localStorage.getItem('token'));
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => d && setBalance(+d.balance)).catch(() => {});
  }, [pathname, isSignedIn]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${getApiUrl()}/notifications?limit=20`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((arr: Notification[]) => setUnreadCount(arr.filter(n => !n.isRead).length))
      .catch(() => {});
  }, [pathname, isSignedIn]);

  /* ── Close on outside click / Escape ─────────────────── */
  const closeAll = useCallback(() => setOpenMenu(null), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeAll(); }
    function onClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) closeAll();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [closeAll]);

  // Close mega menu on route change
  useEffect(() => { closeAll(); setMobileOpen(false); }, [pathname, closeAll]);

  // Track Account mega menu opens
  useEffect(() => {
    if (openMenu === 'account') trackEvent('account_menu_open');
  }, [openMenu]);

  /* ── Hover helpers ────────────────────────────────────── */
  const openAfterDelay  = (key: MenuKey) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setOpenMenu(key), 80);
  };
  const closeAfterDelay = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setOpenMenu(null), 120);
  };
  const cancelClose = () => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); };

  const signOut = () => {
    localStorage.removeItem('token');
    setIsSignedIn(false); setMobileOpen(false);
    router.push('/'); router.refresh();
  };

  /* ── Mega panel wrappers ──────────────────────────────── */
  const MegaWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-0 z-50 animate-mega-in"
      onMouseEnter={cancelClose}
      onMouseLeave={closeAfterDelay}
    >
      {/* Arrow */}
      <div className="flex justify-center -mb-px">
        <div className="w-3 h-3 bg-white border-l border-t border-slate-200/80 rotate-45 shadow-sm" />
      </div>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden ring-1 ring-black/5">
        {children}
      </div>
    </div>
  );

  const MegaWrapperRight = ({ children }: { children: React.ReactNode }) => (
    <div
      className="absolute top-full right-0 mt-0 z-50 animate-mega-in"
      onMouseEnter={cancelClose}
      onMouseLeave={closeAfterDelay}
    >
      {/* Arrow (right-aligned) */}
      <div className="flex justify-end pr-6 -mb-px">
        <div className="w-3 h-3 bg-white border-l border-t border-slate-200/80 rotate-45 shadow-sm" />
      </div>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden ring-1 ring-black/5">
        {children}
      </div>
    </div>
  );

  /* ── Desktop nav item ────────────────────────────────── */
  const NavBtn = ({
    menuKey, label, href,
  }: { menuKey?: MenuKey; label: string; href?: string }) => {
    const active = href ? isActive(pathname, href) : false;
    const isOpen = menuKey ? openMenu === menuKey : false;
    const cls = `flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 select-none ${
      active || isOpen
        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60'
    }`;

    if (href && !menuKey) {
      return (
        <Link href={href} className={cls}>
          {label}
        </Link>
      );
    }
    return (
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cls}
        onMouseEnter={() => openAfterDelay(menuKey!)}
        onMouseLeave={closeAfterDelay}
        onFocus={() => setOpenMenu(menuKey!)}
        onClick={() => setOpenMenu(isOpen ? null : menuKey!)}
      >
        {label}
        {menuKey && <NavChevron open={isOpen} />}
      </button>
    );
  };

  /* ─────────────────────────────────────────────────────── */
  return (
    <>
      {/* Inject keyframe animation */}
      <style>{`
        @keyframes megaIn {
          from { opacity:0; transform:translateX(-50%) translateY(-6px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        .animate-mega-in { animation: megaIn 0.18s ease both; }
      `}</style>

      <header
        ref={headerRef}
        className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/70 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[4.5rem]">

            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="BetRollover home">
              <Image
                src="/BetRollover-logo.png" alt="BetRollover"
                width={52} height={52}
                className="w-11 h-11 rounded-xl shadow-md group-hover:shadow-lg transition-shadow object-contain"
                priority
              />
              <span className="hidden sm:block font-bold text-base text-slate-800 group-hover:text-emerald-700 transition-colors">
                BetRollover
              </span>
            </Link>

            {/* ── Desktop nav ── */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">

              {/* Home */}
              <NavBtn href="/" label="Home" />

              {/* Browse ▾ */}
              <div className="relative"
                onMouseEnter={() => openAfterDelay('browse')}
                onMouseLeave={closeAfterDelay}
              >
                <NavBtn menuKey="browse" label="Browse" />

                {openMenu === 'browse' && (
                  <MegaWrapper>
                    <div className="flex w-[860px]">

                      {/* Col 1 — Coupons & Picks */}
                      <div className="w-64 border-r border-slate-100 py-3 px-2">
                        <SectionLabel>Coupons & Picks</SectionLabel>
                        <MegaLink href="/marketplace"     icon="🛒" label={t("nav.marketplace")}      desc="Browse & buy verified tips"    onClick={closeAll} />
                        <MegaLink href="/coupons/archive" icon="📦" label="Settled Archive"  desc="Past results & history"        onClick={closeAll} />
                        <div className="my-2 border-t border-slate-100" />
                        <SectionLabel>Platform</SectionLabel>
                        <MegaLink href="/leaderboard" icon="🏆" label="Leaderboard"   desc="Top tipsters by ROI & wins"      onClick={closeAll} />
                        <MegaLink href="/tipsters"    icon="👥" label="Find Tipsters" desc="Browse verified tipster profiles" onClick={closeAll} />
                      </div>

                      {/* Col 2 — Sports Coverage (3-column grid so labels never wrap) */}
                      <div className="flex-1 py-3 px-2">
                        <SectionLabel>Sports Coverage</SectionLabel>
                        <div className="grid grid-cols-2 gap-0.5">
                          {SPORTS.map(s => (
                            <MegaLink
                              key={s.label}
                              href={s.href}
                              icon={s.icon}
                              label={s.label}
                              onClick={closeAll}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Col 3 — Highlight panel */}
                      <div className="w-52 bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-5 px-4 flex flex-col justify-between">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wide mb-3">
                            🔥 Live Now
                          </span>
                          <p className="text-sm font-bold leading-snug mb-1">All 7 Sports Live</p>
                          <p className="text-xs text-emerald-100 leading-relaxed">
                            Football · Basketball · Rugby · MMA · Volleyball · Hockey · Amer. Football
                          </p>
                        </div>
                        <Link
                          href="/marketplace"
                          onClick={closeAll}
                          className="mt-4 block text-center text-xs font-bold py-2 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          Browse Marketplace →
                        </Link>
                      </div>
                    </div>
                  </MegaWrapper>
                )}
              </div>

              {/* Tipsters ▾ */}
              <div className="relative"
                onMouseEnter={() => openAfterDelay('tipsters')}
                onMouseLeave={closeAfterDelay}
              >
                <NavBtn menuKey="tipsters" label={t("nav.tipsters")} />

                {openMenu === 'tipsters' && (
                  <MegaWrapper>
                    <div className="flex w-[620px]">

                      {/* Col 1 */}
                      <div className="w-64 border-r border-slate-100 py-3 px-2">
                        <SectionLabel>Discover Tipsters</SectionLabel>
                        <MegaLink href="/tipsters"              icon="🔍" label="Browse All"    desc="Search 100+ verified tipsters"  onClick={closeAll} />
                        <MegaLink href="/leaderboard"           icon="🏆" label="Leaderboard"   desc="Ranked by ROI, win rate & more" onClick={closeAll} />
                        <MegaLink href="/tipsters?sort=winRate" icon="📈" label="Top Win Rate"  desc="Highest % winners this month"   onClick={closeAll} />
                        <MegaLink href="/tipsters?sort=roi"     icon="💹" label="Best ROI"      desc="Best return on investment"      onClick={closeAll} />
                      </div>

                      {/* Col 2 — Become a Tipster */}
                      <div className="flex-1 py-3 px-2">
                        <SectionLabel>Become a Tipster</SectionLabel>
                        <MegaLink href="/register"    icon="🚀" label="Get Started"          desc="Create your tipster profile free"  onClick={closeAll} />
                        <MegaLink href="/create-pick" icon="🎯" label="Create Coupon"        desc="Share your tips & earn from sales" onClick={closeAll} />
                        <MegaLink href="/dashboard/subscription-packages" icon="📦" label="Subscription Packages" desc="Set recurring tip subscriptions" onClick={closeAll} />
                        <div className="mt-3 mx-1 p-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                          <p className="text-xs font-bold mb-1">🛡️ Escrow Protection</p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">Every coupon is backed by our escrow system. Buyers get refunded on lost picks.</p>
                        </div>
                      </div>
                    </div>
                  </MegaWrapper>
                )}
              </div>

              {/* Discover ▾ */}
              <div className="relative"
                onMouseEnter={() => openAfterDelay('discover')}
                onMouseLeave={closeAfterDelay}
              >
                <NavBtn menuKey="discover" label={t("nav.discover")} />

                {openMenu === 'discover' && (
                  <MegaWrapper>
                    <div className="flex w-[660px]">

                      {/* Col 1 — Content */}
                      <div className="w-64 border-r border-slate-100 py-3 px-2">
                        <SectionLabel>Explore</SectionLabel>
                        <MegaLink href="/news"      icon="📰" label="News"           desc="Sports news, transfers & injuries" onClick={closeAll} />
                        <MegaLink href="/resources" icon="📚" label="Tipster Guides" desc="Strategy & how-tos"                onClick={closeAll} />
                        <div className="my-2 border-t border-slate-100" />
                        <SectionLabel>Platform Info</SectionLabel>
                        <MegaLink href="/how-it-works" icon="📖" label="How It Works" desc="Escrow, settlement & verification" onClick={closeAll} />
                        <MegaLink href="/community" icon="💬" label="Community Chat" desc="Live sport chat rooms" onClick={closeAll} />
                        <MegaLink href="/about"   icon="ℹ️" label="About Us" desc="Our mission & team"        onClick={closeAll} />
                        <MegaLink href="/contact" icon="✉️" label="Contact"   desc="Get in touch with support" onClick={closeAll} />
                      </div>

                      {/* Col 2 — Trust & Legal */}
                      <div className="flex-1 py-3 px-2">
                        <SectionLabel>Trust & Safety</SectionLabel>
                        <MegaLink href="/responsible-gambling" icon="🛡️" label="Responsible Use" desc="Using our platform safely & responsibly" onClick={closeAll} />
                        <MegaLink href="/terms"   icon="📋" label="Terms of Service" desc="Platform rules & conditions" onClick={closeAll} />
                        <MegaLink href="/privacy" icon="🔒" label="Privacy Policy"   desc="How we protect your data"    onClick={closeAll} />
                        <div className="mt-3 mx-1 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                          <p className="text-xs font-bold text-emerald-800 mb-1">18+ Only</p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">BetRollover is an educational tipster platform. Use responsibly and within your means.</p>
                        </div>
                      </div>
                    </div>
                  </MegaWrapper>
                )}
              </div>

              {/* Dashboard (auth only) */}
              {isSignedIn && <NavBtn href="/dashboard" label={t("nav.dashboard")} />}

              {/* Divider */}
              <div className="w-px h-6 bg-slate-200 mx-1.5" />

              {/* Create Coupon CTA */}
              {isSignedIn && (
                <Link
                  href="/create-pick"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    isActive(pathname, '/create-pick')
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-md hover:shadow-lg hover:scale-[1.02]'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('nav.create_coupon')}
                  {slipCount !== undefined && slipCount > 0 && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-white/25 text-white rounded-full">
                      {slipCount > 9 ? '9+' : slipCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Guest CTAs */}
              {!isSignedIn && (
                <>
                  <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors">
                    {t('nav.login')}
                  </Link>
                  <Link href="/register" className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-md hover:shadow-lg transition-all">
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </nav>

            {/* ── Right side (auth utils) ── */}
            {isSignedIn && (
              <div className="hidden lg:flex items-center gap-2">
                {/* Wallet */}
                {balance !== null && (
                  <Link
                    href="/wallet"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-all"
                    aria-label={`Wallet balance: ${format(balance).primary}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {format(balance).primary}
                    {currency.code !== 'GHS' && (
                      <span className="text-[10px] font-normal opacity-80">GHS {balance.toFixed(2)}</span>
                    )}
                  </Link>
                )}

                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label={unreadCount > 0 ? `Notifications: ${unreadCount} unread` : 'Notifications'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Account ▾ */}
                <div className="relative"
                  onMouseEnter={() => openAfterDelay('account')}
                  onMouseLeave={closeAfterDelay}
                >
                  <button
                    type="button"
                    aria-expanded={openMenu === 'account'}
                    aria-haspopup="true"
                    aria-label="My account"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      openMenu === 'account'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60'
                    }`}
                    onMouseEnter={() => openAfterDelay('account')}
                    onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Account
                    <NavChevron open={openMenu === 'account'} />
                  </button>

                  {openMenu === 'account' && (
                    <MegaWrapperRight>
                      <div className="flex w-[520px]">
                        {/* Col 1 — Profile & Activity */}
                        <div className="w-64 border-r border-slate-100 py-4 px-2">
                          <SectionLabel>My Account</SectionLabel>
                          {[
                            { href: '/profile',       icon: '👤', label: 'My Profile',       desc: 'Edit info & avatar' },
                            { href: '/dashboard',     icon: '📊', label: 'Dashboard',         desc: 'Stats & overview' },
                            { href: '/wallet',        icon: '💰', label: 'Wallet',            desc: 'Balance, deposit, withdraw' },
                            { href: '/earnings',      icon: '📈', label: 'Earnings',          desc: 'Revenue, payouts & stats' },
                          ].map(item => (
                            <MegaLink key={item.href} href={item.href} icon={item.icon} label={item.label} desc={item.desc} onClick={closeAll} />
                          ))}
                        </div>
                        {/* Col 2 — Picks & Subscriptions */}
                        <div className="flex-1 py-4 px-2">
                          <SectionLabel>Activity</SectionLabel>
                          {[
                            { href: '/my-picks',      icon: '🎯', label: 'My Picks',          desc: 'Coupons you created' },
                            { href: '/my-purchases',  icon: '🛍️', label: 'My Purchases',      desc: 'Coupons you bought' },
                            { href: '/subscriptions', icon: '🔔', label: 'Subscriptions',     desc: 'Your active tipster feeds' },
                            { href: '/notifications', icon: '🛎️', label: 'Notifications',     desc: unreadCount > 0 ? `${unreadCount} unread` : 'All caught up', badge: unreadCount > 0 ? String(unreadCount) : undefined, badgeColor: 'bg-red-100 text-red-600' },
                          ].map(item => (
                            <MegaLink key={item.href} href={item.href} icon={item.icon} label={item.label} desc={item.desc} badge={item.badge} badgeColor={item.badgeColor} onClick={closeAll} />
                          ))}
                        </div>
                        {/* Col 3 — Sign out panel */}
                        <div className="w-44 bg-gradient-to-br from-slate-50 to-slate-100/80 py-5 px-4 flex flex-col justify-between border-l border-slate-100">
                          <div>
                            {balance !== null && (
                              <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/60">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Balance</p>
                                <p className="text-sm font-bold text-emerald-800">{format(balance).primary}</p>
                                {currency.code !== 'GHS' && (
                                  <p className="text-[10px] text-emerald-600/80 mt-0.5">GHS {balance.toFixed(2)}</p>
                                )}
                              </div>
                            )}
                            <p className="text-[11px] text-slate-500 leading-relaxed">Manage your account and activity.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { signOut(); closeAll(); }}
                            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors"
                            aria-label="Sign out of your account"
                          >
                            <span aria-hidden>🚪</span>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </MegaWrapperRight>
                  )}
                </div>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2.5 rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* ──────────────── Mobile menu ──────────────── */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white max-h-[80vh] overflow-y-auto">
            <nav className="px-4 py-4 space-y-1" aria-label="Mobile navigation">

              {/* Home */}
              <Link href="/" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive(pathname, '/') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                🏠 Home
              </Link>

              {/* Browse section */}
              <div>
                <button
                  type="button"
                  onClick={() => setMobileSection(mobileSection === 'browse' ? null : 'browse')}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                  aria-expanded={mobileSection === 'browse'}
                >
                  <span>🎟️ Browse Coupons</span>
                  <NavChevron open={mobileSection === 'browse'} />
                </button>
                {mobileSection === 'browse' && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald-100 pl-3">
                    {[
                      { href: '/marketplace',      label: 'Marketplace',      icon: '🛒' },
                      { href: '/coupons/archive',  label: 'Settled Archive',  icon: '📦' },
                      { href: '/leaderboard',      label: 'Leaderboard',      icon: '🏆' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive(pathname, item.href) ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <span>{item.icon}</span>{item.label}
                      </Link>
                    ))}
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Sports</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SPORTS.map(s => (
                          <Link key={s.label} href={s.href} onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                            {s.icon} {s.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tipsters section */}
              <div>
                <button
                  type="button"
                  onClick={() => setMobileSection(mobileSection === 'tipsters' ? null : 'tipsters')}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                  aria-expanded={mobileSection === 'tipsters'}
                >
                  <span>👥 Tipsters</span>
                  <NavChevron open={mobileSection === 'tipsters'} />
                </button>
                {mobileSection === 'tipsters' && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald-100 pl-3">
                    {[
                      { href: '/tipsters',    label: 'Browse Tipsters',        icon: '🔍' },
                      { href: '/leaderboard', label: 'Leaderboard',            icon: '🏆' },
                      { href: '/create-pick', label: 'Create Coupon',          icon: '🎯' },
                      { href: '/dashboard/subscription-packages', label: 'My Packages', icon: '📦' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive(pathname, item.href) ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <span>{item.icon}</span>{item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Discover section */}
              <div>
                <button
                  type="button"
                  onClick={() => setMobileSection(mobileSection === 'discover' ? null : 'discover')}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                  aria-expanded={mobileSection === 'discover'}
                >
                  <span>🔭 Discover</span>
                  <NavChevron open={mobileSection === 'discover'} />
                </button>
                {mobileSection === 'discover' && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald-100 pl-3">
                    {[
                      { href: '/news',                  label: 'News',                  icon: '📰' },
                      { href: '/resources',             label: 'Tipster Guides',        icon: '📚' },
                      { href: '/about',                 label: 'About Us',              icon: 'ℹ️' },
                      { href: '/contact',               label: 'Contact',               icon: '✉️' },
                      { href: '/responsible-gambling',  label: 'Responsible Use',       icon: '🛡️' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive(pathname, item.href) ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <span>{item.icon}</span>{item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Dashboard (auth) */}
              {isSignedIn && (
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive(pathname, '/dashboard') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                  📊 Dashboard
                </Link>
              )}

              {/* Create Coupon CTA (auth) */}
              {isSignedIn && (
                <Link href="/create-pick" onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('nav.create_coupon')}
                  {slipCount !== undefined && slipCount > 0 && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-bold bg-white/25 rounded-full">{slipCount}</span>
                  )}
                </Link>
              )}

              {/* Auth account section (mobile) */}
              {isSignedIn && (
                <div className="mt-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMobileSection(mobileSection === 'account' ? null : 'account')}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                    aria-expanded={mobileSection === 'account'}
                    aria-label={mobileSection === 'account' ? 'Close account menu' : 'Open account menu'}
                  >
                    <span>👤 My Account</span>
                    <NavChevron open={mobileSection === 'account'} />
                  </button>
                  {mobileSection === 'account' && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald-100 pl-3">
                      {balance !== null && (
                        <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-sm font-bold text-emerald-700 mb-1">
                          💰 Balance: {format(balance).primary}
                          {currency.code !== 'GHS' && (
                            <span className="block text-[11px] font-normal opacity-80">GHS {balance.toFixed(2)}</span>
                          )}
                        </div>
                      )}
                      {[
                        { href: '/profile',       label: 'My Profile',      icon: '👤' },
                        { href: '/wallet',        label: 'Wallet',          icon: '💰' },
                        { href: '/earnings',      label: 'Earnings',        icon: '📈' },
                        { href: '/my-picks',      label: 'My Picks',        icon: '🎯' },
                        { href: '/my-purchases',  label: 'My Purchases',    icon: '🛍️' },
                        { href: '/subscriptions', label: 'Subscriptions',   icon: '🔔' },
                        { href: '/notifications', label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: '🛎️' },
                      ].map(item => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive(pathname, item.href) ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                          <span>{item.icon}</span>{item.label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={signOut}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Sign out of your account"
                      >
                        <span aria-hidden>🚪</span> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Guest actions (mobile) */}
              {!isSignedIn && (
                <div className="flex gap-3 pt-3">
                  <Link href="/login" onClick={() => setMobileOpen(false)}
                    className="flex-1 py-3 text-center rounded-xl font-semibold text-sm border-2 border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                    {t('nav.login')}
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}
                    className="flex-1 py-3 text-center rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
