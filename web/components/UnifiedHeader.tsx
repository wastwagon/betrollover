'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type Ref, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/site-config';
import { AUTH_STORAGE_SYNC } from '@/lib/auth-storage-sync';
import { dropAuthIfUnauthorized, getAuthToken, clearAuthToken } from '@/lib/auth-token-storage';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { trackEvent } from '@/lib/analytics';
import { usePendingWithdrawalCount } from '@/hooks/usePendingWithdrawalCount';
import { MobileAccountSheet } from '@/components/ios/MobileAccountSheet';
import { NotificationBellMenu } from '@/components/notifications/NotificationBellMenu';
import { localizeHref, stripLocalePrefix } from '@/lib/locale-path';
import { isSubscriptionsEnabled } from '@/lib/subscriptions-enabled';
import { useAccaGeneratorEnabled } from '@/hooks/useAccaGeneratorEnabled';
import { buttonClassName } from '@/components/ui/Button';
import { LocaleSwitchers, TopBar } from '@/components/TopBar';
import {
  IconSearch,
  IconTrophy,
  IconRocket,
  IconTarget,
  IconAcca,
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
  const path = stripLocalePrefix(pathname);
  if (href === '/') return path === '/';
  return path === href || path.startsWith(href + '/');
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
  const pathname = usePathname();
  return (
    <Link
      href={localizeHref(href, pathname)}
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
  const pathname = usePathname();
  return (
    <Link
      href={localizeHref(href, pathname)}
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
        className={`w-full ${maxHeightClass} overflow-y-auto overscroll-contain rounded-xl bg-[var(--card)] border border-[var(--border)]`}
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
  const hideTopBar = stripLocalePrefix(pathname).startsWith('/admin');
  const pathBare = stripLocalePrefix(pathname);
  const isAuthPath = ['/login', '/register', '/forgot-password', '/verify-email'].some(
    (p) => pathBare === p || pathBare.startsWith(`${p}/`),
  );
  const accaEnabled = useAccaGeneratorEnabled();
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
    const token = getAuthToken();
    const next = !!token;
    setIsSignedIn(next);
    if (!next) {
      setBalance(null);
      setUnreadCount(0);
    }
  }, []);

  useLayoutEffect(() => {
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
    const token = getAuthToken();
    if (!token) return;
    fetch(`${getApiUrl()}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (dropAuthIfUnauthorized(r)) return null;
        return r.ok ? r.json() : null;
      })
      .then((d) => d && setBalance(+d.balance))
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
      const node = e.target as Node | null;
      // Tapping a label often targets a Text node, not an Element.
      const el = node instanceof Element ? node : node?.parentElement;
      if (!el) return;
      if (desktopMenuPortalRef.current?.contains(el)) return;
      // Account sheet (and other bottom sheets) portal to document.body — they are
      // outside headerRef. Closing on capture pointerdown unmounted the rows before
      // click, so iPad taps on Dashboard/Wallet/etc. did nothing.
      if (el.closest('[data-br-bottom-sheet]')) return;
      if (headerRef.current && !headerRef.current.contains(el)) {
        closeAll();
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
    clearAuthToken();
    setMobileOpen(false);
    router.push('/'); router.refresh();
  };

  /* ── Desktop nav item ────────────────────────────────── */
  const NavBtn = ({
    menuKey, label, href, badge,
  }: { menuKey?: MenuKey; label: string; href?: string; badge?: string }) => {
    const active = href ? isActive(pathname, href) : false;
    const isOpen = menuKey ? openMenu === menuKey : false;
    const triggerId = menuKey ? `main-nav-${menuKey}-trigger` : undefined;
    const panelId = menuKey ? `main-nav-${menuKey}-panel` : undefined;
    const cls = `relative flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[13px] font-medium tracking-tight whitespace-nowrap transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-2 ${
      active
        ? 'text-[var(--primary)] after:absolute after:inset-x-2.5 after:bottom-0 after:h-[1.5px] after:rounded-full after:bg-[var(--primary)]'
        : isOpen
          ? 'text-[var(--text)] bg-[var(--fill-secondary)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--fill-secondary)]'
    }`;

    const inner = (
      <>
        {label}
        {badge ? (
          <span className="min-w-[16px] h-[16px] px-1 flex items-center justify-center text-[10px] font-semibold rounded-full bg-[var(--fill-secondary)] text-[var(--text-muted)]">
            {badge}
          </span>
        ) : null}
        {menuKey ? <NavChevron open={isOpen} /> : null}
      </>
    );

    if (href && !menuKey) {
      return (
        <Link href={localizeHref(href, pathname)} className={cls} aria-current={active ? 'page' : undefined}>
          {inner}
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
        {inner}
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

      <div
        className={`z-50 w-full min-w-0 max-w-full ${
          hideTopBar
            ? 'sticky top-0'
            : 'max-md:fixed max-md:left-0 max-md:right-0 max-md:top-0 max-md:pt-[env(safe-area-inset-top,0px)] md:sticky md:top-0'
        }`}
      >
        {!hideTopBar ? <TopBar /> : null}
      <header
        ref={headerRef}
        className="w-full min-w-0 max-w-full ios-chrome border-b"
      >
        <div className="w-full min-w-0 max-w-none px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center h-[var(--br-header-h)] min-w-0 gap-3 lg:gap-6">

            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2 min-w-0 shrink-0 group" aria-label="BetRollover home">
              <Image
                src="/BetRollover-logo.png" alt="BetRollover"
                width={52} height={52}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-contain shrink-0"
                priority
              />
              <span className="hidden sm:block font-semibold text-[15px] tracking-tight text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                BetRollover
              </span>
            </Link>

            {/* ── Desktop nav (centered in remaining space) ── */}
            {!isAuthPath ? (
            <nav className="hidden lg:flex flex-1 items-center justify-center gap-1 min-w-0" aria-label="Main navigation">

              {/* Home */}
              <NavBtn href="/" label={t('header.home')} />

              <NavBtn href="/marketplace" label={t('nav.marketplace')} />

              <NavBtn href="/rollover" label={t('nav.rollover')} />

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
                    </div>

                    <div className="py-1 px-1 border-t border-[var(--separator)]">
                      <SectionLabel>{t('header.section_become_tipster')}</SectionLabel>
                      {!isSignedIn && (
                        <CompactNavLink href="/register" icon={<IconRocket />} label={t('nav.register')} onClick={closeAll} />
                      )}
                      <CompactNavLink href="/create-pick" icon={<IconTarget />} label={t('nav.create_pick')} onClick={closeAll} />
                      {accaEnabled ? (
                        <CompactNavLink href="/acca-generator" icon={<IconAcca />} label={t('nav.acca_generator')} onClick={closeAll} />
                      ) : null}
                      {isSubscriptionsEnabled() ? (
                        <CompactNavLink
                          href="/dashboard/subscription-packages"
                          icon={<IconPackage />}
                          label={t('tipster.subscription_packages')}
                          onClick={closeAll}
                        />
                      ) : null}
                    </div>

                    <div className="mx-2 mb-2 mt-1 p-3 rounded-lg border border-[var(--separator)] bg-[var(--card)]">
                      <p className="text-xs font-bold mb-1 text-[var(--text)]">
                        <IconShield className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                        {t('home.feature_escrow_title')}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{t('header.escrow_box')}</p>
                    </div>
                </DesktopMenuPortal>
              </div>

              <NavBtn href="/leaderboard" label={t('nav.leaderboard')} />

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
                      {isSubscriptionsEnabled() ? (
                        <CompactNavLink
                          href="/subscriptions/marketplace"
                          icon={<IconDiamond />}
                          label={t('nav.subscription_marketplace')}
                          onClick={closeAll}
                        />
                      ) : null}
                      <CompactNavLink href="/live-scores" icon={<IconLive />} label={t('nav.live_scores')} onClick={closeAll} />
                      <CompactNavLink
                        href="/coupons/archive"
                        icon={<IconArchive />}
                        label={t('header.settled_archive')}
                        onClick={closeAll}
                      />
                    </div>

                    <div className="py-1 px-1 border-t border-[var(--separator)]">
                      <SectionLabel>{t('header.section_platform')}</SectionLabel>
                      <CompactNavLink href="/leaderboard" icon={<IconTrophy />} label={t('nav.leaderboard')} onClick={closeAll} />
                      <CompactNavLink href="/league-tables" icon={<IconTable />} label={t('nav.league_tables')} onClick={closeAll} />
                      <CompactNavLink href="/tipsters" icon={<IconUsers />} label={t('nav.top_tipsters')} onClick={closeAll} />
                      <CompactNavLink href="/guides" icon={<IconBook />} label={t('nav.short_guides')} onClick={closeAll} />
                    </div>
                </DesktopMenuPortal>
              </div>

              {/* Subscriptions → VIP marketplace (auth-only in header; public page) */}
              {isSignedIn && isSubscriptionsEnabled() && (
                <NavBtn href="/subscriptions/marketplace" label={t('nav.subscriptions')} />
              )}

              <Link
                href={localizeHref('/create-pick', pathname)}
                aria-current={isActive(pathname, '/create-pick') ? 'page' : undefined}
                className={buttonClassName({
                  size: 'sm',
                  className: `h-9 rounded-full px-3.5 text-[13px] shadow-none whitespace-nowrap ${
                    isActive(pathname, '/create-pick') ? 'bg-[var(--primary-hover)]' : ''
                  }`,
                })}
              >
                <span className="text-[15px] font-semibold leading-none" aria-hidden>+ </span>
                {t('nav.create_pick')}
                {isSignedIn && slipCount !== undefined && slipCount > 0 ? (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-white/25 text-white rounded-full">
                    {slipCount > 9 ? '9+' : slipCount}
                  </span>
                ) : null}
              </Link>
              {accaEnabled ? (
                <Link
                  href={localizeHref('/acca-generator', pathname)}
                  aria-current={isActive(pathname, '/acca-generator') ? 'page' : undefined}
                  className={buttonClassName({
                    size: 'sm',
                    variant: 'secondary',
                    className: `h-9 rounded-full px-3.5 text-[13px] shadow-none whitespace-nowrap gap-1.5 ${
                      isActive(pathname, '/acca-generator')
                        ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-light)]'
                        : ''
                    }`,
                  })}
                >
                  <IconAcca className="w-4 h-4" />
                  {t('nav.acca_generator')}
                </Link>
              ) : null}
            </nav>
            ) : null}

            {/* ── Right: actions, identity, locale ── */}
            <div className="ml-auto flex items-center justify-end gap-3 min-w-0 shrink-0">
            {!isAuthPath && !isSignedIn ? (
              <div className="hidden lg:flex items-center gap-1.5">
                <Link href="/login" className="px-3 py-1.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                  {t('nav.login')}
                </Link>
                <Link href="/register" className={buttonClassName({ size: 'sm', className: 'h-9 rounded-full px-3.5 text-[13px] shadow-none' })}>
                  {t('nav.register')}
                </Link>
              </div>
            ) : null}

            {isSignedIn && (
              <div className="hidden xl:flex items-center gap-0.5">
                {balance !== null && (
                  <Link
                    href="/wallet"
                    className="relative flex items-center gap-1.5 h-9 px-2.5 rounded-full text-[13px] font-semibold text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary)]/20 transition-colors"
                    aria-label={`Wallet balance: ${format(balance).primary}${pendingWithdrawalCount > 0 ? `, ${pendingWithdrawalCount} withdrawal(s) in progress` : ''}`}
                  >
                    {pendingWithdrawalCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold bg-[var(--accent)] text-white rounded-full ring-2 ring-[var(--card)]">
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

                <div className="relative">
                  <button
                    type="button"
                    id="main-nav-account-trigger"
                    aria-expanded={openMenu === 'account'}
                    aria-haspopup="true"
                    aria-controls="main-nav-account-panel"
                    aria-label="My account"
                    className={`flex items-center gap-1 h-9 pl-1.5 pr-2 rounded-full text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-2 ${
                      openMenu === 'account'
                        ? 'bg-[var(--fill-secondary)] text-[var(--text)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--fill-secondary)]'
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
                        <div className="w-64 border-r border-[var(--separator)] py-4 px-2">
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
                              badgeColor: 'bg-[var(--accent-light)] text-[var(--accent)]',
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
                            ...(isSubscriptionsEnabled()
                              ? [{ href: '/subscriptions', icon: <IconStar />, label: t('dashboard.card_subscriptions'),     desc: t('dashboard.card_subscriptions_desc') }]
                              : []),
                            { href: '/notifications', icon: <IconBell />, label: t('nav.notifications'),     desc: unreadCount > 0 ? t('dashboard.card_notifications_unread', { n: String(unreadCount) }) : t('notifications.caught_up'), badge: unreadCount > 0 ? String(unreadCount) : undefined, badgeColor: 'bg-[var(--destructive-light)] text-[var(--destructive)]' },
                          ].map(item => (
                            <MegaLink key={item.href} href={item.href} icon={item.icon} label={item.label} desc={item.desc} badge={item.badge} badgeColor={item.badgeColor} onClick={closeAll} />
                          ))}
                        </div>
                        {/* Col 3 — Sign out panel */}
                        <div className="w-44 bg-[var(--fill-secondary)] py-5 px-4 flex flex-col justify-between border-l border-[var(--separator)]">
                          <div>
                            {balance !== null && (
                              <div className="mb-3 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--separator)]">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{t('header.balance')}</p>
                                <p className="text-sm font-bold text-[var(--text)]">{format(balance).primary}</p>
                                {currency.code !== 'GHS' && (
                                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">GHS {Number(balance ?? 0).toFixed(2)}</p>
                                )}
                              </div>
                            )}
                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{t('profile.tagline')}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { signOut(); closeAll(); }}
                            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-[var(--destructive)] bg-[var(--destructive-light)] hover:opacity-90 border border-[var(--destructive)]/25 transition-colors"
                            aria-label="Sign out of your account"
                          >
                            {t('auth.logout')}
                          </button>
                        </div>
                      </div>
                  </DesktopMenuPortal>
                </div>
              </div>
            )}

            {/* Locale stays in the main header on small screens; desktop uses TopBar. */}
            <div className="flex md:hidden items-center gap-0.5">
              <span className="hidden sm:inline text-[10px] font-medium tracking-wider text-[var(--text-tertiary)] px-1" title={t('topbar.disclaimer_5')}>
                18+
              </span>
              <LocaleSwitchers tone="quiet" />
            </div>
            {!isAuthPath ? (
            <div className="xl:hidden flex items-center justify-end gap-1 min-w-0">
              {isSignedIn ? (
                <>
                  <button
                    type="button"
                    aria-label={t('header.account')}
                    aria-expanded={mobileOpen}
                    aria-haspopup="true"
                    onClick={() => setMobileOpen(o => !o)}
                    className="p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--fill-secondary)] hover:text-[var(--text)] transition-colors"
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
                        profile: t('profile.title'),
                        wallet: t('nav.wallet'),
                        earnings: t('nav.earnings'),
                        myPicks: t('nav.my_picks'),
                        myPurchases: t('my_purchases.title'),
                        subscriptions: t('dashboard.card_subscriptions'),
                        notifications: t('nav.notifications'),
                        invite: t('nav.invite'),
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="lg:hidden flex items-center gap-1">
                  <Link
                    href="/login"
                    className="shrink-0 whitespace-nowrap px-1.5 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    href="/register"
                    className={buttonClassName({ size: 'sm', className: 'shrink-0 whitespace-nowrap h-9 rounded-full shadow-none' })}
                  >
                    <span className="sm:hidden">{t('nav.register_short')}</span>
                    <span className="hidden sm:inline">{t('nav.register')}</span>
                  </Link>
                </div>
              )}
            </div>
            ) : null}
            </div>
          </div>

          {/* Tablet only: secondary browse chips (phones use bottom tab bar). */}
          {!isAuthPath ? (
          <nav
            className="hidden md:flex lg:hidden border-t border-[var(--separator)] flex-nowrap justify-start gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide py-2 -mx-6 px-4 snap-x snap-mandatory"
            aria-label={t('nav.browse')}
          >
            {[
              { href: '/create-pick', label: t('nav.create_pick_short') },
              ...(accaEnabled ? [{ href: '/acca-generator', label: t('nav.acca_generator_short') }] : []),
              { href: '/rollover', label: t('nav.rollover_short') },
              { href: '/live-scores', label: t('nav.live_scores_short') },
              { href: '/league-tables', label: t('nav.league_tables_short') },
              { href: '/leaderboard', label: t('nav.leaderboard') },
              { href: '/learn', label: t('nav.learn') },
              { href: '/guides', label: t('nav.short_guides') },
            ].map((q) => (
              <Link
                key={q.href}
                href={localizeHref(q.href, pathname)}
                className={`shrink-0 snap-start inline-flex items-center min-h-[44px] px-3 rounded-full text-[11px] font-semibold border transition-colors touch-manipulation ${
                  isActive(pathname, q.href)
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                }`}
              >
                {q.label}
              </Link>
            ))}
          </nav>
          ) : null}
        </div>
      </header>
      </div>
      {/* Keeps page titles clear of the fixed mobile header (safe-area + header row). */}
      {!hideTopBar ? (
        <div className="md:hidden w-full shrink-0 h-[var(--br-chrome-below-header)] pointer-events-none" aria-hidden />
      ) : null}
    </>
  );
}
