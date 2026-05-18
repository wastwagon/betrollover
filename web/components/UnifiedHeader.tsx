'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type Ref, type ReactNode } from 'react';
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
import { MobileAccountSheet } from '@/components/ios/MobileAccountSheet';
import { NotificationBellMenu } from '@/components/notifications/NotificationBellMenu';
import {
  IconSearch,
  IconTrophy,
  IconTrending,
  IconChart,
  IconRocket,
  IconTarget,
  IconPackage,
  IconCart,
  IconDiamond,
  IconLive,
  IconArchive,
  IconTable,
  IconUsers,
  IconBook,
  IconShield,
  IconPerson,
  IconDashboard,
  IconWallet,
  IconEarnings,
  IconPicks,
  IconBag,
  IconStar,
  IconBell,
} from '@/components/ios/icons';

/* ─── Types ─────────────────────────────────────────────── */
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
  href: string; icon: ReactNode; label: string; desc?: string;
  badge?: string; badgeColor?: string; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--fill-secondary)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50"
    >
      <span className="w-6 flex items-center justify-center flex-shrink-0 text-[var(--primary)] mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-nowrap">
          <span className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors whitespace-nowrap">{label}</span>
          {badge && (
            <span className={`inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${badgeColor}`}>{badge}</span>
          )}
        </div>
        {desc && <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{desc}</p>}
      </div>
    </Link>
  );
}

/* ─── SectionLabel ───────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{children}</p>
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
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--fill-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50"
    >
      <span className="w-6 flex items-center justify-center flex-shrink-0 text-[var(--primary)]" aria-hidden>
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
  /** TopBar is not rendered on admin routes — sticky offset must stay `top-0`. */
  const hideTopBar = pathname.startsWith('/admin') || pathname.startsWith('/fr/admin');
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
  /** Desktop Tipsters / Browse / Account menus are portaled for the same reason (overflow clipping). */
  const desktopMenuPortalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        className={`sticky z-50 w-full min-w-0 max-w-full ios-chrome border-b shadow-sm ${
          hideTopBar ? 'top-0' : 'max-md:top-[calc(env(safe-area-inset-top,0px)+2.75rem)] md:top-0'
        }`}
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
                      <CompactNavLink href="/tipsters" icon={<IconSearch />} label={t('nav.browse')} onClick={closeAll} />
                      <CompactNavLink href="/leaderboard" icon={<IconTrophy />} label={t('nav.leaderboard')} onClick={closeAll} />
                      <CompactNavLink
                        href="/tipsters?sort=winRate"
                        icon={<IconTrending />}
                        label={t('tipster.top_win_rate')}
                        onClick={closeAll}
                      />
                      <CompactNavLink href="/tipsters?sort=roi" icon={<IconChart />} label={t('tipster.best_roi')} onClick={closeAll} />
                    </div>

                    <div className="py-1 px-1 border-t border-slate-100">
                      <SectionLabel>{t('header.section_become_tipster')}</SectionLabel>
                      {!isSignedIn && (
                        <CompactNavLink href="/register" icon={<IconRocket />} label={t('nav.register')} onClick={closeAll} />
                      )}
                      <CompactNavLink href="/create-pick" icon={<IconTarget />} label={t('nav.create_pick')} onClick={closeAll} />
                      <CompactNavLink
                        href="/dashboard/subscription-packages"
                        icon={<IconPackage />}
                        label={t('tipster.subscription_packages')}
                        onClick={closeAll}
                      />
                    </div>

                    <div className="mx-2 mb-2 mt-1 p-3 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                      <p className="text-xs font-bold mb-1">
                        <IconShield className="w-4 h-4 inline-block mr-1 -mt-0.5" />
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
                        icon={<IconCart />}
                        label={t('nav.picks_marketplace')}
                        onClick={closeAll}
                      />
                      <CompactNavLink
                        href="/subscriptions/marketplace"
                        icon={<IconDiamond />}
                        label={t('nav.subscription_marketplace')}
                        onClick={closeAll}
                      />
                      <CompactNavLink href="/live-scores" icon={<IconLive />} label={t('nav.live_scores')} onClick={closeAll} />
                      <CompactNavLink
                        href="/coupons/archive"
                        icon={<IconArchive />}
                        label={t('header.settled_archive')}
                        onClick={closeAll}
                      />
                    </div>

                    <div className="py-1 px-1 border-t border-slate-100">
                      <SectionLabel>{t('header.section_platform')}</SectionLabel>
                      <CompactNavLink href="/leaderboard" icon={<IconTrophy />} label={t('nav.leaderboard')} onClick={closeAll} />
                      <CompactNavLink href="/league-tables" icon={<IconTable />} label={t('nav.league_tables')} onClick={closeAll} />
                      <CompactNavLink href="/tipsters" icon={<IconUsers />} label={t('nav.top_tipsters')} onClick={closeAll} />
                      <CompactNavLink href="/guides" icon={<IconBook />} label={t('nav.short_guides')} onClick={closeAll} />
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

                <NotificationBellMenu
                  refreshKey={pathname}
                  onUnreadCountChange={setUnreadCount}
                />

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
                            { href: '/profile',       icon: <IconPerson />, label: t('profile.title'),       desc: t('profile.tagline') },
                            { href: '/dashboard',     icon: <IconDashboard />, label: t('nav.dashboard'),         desc: t('dashboard.subtitle') },
                            {
                              href: '/wallet',
                              icon: <IconWallet />,
                              label: t('nav.wallet'),
                              desc: t('dashboard.wallet_desc'),
                              badge: pendingWithdrawalCount > 0 ? String(pendingWithdrawalCount) : undefined,
                              badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
                            },
                            { href: '/earnings',      icon: <IconEarnings />, label: t('nav.earnings'),          desc: t('earnings.subtitle') },
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
                            { href: '/my-picks',      icon: <IconPicks />, label: t('nav.my_picks'),          desc: t('dashboard.my_picks_desc') },
                            { href: '/my-purchases',  icon: <IconBag />, label: t('my_purchases.title'),      desc: t('my_purchases.tagline') },
                            { href: '/subscriptions', icon: <IconStar />, label: t('dashboard.card_subscriptions'),     desc: t('dashboard.card_subscriptions_desc') },
                            { href: '/notifications', icon: <IconBell />, label: t('nav.notifications'),     desc: unreadCount > 0 ? t('dashboard.card_notifications_unread', { n: String(unreadCount) }) : t('notifications.caught_up'), badge: unreadCount > 0 ? String(unreadCount) : undefined, badgeColor: 'bg-red-100 text-red-600' },
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
                  {mounted && (
                    <MobileAccountSheet
                      open={mobileOpen}
                      onClose={() => setMobileOpen(false)}
                      title={t('header.account')}
                      doneLabel={t('common.close')}
                      logoutLabel={t('auth.logout')}
                      balance={balance}
                      balanceFormatted={balance !== null ? format(balance).primary : ''}
                      walletLabel={t('nav.wallet')}
                      pendingWithdrawalCount={pendingWithdrawalCount}
                      unreadCount={unreadCount}
                      onSignOut={signOut}
                      labels={{
                        dashboard: t('nav.dashboard'),
                        leagueTables: t('nav.league_tables'),
                        profile: t('profile.title'),
                        wallet: t('nav.wallet'),
                        earnings: t('nav.earnings'),
                        myPicks: t('nav.my_picks'),
                        myPurchases: t('my_purchases.title'),
                        subscriptions: t('dashboard.card_subscriptions'),
                        notifications: t('nav.notifications'),
                      }}
                    />
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
              { href: '/guides', label: t('nav.short_guides') },
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
