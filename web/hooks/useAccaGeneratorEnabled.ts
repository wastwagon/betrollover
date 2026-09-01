'use client';

import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/site-config';

/**
 * Public Acca Generator flag. Defaults to on so chrome does not flash-hide the tab
 * when the status request is slow or fails.
 */
export function useAccaGeneratorEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiUrl()}/acca-generator/status`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean } | null) => {
        if (!cancelled && typeof d?.enabled === 'boolean') setEnabled(d.enabled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
