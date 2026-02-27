'use client';

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

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-[var(--card)] border-r border-[var(--border)] flex flex-col fixed left-0 top-0 bottom-0 z-50 shadow-card">
      <div className="p-4 border-b border-[var(--border)]">
        <Link href="/dashboard" className="font-bold text-lg text-[var(--text)] hover:text-[var(--primary)] transition-colors">
          BetRollover Admin
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div className="p-3 border-t border-[var(--border)]">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
          onClick={() => localStorage.removeItem('token')}
        >
          <span>🚪</span>
          <span className="text-sm font-medium">Sign Out</span>
        </Link>
      </div>
    </aside>
  );
}
