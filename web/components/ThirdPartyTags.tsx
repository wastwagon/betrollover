'use client';

import { getGtmContainerId } from '@/lib/site-config';
import { GoogleTagManager } from '@/components/GoogleTagManager';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';

/**
 * Prefer Google Tag Manager when `NEXT_PUBLIC_GTM_ID` is set (recommended).
 * Otherwise loads direct GA4 if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set.
 *
 * `disabled` is set from server env `DISABLE_THIRD_PARTY_TAGS=1` (runtime, no rebuild) — emergency off switch.
 */
export function ThirdPartyTags({ disabled = false }: { disabled?: boolean }) {
  if (disabled) return null;
  if (getGtmContainerId()) {
    return <GoogleTagManager />;
  }
  return <GoogleAnalytics />;
}
