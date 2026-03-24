import { getApiUrl } from '@/lib/site-config';

export type DailyCouponQuota = {
  maxPerDay: number;
  usedToday: number;
  remaining: number | null;
  exempt: boolean;
  resetsAtUtc: string;
};

export function parseDailyCouponQuota(data: unknown): DailyCouponQuota | null {
  const o = data as Record<string, unknown> | null;
  if (!o || typeof o.usedToday !== 'number' || typeof o.maxPerDay !== 'number') return null;
  const remaining = o.remaining;
  return {
    maxPerDay: o.maxPerDay,
    usedToday: o.usedToday,
    remaining: remaining === null ? null : typeof remaining === 'number' ? remaining : null,
    exempt: o.exempt === true,
    resetsAtUtc: typeof o.resetsAtUtc === 'string' ? o.resetsAtUtc : '',
  };
}

export async function fetchDailyCouponQuota(token: string): Promise<DailyCouponQuota | null> {
  try {
    const res = await fetch(`${getApiUrl()}/accumulators/daily-coupon-quota`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return parseDailyCouponQuota(await res.json());
  } catch {
    return null;
  }
}

/** Human-readable UTC time when the current UTC day ends (for “resets at …”). */
export function formatQuotaResetUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Do not mix dateStyle/timeStyle with timeZoneName — engines throw RangeError: Invalid option.
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(d);
}
