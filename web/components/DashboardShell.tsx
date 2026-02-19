'use client';

import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardBottomNav } from '@/components/DashboardBottomNav';
import { AppFooter } from '@/components/AppFooter';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--bg)' }}>
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none -z-10 opacity-100" />
      <DashboardHeader />
      <DashboardBottomNav />
      <main className="flex-1 flex flex-col min-h-0 pb-20 md:pb-0">
        {children}
      </main>
      <PushNotificationPrompt />
      <AppFooter />
    </div>
  );
}
