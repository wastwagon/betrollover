'use client';

import { Suspense } from 'react';
import { DashboardGate } from './DashboardGate';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center w-full min-w-0 max-w-full">
          <div className="w-10 h-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <DashboardGate surface="buy" />
    </Suspense>
  );
}
