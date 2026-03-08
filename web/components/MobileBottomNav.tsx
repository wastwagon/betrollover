'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

type NavItemId = 'home' | 'marketplace' | 'leaderboard' | 'create' | 'wallet' | 'account';

interface NavItem {
  id: NavItemId;
  href: string;
  labelKey: string;
  Icon: (p: { active?: boolean }) => JSX.Element;
  /** Show on tablet (md) only */
  tabletOnly?: boolean;
  /** Center primary CTA style */
  primary?: boolean;
}

/* ─── SVG icons (outline / filled when active) ───────────────────────────── */
function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
function TrophyIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4 0v-4m0-4l2-4h-4l2 4M6 7H4a2 2 0 00-2 2v2a2 2 0 002 2h2m8-6h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m-8 0H6a2 2 0 00-2 2v2a2 2 0 002 2h2m4-8v2m0 4h.01M16 7h.01" />
    </svg>
  );
}
function CreateIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-7 h-7 shrink-0" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function WalletIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6 shrink-0" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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

const NAV_ITEMS: Omit<NavItem, 'Icon'>[] = [
  { id: 'home', href: '/', labelKey: 'header.home', tabletOnly: false, primary: false },
  { id: 'marketplace', href: '/marketplace', labelKey: 'nav.marketplace', tabletOnly: false, primary: false },
  { id: 'leaderboard', href: '/leaderboard', labelKey: 'nav.leaderboard', tabletOnly: false, primary: false },
  { id: 'create', href: '/create-pick', labelKey: 'nav.create_coupon', tabletOnly: false, primary: true },
  { id: 'wallet', href: '/wallet', labelKey: 'nav.wallet', tabletOnly: true, primary: false },
  { id: 'account', href: '/dashboard', labelKey: 'nav.dashboard', tabletOnly: false, primary: false },
];

const ICONS: Record<NavItemId, (p: { active?: boolean }) => JSX.Element> = {
  home: HomeIcon,
  marketplace: ShopIcon,
  leaderboard: TrophyIcon,
  create: CreateIcon,
  wallet: WalletIcon,
  account: UserIcon,
};

const HIDE_PATHS = ['/login', '/register', '/forgot-password', '/verify-email', '/admin'];

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
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-2 pb-2 pt-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Floating bar — iOS/Android style */}
      <div className="max-w-lg mx-auto rounded-2xl bg-[var(--card)]/90 backdrop-blur-xl border border-[var(--border)] shadow-[0_-2px_20px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_20px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-around min-h-[56px] px-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = ICONS[item.id];
            const baseClass = item.tabletOnly ? 'hidden md:flex' : 'flex';
            const linkClass = `${baseClass} flex-col items-center justify-center flex-1 min-w-0 gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 active:scale-95 min-h-[52px]`;

            if (item.primary) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${linkClass} ${active ? 'bg-[var(--primary)] text-white shadow-md' : 'bg-[var(--primary)]/12 text-[var(--primary)] hover:bg-[var(--primary)]/20'}`}
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
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
                className={`${linkClass} ${active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
              >
                <Icon active={active} />
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
