'use client';

import { useEffect, useState } from 'react';

/**
 * Monotonic clock for client-only comparisons (kickoff started, etc.).
 * Returns null until mount so SSR and first paint agree — avoids React #418.
 */
export function useClientNow(refreshMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (refreshMs <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs]);

  return now;
}
