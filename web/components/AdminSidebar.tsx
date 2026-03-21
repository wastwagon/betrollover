'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/admin/analytics', icon: '📈', label: 'Analytics' },
  { href: '/admin/ai-predictions', icon: '🤖', label: 'AI Predictions' },
  { href: '/admin/users', icon: '👥', label: 'Users' },
  { href: '/admin/marketplace', icon: '🛒', label: 'Marketplace' },
  { href: '/admin/purchases', icon: '🛍️', label: 'Purchases' },
  { href: '/admin/deposits', icon: '💳', label: 'Deposits' },
  { href: '/admin/withdrawals', icon: '💸', label: 'Withdrawals' },
  { href: '/admin/support',     icon: '🎫', label: 'Support' },
  { href: '/admin/audit-log',   icon: '📋', label: 'Audit log' },
  { href: '/admin/chat',        icon: '💬', label: 'Chat Moderation' },
  { href: '/admin/escrow', icon: '🔒', label: 'Escrow' },
  { href: '/admin/wallet', icon: '💰', label: 'Wallet' },
  { href: '/admin/notifications', icon: '🔔', label: 'Notifications' },
  { href: '/admin/fixtures', icon: '⚽', label: 'Fixtures' },
  { href: '/admin/sports', icon: '🌍', label: 'Multi-Sport' },
  { href: '/admin/content', icon: '📄', label: 'Content' },
  { href: '/admin/news', icon: '📰', label: 'News' },
  { href: '/admin/resources', icon: '📚', label: 'Resources' },
  { href: '/admin/ads', icon: '📢', label: 'Ads' },
  { href: '/admin/email', icon: '📧', label: 'Email' },
  { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

function SidebarContent({ onItemClick }: { onItemClick: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="p-4 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={onItemClick}
            className="font-bold text-lg text-[var(--text)] hover:text-[var(--primary)] transition-colors"
          >
            BetRollover Admin
          </Link>
        </div>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as const }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--border)] shrink-0">
        <Link
          href="/"
          onClick={() => {
            localStorage.removeItem('token');
            onItemClick();
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
        >
          <span>🚪</span>
          <span className="text-sm font-medium">Sign Out</span>
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lock body scroll when mobile drawer is open
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleItemClick = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* Hamburger button — visible on mobile only, positioned to not overlap content */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[60] p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors shadow-lg"
        aria-label="Open admin menu"
        aria-expanded={mobileOpen}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop sidebar — always visible on md+ */}
      <aside className="hidden md:flex w-56 min-h-screen bg-[var(--card)] border-r border-[var(--border)] flex-col fixed left-0 top-0 bottom-0 z-50 shadow-card">
        <SidebarContent onItemClick={() => {}} />
      </aside>

      {/* Mobile drawer — portal to body, slides from left */}
      {mobileOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation menu"
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar drawer */}
          <div
            className="relative z-[1] w-[280px] sm:w-[320px] max-w-[85vw] h-full min-h-[100dvh] bg-[var(--card)] border-r border-[var(--border)] shadow-2xl flex flex-col animate-slide-in-left"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div className="p-4 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--text)]">BetRollover Admin</h2>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Menu content */}
            <SidebarContent onItemClick={handleItemClick} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
