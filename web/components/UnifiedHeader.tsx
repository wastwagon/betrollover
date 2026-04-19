'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type Ref } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/site-config';
import { AUTH_STORAGE_SYNC, emitAuthStorageSync } from '@/lib/auth-storage-sync';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { trackEvent } from '@/lib/analytics';
import { usePendingWithdrawalCount } from '@/hooks/usePendingWithdrawalCount';

/* ─── Types ─────────────────────────────────────────────── */
interface Notification { id: number; isRead: boolean }
interface UnifiedHeaderProps { slipCount?: number }

type MenuKey = 'browse' | 'tipsters' | 'account' | null;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

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
        {desc && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{desc}</p>}
      </div>
    </Link>
  );
}

/* ─── SectionLabel ───────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{children}</p>
  );
}

/** Single-line nav row (no description) — for compact dropdowns */
function CompactNavLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
    >
      <span className="text-base leading-none w-6 text-center flex-shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 leading-snug">{label}</span>
    </Link>
  );
}

const DESKTOP_MENU_Z = 80;

/**
 * Renders under document.body so panels are not clipped by ancestors with `overflow-x-hidden`
 * (which forces overflow-y to compute to `auto` and clips absolutely positioned dropdowns).
 */
function DesktopMenuPortal({
  open,
  mounted,
  triggerId,
  align,
  maxWidthPx,
  panelId,
  labelledBy,
  portalRootRef,
  cancelClose,
  closeAfterDelay,
  maxHeightClass,
  children,
}: {
  open: boolean;
  mounted: boolean;
  triggerId: string;
  align: 'left' | 'right';
  maxWidthPx: number;
  panelId: string;
  labelledBy: string;
  portalRootRef: Ref<HTMLDivElement>;
  cancelClose: () => void;
  closeAfterDelay: () => void;
  maxHeightClass: string;
  children: React.ReactNode;
}) {
  const [box, setBox] = useState({ top: 0, left: 0, width: maxWidthPx });

  const updatePosition = useCallback(() => {
    const el = document.getElementById(triggerId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const w = Math.min(maxWidthPx, window.innerWidth - margin * 2);
    let left: number;
    if (align === 'left') {
      left = Math.min(Math.max(margin, r.left), window.innerWidth - margin - w);
    } else {
      left = Math.min(Math.max(margin, r.right - w), window.innerWidth - margin - w);
    }
    setBox({ top: r.bottom + 6, left, width: w });
  }, [triggerId, align, maxWidthPx]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={portalRootRef}
      className="fixed animate-dropdown-in pointer-events-auto"
      style={{ top: box.top, left: box.left, width: box.width, zIndex: DESKTOP_MENU_Z }}
      onMouseEnter={cancelClose}
      onMouseLeave={closeAfterDelay}
    >
      <div
        id={panelId}
        role="region"
        aria-labelledby={labelledBy}
        className={`w-full ${maxHeightClass} overflow-y-auto overscroll-contain rounded-xl bg-white shadow-xl border border-slate-200/90 ring-1 ring-black/5`}
      >
        {children}
      </div>
    </div>,
    document.body,
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
  const pendingWithdrawalCount = usePendingWithdrawalCount();
  const [openMenu,         setOpenMenu]         = useState<MenuKey>(null);
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [mounted,           setMounted]          = useState(false);

  const hoverTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef     = useRef<HTMLElement>(null);
  /** Mobile account drawer is portaled to `document.body`, so it is NOT under `headerRef`. Without this, document `mousedown` treats every tap in the drawer as "outside the header" and closes the menu before `click` / `router.push` — especially noticeable in iOS WKWebView (WebViewGold). */
  const mobileAccountDrawerRef = useRef<HTMLDivElement | null>(null);
  /** Desktop Tipsters / Browse / Account menus are portaled for the same reason (overflow clipping). */
  const desktopMenuPortalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  /** Mobile drawer: backdrop was full-screen `absolute inset-0` over the panel in some browsers, eating taps. Also force client nav so links always work from the portal. */
  const onMobileAccountNav = useCallback(
    (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      setMobileOpen(false);
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      router.push(href);
    },
    [router],
  );

  /* ── Lock body scroll when mobile sidebar open ───────── */
  useEffect(() => {
    if (!mobileOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const gap = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [mobileOpen]);

  /* ── Auth / data ─────────────────────────────────────── */
  const syncAuth = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const next = !!token;
    setIsSignedIn(next);
    if (!next) {
      setBalance(null);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    syncAuth();
  }, [pathname, syncAuth]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === null) syncAuth();
    };
    const onFocus = () => syncAuth();
    const onVis = () => {
      if (document.visibilityState === 'visible') syncAuth();
    };
    const onSameTab = () => syncAuth();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener(AUTH_STORAGE_SYNC, onSameTab);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(AUTH_STORAGE_SYNC, onSameTab);
    };
  }, [syncAuth]);

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
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenu((prev) => {
          if (prev) {
            queueMicrotask(() => {
              const id =
                prev === 'account' ? 'main-nav-account-trigger' : `main-nav-${prev}-trigger`;
              document.getElementById(id)?.focus();
            });
          }
          return null;
        });
        setMobileOpen(false);
      }
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (mobileAccountDrawerRef.current?.contains(t)) return;
      if (desktopMenuPortalRef.current?.contains(t)) return;
      if (headerRef.current && !headerRef.current.contains(t)) {
        closeAll();
        setMobileOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
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
    emitAuthStorageSync();
    setMobileOpen(false);
    router.push('/'); router.refresh();
  };

  /* ── Desktop nav item ────────────────────────────────── */
  const NavBtn = ({
    menuKey, label, href,
  }: { menuKey?: MenuKey; label: string; href?: string }) => {
    const active = href ? isActive(pathname, href) : false;
    const isOpen = menuKey ? openMenu === menuKey : false;
    const triggerId = menuKey ? `main-nav-${menuKey}-trigger` : undefined;
    const panelId = menuKey ? `main-nav-${menuKey}-panel` : undefined;
    const cls = `flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 ${
      active || isOpen
        ? 'text-emerald-800 bg-emerald-50 border border-emerald-300/80'
        : 'text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/80 border border-transparent'
    }`;

    if (href && !menuKey) {
      return (
        <Link href={href} className={cls} aria-current={active ? 'page' : undefined}>
          {label}
        </Link>
      );
    }
    return (
      <button
        type="button"
        id={triggerId}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
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
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        .animate-dropdown-in { animation: dropdownIn 0.16s ease both; }
        .animate-slide-in-left { animation: slideInLeft 0.25s ease-out both; }
      `}</style>

      <header
        ref={headerRef}
        className="sticky top-0 z-50 w-full min-w-0 max-w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/70 shadow-sm"
      >
        <div className="section-ux-gutter-wide min-w-0 max-w-full">
          <div className="flex items-center justify-between h-[4.5rem] min-w-0 gap-1.5 sm:gap-2">

            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0 group" aria-label="BetRollover home">
              <Image
                src="/BetRollover-logo.png" alt="BetRollover"
                width={52} height={52}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl shadow-md group-hover:shadow-lg transition-shadow object-contain shrink-0"
                priority
              />
              <span className="hidden sm:block font-bold text-base text-slate-800 group-hover:text-emerald-700 transition-colors">
                BetRollover
              </span>
            </Link>

            {/* ── Desktop nav ── */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">

              {/* Home */}
              <NavBtn href="/" label={t('header.home')} />

              <NavBtn href="/marketplace" label={t('nav.picks')} />

              {/* Tipsters ▾ */}
              <div className="relative">
                <NavBtn menuKey="tipsters" label={t("nav.tipsters")} />

                <DesktopMenuPortal
                  open={openMenu === 'tipsters'}
                  mounted={mounted}
                  triggerId="main-nav-tipsters-trigger"
                  align="left"
                  maxWidthPx={352}
                  panelId="main-nav-tipsters-panel"
                  labelledBy="main-nav-tipsters-trigger"
                  portalRootRef={desktopMenuPortalRef}
                  cancelClose={cancelClose}
                  closeAfterDelay={closeAfterDelay}
                  maxHeightClass="max-h-[min(80vh,36rem)]"
                >
                    <div className="py-1 px-1">
                      <SectionLabel>{t('header.section_discover_tipsters')}</SectionLabel>
                      <CompactNavLink href="/tipsters" icon="🔍" label={t('nav.browse')} onClick={closeAll} />
                      <CompactNavLink href="/leaderboard" icon="🏆" label={t('nav.leaderboard')} onClick={closeAll} />
                      <CompactNavLink
                        href="/tipsters?sort=winRate"
                        icon="📈"
                        label={t('tipster.top_win_rate')}
                        onClick={closeAll}
                      />
                      <CompactNavLink href="/tipsters?sort=roi" icon="💹" label={t('tipster.best_roi')} onClick={closeAll} />
                    </div>

                    <div className="py-1 px-1 border-t border-slate-100">
                      <SectionLabel>{t('header.section_become_tipster')}</SectionLabel>
                      {!isSignedIn && (
                        <CompactNavLink href="/register" icon="🚀" label={t('nav.register')} onClick={closeAll} />
                      )}
                      <CompactNavLink href="/create-pick" icon="🎯" label={t('nav.create_pick')} onClick={closeAll} />
                      <CompactNavLink
                        href="/dashboard/subscription-packages"
                        icon="📦"
                        label={t('tipster.subscription_packages')}
                        onClick={closeAll}
                      />
                    </div>

                    <div className="mx-2 mb-2 mt-1 p-3 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                      <p className="text-xs font-bold mb-1">
                        <span aria-hidden>🛡️ </span>
                        {t('home.feature_escrow_title')}
                      </p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{t('header.escrow_box')}</p>
                    </div>
                </DesktopMenuPortal>
              </div>

              {/* Browse ▾ */}
              <div className="relative">
                <NavBtn menuKey="browse" label={t('nav.browse')} />

                <DesktopMenuPortal
                  open={openMenu === 'browse'}
                  mounted={mounted}
                  triggerId="main-nav-browse-trigger"
                  align="left"
                  maxWidthPx={352}
                  panelId="main-nav-browse-panel"
                  labelledBy="main-nav-browse-trigger"
                  portalRootRef={desktopMenuPortalRef}
                  cancelClose={cancelClose}
                  closeAfterDelay={closeAfterDelay}
                  maxHeightClass="max-h-[min(80vh,36rem)]"
                >
                    <div className="py-1 px-1">
                      <SectionLabel>{t('header.section_picks')}</SectionLabel>
                      <CompactNavLink
                        href="/marketplace"
                        icon="🛒"
                        label={t('nav.picks_marketplace')}
                        onClick={closeAll}
                      />
                      <CompactNavLink
                        href="/subscriptions/marketplace"
                        icon="💎"
                        label={t('nav.subscription_marketplace')}
                        onClick={closeAll}
                      />
                      <CompactNavLink href="/live-scores" icon="📡" label={t('nav.live_scores')} onClick={closeAll} />
                      <CompactNavLink
                        href="/coupons/archive"
                        icon="📦"
                        label={t('header.settled_archive')}
                        onClick={closeAll}
                      />
                    </div>

                    <div className="py-1 px-1 border-t border-slate-100">
                      <SectionLabel>{t('header.section_platform')}</SectionLabel>
                      <CompactNavLink href="/leaderboard" icon="🏆" label={t('nav.leaderboard')} onClick={closeAll} />
                      <CompactNavLink href="/league-tables" icon="📊" label={t('nav.league_tables')} onClick={closeAll} />
                      <CompactNavLink href="/tipsters" icon="👥" label={t('nav.top_tipsters')} onClick={closeAll} />
                    </div>
                </DesktopMenuPortal>
              </div>

              {/* Subscriptions → VIP marketplace (auth-only in header; public page) */}
              {isSignedIn && (
                <NavBtn href="/subscriptions/marketplace" label={t('nav.subscriptions')} />
              )}

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
                  {t('nav.create_pick')}
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
                    className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-all"
                    aria-label={`Wallet balance: ${format(balance).primary}${pendingWithdrawalCount > 0 ? `, ${pendingWithdrawalCount} withdrawal(s) in progress` : ''}`}
                  >
                    {pendingWithdrawalCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold bg-amber-500 text-white rounded-full ring-2 ring-white dark:ring-slate-900">
                        {pendingWithdrawalCount > 9 ? '9+' : pendingWithdrawalCount}
                      </span>
                    )}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {format(balance).primary}
                    {currency.code !== 'GHS' && (
                      <span className="text-[10px] font-normal opacity-80">GHS {Number(balance ?? 0).toFixed(2)}</span>
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
                <div className="relative">
                  <button
                    type="button"
                    id="main-nav-account-trigger"
                    aria-expanded={openMenu === 'account'}
                    aria-haspopup="true"
                    aria-controls="main-nav-account-panel"
                    aria-label="My account"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 ${
                      openMenu === 'account'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300/80'
                        : 'text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/80 border border-transparent'
                    }`}
                    onMouseEnter={() => openAfterDelay('account')}
                    onMouseLeave={closeAfterDelay}
                    onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('header.account')}
                    <NavChevron open={openMenu === 'account'} />
                  </button>

                  <DesktopMenuPortal
                    open={openMenu === 'account'}
                    mounted={mounted}
                    triggerId="main-nav-account-trigger"
                    align="right"
                    maxWidthPx={520}
                    panelId="main-nav-account-panel"
                    labelledBy="main-nav-account-trigger"
                    portalRootRef={desktopMenuPortalRef}
                    cancelClose={cancelClose}
                    closeAfterDelay={closeAfterDelay}
                    maxHeightClass="max-h-[min(80vh,40rem)]"
                  >
                      <div className="flex w-full min-w-0 max-w-[520px]">
                        {/* Col 1 — Profile & Activity */}
                        <div className="w-64 border-r border-slate-100 py-4 px-2">
                          <SectionLabel>{t('header.section_my_account')}</SectionLabel>
                          {[
                            { href: '/profile',       icon: '👤', label: t('profile.title'),       desc: t('profile.tagline') },
                            { href: '/dashboard',     icon: '📊', label: t('nav.dashboard'),         desc: t('dashboard.subtitle') },
                            {
                              href: '/wallet',
                              icon: '💰',
                              label: t('nav.wallet'),
                              desc: t('dashboard.wallet_desc'),
                              badge: pendingWithdrawalCount > 0 ? String(pendingWithdrawalCount) : undefined,
                              badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
                            },
                            { href: '/earnings',      icon: '📈', label: t('nav.earnings'),          desc: t('earnings.subtitle') },
                          ].map((item) => (
                            <MegaLink
                              key={item.href}
                              href={item.href}
                              icon={item.icon}
                              label={item.label}
                              desc={item.desc}
                              badge={'badge' in item && item.badge ? item.badge : undefined}
                              badgeColor={'badgeColor' in item && item.badgeColor ? item.badgeColor : undefined}
                              onClick={closeAll}
                            />
                          ))}
                        </div>
                        {/* Col 2 — Picks & Subscriptions */}
                        <div className="flex-1 py-4 px-2">
                          <SectionLabel>{t('header.section_activity')}</SectionLabel>
                          {[
                            { href: '/my-picks',      icon: '🎯', label: t('nav.my_picks'),          desc: t('dashboard.my_picks_desc') },
                            { href: '/my-purchases',  icon: '🛍️', label: t('my_purchases.title'),      desc: t('my_purchases.tagline') },
                            { href: '/subscriptions', icon: '🔔', label: t('dashboard.card_subscriptions'),     desc: t('dashboard.card_subscriptions_desc') },
                            { href: '/notifications', icon: '🛎️', label: t('nav.notifications'),     desc: unreadCount > 0 ? t('dashboard.card_notifications_unread', { n: String(unreadCount) }) : t('notifications.caught_up'), badge: unreadCount > 0 ? String(unreadCount) : undefined, badgeColor: 'bg-red-100 text-red-600' },
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
                                  <p className="text-[10px] text-emerald-600/80 mt-0.5">GHS {Number(balance ?? 0).toFixed(2)}</p>
                                )}
                              </div>
                            )}
                            <p className="text-[11px] text-slate-500 leading-relaxed">{t('profile.tagline')}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { signOut(); closeAll(); }}
                            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors"
                            aria-label="Sign out of your account"
                          >
                            <span aria-hidden>🚪</span>
                            {t('auth.logout')}
                          </button>
                        </div>
                      </div>
                  </DesktopMenuPortal>
                </div>
              </div>
            )}

            {/* Mobile: Account only (no hamburger) — primary nav is bottom bar + in-page smart buttons */}
            <div className="lg:hidden flex items-center justify-end gap-1 sm:gap-2 min-w-0 shrink ml-1">
              {isSignedIn ? (
                <>
                  <button
                    type="button"
                    aria-label={t('header.account')}
                    aria-expanded={mobileOpen}
                    aria-haspopup="true"
                    onClick={() => setMobileOpen(o => !o)}
                    className="p-2.5 rounded-xl text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-[var(--border)] bg-[var(--card)]"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  {mobileOpen && mounted && createPortal(
                    <div
                      ref={mobileAccountDrawerRef}
                      className="fixed inset-0 z-[100] flex flex-row"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="mobile-account-menu-title"
                    >
                      {/* Sidebar first — backdrop must NOT overlap this strip (was intercepting all taps) */}
                      <div
                        className="relative z-10 w-[280px] sm:w-[320px] max-w-[85vw] shrink-0 h-full min-h-[100dvh] min-h-screen bg-[var(--card)] border-r border-[var(--border)] shadow-2xl flex flex-col animate-slide-in-left pointer-events-auto"
                        style={{
                          paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
                          paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
                        }}
                      >
                        {/* Header with balance */}
                        <div className="px-4 pt-6 pb-4 border-b border-[var(--border)] shrink-0">
                          <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
                            <h2 id="mobile-account-menu-title" className="text-base font-semibold text-[var(--text)] min-w-0 flex-1 truncate pr-2">
                              {t('header.account')}
                            </h2>
                            <button
                              type="button"
                              onClick={() => setMobileOpen(false)}
                              className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                              aria-label={t('common.close')}
                            >
                              ✕
                            </button>
                          </div>
                          {balance !== null && (
                            <div className="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/60">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">
                                {t('nav.wallet')}
                              </p>
                              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{format(balance).primary}</p>
                            </div>
                          )}
                        </div>
                        {/* Menu items — min-h-0 lets flex child scroll instead of overflowing */}
                        <nav className="flex-1 min-h-0 overflow-y-auto py-2 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as const }}>
                          {([
                            { href: '/dashboard',      icon: '📊', label: t('nav.dashboard') },
                            { href: '/league-tables', icon: '📋', label: t('nav.league_tables') },
                            { href: '/profile',       icon: '👤', label: t('profile.title') },
                            {
                              href: '/wallet',
                              icon: '💰',
                              label: t('nav.wallet'),
                              badge: pendingWithdrawalCount > 0 ? String(pendingWithdrawalCount) : undefined,
                              badgeClass: 'bg-amber-500',
                            },
                            { href: '/earnings',      icon: '📈', label: t('nav.earnings') },
                            { href: '/my-picks',      icon: '🎯', label: t('nav.my_picks') },
                            { href: '/my-purchases',  icon: '🛍️', label: t('my_purchases.title') },
                            { href: '/subscriptions', icon: '🔔', label: t('dashboard.card_subscriptions') },
                            {
                              href: '/notifications',
                              icon: '🛎️',
                              label: t('nav.notifications'),
                              badge: unreadCount > 0 ? String(unreadCount) : undefined,
                              badgeClass: 'bg-red-500',
                            },
                          ]).map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={onMobileAccountNav(item.href)}
                              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                                isActive(pathname, item.href)
                                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-r-2 border-emerald-600'
                                  : 'text-[var(--text)] hover:bg-[var(--bg)]'
                              }`}
                            >
                              <span className="text-lg" aria-hidden>{item.icon}</span>
                              <span className="flex-1">{item.label}</span>
                              {'badge' in item && item.badge && (
                                <span className={`min-w-[20px] h-5 flex items-center justify-center text-xs font-bold text-white rounded-full ${'badgeClass' in item && item.badgeClass ? item.badgeClass : 'bg-red-500'}`}>
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </nav>
                        {/* Sign out — shrink-0 so it always stays visible */}
                        <div className="px-4 py-3 border-t border-[var(--border)] shrink-0">
                          <button
                            type="button"
                            onClick={() => { signOut(); setMobileOpen(false); }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            aria-label={t('auth.logout')}
                          >
                            <span aria-hidden>🚪</span>
                            <span>{t('auth.logout')}</span>
                          </button>
                        </div>
                      </div>
                      {/* Backdrop only beside the drawer — full-screen overlay no longer covers links */}
                      <button
                        type="button"
                        className="flex-1 min-w-0 min-h-0 self-stretch bg-black/50"
                        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                        aria-label={t('common.close')}
                        onClick={() => setMobileOpen(false)}
                      />
                    </div>,
                    document.body
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-[var(--text)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    href="/register"
                    className="shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
                  >
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile / tablet: discoverability without mega menus */}
          <nav
            className="lg:hidden border-t border-slate-100/90 flex flex-wrap justify-center sm:flex-nowrap sm:justify-start gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide py-2.5 -mx-4 px-3 sm:-mx-6 sm:px-4 sm:snap-x sm:snap-mandatory"
            aria-label={t('nav.browse')}
          >
            {[
              { href: '/marketplace', label: t('nav.picks') },
              { href: '/live-scores', label: t('nav.live_scores_short') },
              { href: '/league-tables', label: t('nav.league_tables_short') },
              { href: '/tipsters', label: t('nav.tipsters') },
              { href: '/learn', label: t('nav.learn') },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className={`shrink-0 sm:snap-start inline-flex items-center min-h-[40px] sm:min-h-[44px] px-3 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-bold border transition-colors touch-manipulation ${
                  isActive(pathname, q.href)
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:border-emerald-300 hover:text-emerald-800'
                }`}
              >
                {q.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
