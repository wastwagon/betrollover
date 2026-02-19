'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

type FoldId = 'picks' | 'account' | null;

const navItems = [
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'picks', href: null, label: 'Picks', icon: PicksIcon, fold: true },
  { id: 'marketplace', href: '/marketplace', label: 'Marketplace', icon: MarketplaceIcon },
  { id: 'purchases', href: '/my-purchases', label: 'Purchases', icon: PurchasesIcon },
  { id: 'account', href: null, label: 'Account', icon: AccountIcon, fold: true },
] as const;

const picksFoldItems = [
  { href: '/create-pick', label: 'Create Pick', icon: '✨', desc: 'Share your tips' },
  { href: '/my-picks', label: 'My Picks', icon: '📋', desc: 'Manage your tips' },
];

const accountFoldItems = [
  { href: '/profile', label: 'Profile', icon: '👤', desc: 'Your profile' },
  { href: '/wallet', label: 'Wallet', icon: '💰', desc: 'Balance & transactions' },
  { href: null, label: 'Sign out', icon: '🚪', desc: 'Log out', isAction: true },
];

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function PicksIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function MarketplaceIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function PurchasesIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function AccountIcon({ active }: { active?: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function isPicksActive(path: string) {
  return path === '/create-pick' || path === '/my-picks';
}

function isAccountActive(path: string) {
  return path === '/profile' || path === '/wallet';
}

export function DashboardBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [openFold, setOpenFold] = useState<FoldId>(null);

  const handleFoldAction = (item: { href: string | null; isAction?: boolean }) => {
    if (item.isAction) {
      setOpenFold(null);
      localStorage.removeItem('token');
      router.push('/');
      router.refresh();
    } else if (item.href) {
      setOpenFold(null);
      router.push(item.href);
    }
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:static md:shrink-0 border-t md:border-t-0 md:border-b border-[var(--border)] bg-white/95 backdrop-blur-xl shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)] md:shadow-none"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-around md:justify-center md:gap-2 h-16 md:h-12">
          {navItems.map((item) => {
            const isActive =
              item.href === pathname ||
              (item.id === 'picks' && isPicksActive(pathname)) ||
              (item.id === 'account' && isAccountActive(pathname));

            if ('fold' in item && item.fold) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenFold(openFold === item.id ? null : (item.id as FoldId))}
                  className={`flex flex-col items-center justify-center flex-1 md:flex-initial md:px-6 py-3 gap-1 min-w-0 transition-colors ${
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <item.icon active={isActive} />
                  <span className="text-[10px] md:text-xs font-medium truncate w-full text-center">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href!}
                className={`flex flex-col items-center justify-center flex-1 md:flex-initial md:px-6 py-3 gap-1 min-w-0 transition-colors ${
                  isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <item.icon active={isActive} />
                <span className="text-[10px] md:text-xs font-medium truncate w-full text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Picks fold sheet */}
      {openFold === 'picks' && (
        <div
          className="fixed inset-0 z-[60] md:bg-black/20"
          onClick={() => setOpenFold(null)}
          aria-hidden
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-[var(--border)] mx-auto mb-6" />
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Picks</h3>
            <div className="grid grid-cols-2 gap-3">
              {picksFoldItems.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setOpenFold(null)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-warm)] hover:bg-[var(--primary-light)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{child.icon}</span>
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text)] block">{child.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{child.desc}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account fold sheet */}
      {openFold === 'account' && (
        <div
          className="fixed inset-0 z-[60] md:bg-black/20"
          onClick={() => setOpenFold(null)}
          aria-hidden
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-[var(--border)] mx-auto mb-6" />
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Account</h3>
            <div className="space-y-2">
              {accountFoldItems.map((child) =>
                child.isAction ? (
                  <button
                    key={child.label}
                    type="button"
                    onClick={() => handleFoldAction(child)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-warm)] hover:bg-red-50 border border-[var(--border)] hover:border-red-200 text-left transition-all group"
                  >
                    <span className="text-2xl">{child.icon}</span>
                    <div>
                      <span className="font-semibold text-[var(--text)] group-hover:text-red-600">{child.label}</span>
                      <span className="block text-xs text-[var(--text-muted)]">{child.desc}</span>
                    </div>
                  </button>
                ) : (
                  <Link
                    key={child.href}
                    href={child.href!}
                    onClick={() => setOpenFold(null)}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-warm)] hover:bg-[var(--primary-light)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{child.icon}</span>
                    <div>
                      <span className="font-semibold text-[var(--text)] block">{child.label}</span>
                      <span className="text-xs text-[var(--text-muted)]">{child.desc}</span>
                    </div>
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
