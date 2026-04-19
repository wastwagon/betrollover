'use client';

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
type NavItemId = 'home' | 'marketplace' | 'tipsters' | 'create' | 'subscribe';

interface NavItem {
  id: NavItemId;
  href: string;
  labelKey: string;
  /** Center primary CTA style */
  primary?: boolean;
}

/* ─── SVG icons (outline / filled when active) ───────────────────────────── */
function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" />
    </svg>
  );
}
function ShopIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}
function TipstersIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function CreateIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
/** VIP / subscription hub — aligns with desktop “Subscribe” */
function SubscribeIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

/** Touch nav: visible below xl (1280px). Hidden on laptop/desktop — they use the full header. Portaled to document.body so position:fixed pins to the viewport (avoids “floating” mid-page if a parent uses transform). */
const NAV_ITEMS: NavItem[] = [
  { id: 'home', href: '/', labelKey: 'header.home', primary: false },
  { id: 'marketplace', href: '/marketplace', labelKey: 'nav.bottom_picks', primary: false },
  { id: 'tipsters', href: '/tipsters', labelKey: 'nav.tipsters', primary: false },
  { id: 'create', href: '/create-pick', labelKey: 'nav.pick_tab', primary: true },
  { id: 'subscribe', href: '/subscriptions/marketplace', labelKey: 'nav.bottom_subscribe', primary: false },
];

const ICONS: Record<NavItemId, (p: { active?: boolean }) => JSX.Element> = {
  home: HomeIcon,
  marketplace: ShopIcon,
  tipsters: TipstersIcon,
  create: CreateIcon,
  subscribe: SubscribeIcon,
};

/** Admin only — auth pages keep bottom nav so tablets can reach Home/Marketplace without the desktop mega-header. */
const HIDE_PATHS = ['/admin'];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function shouldHideNav(pathname: string): boolean {
  return HIDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // useLayoutEffect: paint bottom nav on the first client frame (before paint).
  // Headless/Play Store captures used to fire while `mounted` was still false, leaving a blank band above the real bottom inset.
  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || shouldHideNav(pathname)) return null;

  const nav = (
    <nav
      role="navigation"
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 xl:hidden bg-[var(--card)] border-t border-[var(--border)] shadow-[0_-4px_20px_rgba(0,0,0,0.07)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Edge-to-edge docked tab bar (same bg + safe-area padding avoids a “floating” gap above the home indicator). */}
      <div className="flex w-full flex-nowrap items-stretch gap-0.5 px-0.5 min-h-[56px] py-1 max-sm:overflow-x-auto max-sm:overscroll-x-contain scrollbar-hide max-sm:snap-x max-sm:snap-mandatory sm:gap-1 sm:px-3">
        {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = ICONS[item.id];
            /** Fixed slots on narrow phones (scroll if needed); equal flex columns on sm+ so items span the full bar. */
            const slotW = item.primary
              ? 'w-[4.75rem] max-sm:shrink-0 sm:w-auto sm:flex-1 sm:min-w-0'
              : 'w-[4.1rem] max-sm:shrink-0 sm:w-auto sm:flex-1 sm:min-w-0';
            const linkClass = `flex flex-col items-center justify-center snap-center ${slotW} gap-1 py-2 px-0.5 rounded-xl transition-all duration-200 active:scale-[0.98] min-h-[52px] touch-manipulation`;

            if (item.primary) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${linkClass} ${active ? 'bg-[var(--primary)] text-white shadow-md' : 'bg-[var(--primary)]/12 text-[var(--primary)] hover:bg-[var(--primary)]/20'}`}
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20">
                    <Icon active />
                  </span>
                  <span className={`text-[10px] font-semibold truncate w-full text-center ${active ? 'text-white' : ''}`}>
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${linkClass} relative ${active ? 'text-[var(--primary)] bg-[var(--primary)]/8' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30'}`}
              >
                {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--primary)]" aria-hidden />}
                <span className="relative inline-flex">
                  <Icon active={active} />
                </span>
                <span className={`text-[10px] font-medium truncate w-full text-center ${active ? 'font-semibold' : ''}`}>
                  {t(item.labelKey)}
                </span>
              </Link>
            );
        })}
      </div>
    </nav>
  );

  return createPortal(nav, document.body);
}
