import { getApiUrl } from '@/lib/site-config';

export type SellingThresholds = { minimumROI: number; minimumWinRate: number };

/** Used only when the API is unreachable; keep aligned with backend entity defaults. */
export const SELLING_THRESHOLDS_FALLBACK: SellingThresholds = {
  minimumROI: 20,
  minimumWinRate: 45,
};

export function parseSellingThresholds(data: unknown): SellingThresholds {
  const o = data as { minimumROI?: unknown; minimumWinRate?: unknown } | null;
  const minimumROI =
    typeof o?.minimumROI === 'number' && Number.isFinite(o.minimumROI)
      ? o.minimumROI
      : SELLING_THRESHOLDS_FALLBACK.minimumROI;
  const minimumWinRate =
    typeof o?.minimumWinRate === 'number' && Number.isFinite(o.minimumWinRate)
      ? o.minimumWinRate
      : SELLING_THRESHOLDS_FALLBACK.minimumWinRate;
  return { minimumROI, minimumWinRate };
}

/**
 * Public GET /tipster/selling-thresholds — no auth.
 * On the server, pass `revalidate` for cache-friendly marketing pages.
 */
export async function fetchSellingThresholds(options?: { revalidate?: number }): Promise<SellingThresholds> {
  const url = `${getApiUrl()}/tipster/selling-thresholds`;
  const isServer = typeof window === 'undefined';
  try {
    const init: RequestInit =
      isServer && options?.revalidate != null
        ? { next: { revalidate: options.revalidate } }
        : { cache: 'no-store' };
    const res = await fetch(url, init);
    if (!res.ok) return SELLING_THRESHOLDS_FALLBACK;
    return parseSellingThresholds(await res.json());
  } catch {
    return SELLING_THRESHOLDS_FALLBACK;
  }
}
