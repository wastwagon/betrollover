'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { PullToRefresh } from '@/components/ios/PullToRefresh';

/** Client PTR wrapper for the server-rendered home page. */
export function HomePullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <PullToRefresh
      onRefresh={async () => {
        router.refresh();
        await new Promise((r) => setTimeout(r, 400));
      }}
    >
      {children}
    </PullToRefresh>
  );
}
