'use client';

import { UnifiedHeader } from '@/components/UnifiedHeader';

export function DashboardShell({
  children,
  slipCount,
}: {
  children: React.ReactNode;
  slipCount?: number;
}) {
  return (
    <div className="min-h-screen flex flex-col relative min-w-0 max-w-full overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none -z-10 opacity-100" />
      <UnifiedHeader slipCount={slipCount} />
      <main className="flex-1 flex flex-col min-h-0 min-w-0 max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
