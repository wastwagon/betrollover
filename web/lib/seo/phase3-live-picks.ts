import { couponDisplayTitle, type PublicCouponMeta } from '@/lib/seo/public-content';
import { getServerBackendOrigin } from '@/lib/seo/server-backend';

export type Phase3LiveItem = {
  href: string;
  title: string;
  meta?: string;
};

function asItems(data: unknown): PublicCouponMeta[] {
  const raw = data as { items?: unknown } | unknown[];
  const items = Array.isArray(raw) ? raw : Array.isArray((raw as { items?: unknown }).items)
    ? ((raw as { items: unknown[] }).items)
    : [];
  return items as PublicCouponMeta[];
}

function toLiveItems(items: PublicCouponMeta[], limit: number): Phase3LiveItem[] {
  const out: Phase3LiveItem[] = [];
  for (const item of items) {
    const id = Number(item.id);
    if (!Number.isFinite(id)) continue;
    const tipster = item.tipster?.displayName || item.tipster?.username;
    const result = (item.result || '').toString().toLowerCase();
    out.push({
      href: `/coupons/${id}`,
      title: couponDisplayTitle(item),
      meta: [result || null, tipster || null].filter(Boolean).join(' · ') || undefined,
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchJson(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${getServerBackendOrigin()}${path}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Best-effort live lists for Phase 3 hubs. Falls back across endpoints. */
export async function fetchPhase3LivePicks(
  kind: 'booking' | 'today' | 'settled' | 'btts' | 'over25' | 'ghana' | undefined,
  limit = 8,
): Promise<Phase3LiveItem[]> {
  if (!kind) return [];

  if (kind === 'settled') {
    const data = await fetchJson(`/api/v1/accumulators/archive?limit=${limit}`);
    return data ? toLiveItems(asItems(data), limit) : [];
  }

  if (kind === 'booking') {
    const data =
      (await fetchJson(`/api/v1/accumulators/marketplace/public?limit=24&hasBookingCode=1`)) ||
      (await fetchJson(`/api/v1/accumulators/marketplace/public?limit=24`));
    if (!data) return [];
    const items = asItems(data).filter((p) => {
      const code = (p as { bookingCode?: string | null }).bookingCode;
      return typeof code === 'string' && code.trim().length > 0;
    });
    const chosen = items.length > 0 ? items : asItems(data);
    return toLiveItems(chosen, limit);
  }

  // today / market hubs: marketplace football slice
  const data = await fetchJson(`/api/v1/accumulators/marketplace/public?limit=${limit}&sport=football`);
  if (data) return toLiveItems(asItems(data), limit);

  const archive = await fetchJson(`/api/v1/accumulators/archive?limit=${limit}`);
  return archive ? toLiveItems(asItems(archive), limit) : [];
}
