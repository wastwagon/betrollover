'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
type NavItemId = 'home' | 'marketplace' | 'tipsters' | 'create' | 'account';

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
function UserIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

/** Touch nav: hidden from 2xl up (wide desktop uses header only). Below 2xl includes phones & tablets (13\" iPad landscape is often >1024px). */
const NAV_ITEMS: NavItem[] = [
  { id: 'home', href: '/', labelKey: 'header.home', primary: false },
  { id: 'marketplace', href: '/marketplace', labelKey: 'nav.marketplace', primary: false },
  { id: 'tipsters', href: '/tipsters', labelKey: 'nav.tipsters', primary: false },
  { id: 'create', href: '/create-pick', labelKey: 'nav.coupon', primary: true },
  { id: 'account', href: '/dashboard', labelKey: 'nav.dashboard', primary: false },
];

const ICONS: Record<NavItemId, (p: { active?: boolean }) => JSX.Element> = {
  home: HomeIcon,
  marketplace: ShopIcon,
  tipsters: TipstersIcon,
  create: CreateIcon,
  account: UserIcon,
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

  if (shouldHideNav(pathname)) return null;

  return (
    <nav
      role="navigation"
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-40 2xl:hidden px-2 pb-2 pt-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Floating bar — iOS/Android style */}
      <div className="w-full max-w-lg mx-auto rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-[0_-2px_20px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_20px_rgba(0,0,0,0.2)]">
        <div className="flex flex-nowrap items-stretch gap-0.5 overflow-x-auto overscroll-x-contain scrollbar-hide snap-x snap-mandatory px-1 min-h-[56px] py-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = ICONS[item.id];
            const slotW = item.primary ? 'w-[4.75rem] sm:w-[5rem]' : 'w-[4.1rem] sm:w-[4.35rem]';
            const linkClass = `flex flex-col items-center justify-center shrink-0 snap-center ${slotW} gap-1 py-2 px-0.5 rounded-xl transition-all duration-200 active:scale-[0.98] min-h-[52px] touch-manipulation`;

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
      </div>
    </nav>
  );
}
