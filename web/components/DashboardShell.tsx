'use client';

import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';

export function DashboardShell({
  children,
  slipCount,
}: {
  children: React.ReactNode;
  slipCount?: number;
}) {
  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--bg)' }}>
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none -z-10 opacity-100" />
      <UnifiedHeader slipCount={slipCount} />
      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>
      <PushNotificationPrompt />
      <AppFooter />
    </div>
  );
}
