'use client';

import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';

export function AppShell({
  children,
  slipCount,
}: {
  children: React.ReactNode;
  title?: string;
  backHref?: string;
  slipCount?: number;
}) {
  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--bg)' }}>
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none -z-10 opacity-100" />
      <AppHeader slipCount={slipCount} />
      <main className="flex-1 relative">{children}</main>
      <AppFooter />
    </div>
  );
}
