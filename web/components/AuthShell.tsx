'use client';

import type { ReactNode } from 'react';
import { UnifiedHeader } from '@/components/UnifiedHeader';

/**
 * Shared login / register / forgot / verify chrome: header + centered card column.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] relative w-full min-w-0 max-w-full overflow-x-hidden">
      <UnifiedHeader />
      <main className="section-ux-auth-main w-full min-w-0 max-w-full pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md min-w-0 mx-auto px-4 sm:px-0">{children}</div>
      </main>
    </div>
  );
}

export function AuthCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--separator)] bg-[var(--card)] px-5 py-8 sm:px-8 sm:py-10 min-w-0 max-w-full ${className}`}
    >
      {children}
    </div>
  );
}

export function AuthPageFallback() {
  return (
    <AuthShell>
      <div className="flex justify-center py-16" aria-hidden>
        <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    </AuthShell>
  );
}
