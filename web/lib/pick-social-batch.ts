import { getApiUrl } from '@/lib/site-config';
import type { PickSocialCounts } from '@/components/pick-social/PickSocialBar';

const FLUSH_MS = 48;
const pending = new Set<number>();
const waiters = new Map<number, Array<(value: PickSocialCounts | null) => void>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushQueue() {
  flushTimer = null;
  const ids = [...pending];
  pending.clear();
  if (ids.length === 0) return;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  void fetch(`${getApiUrl()}/accumulators/social-summary/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids }),
  })
    .then((r) => (r.ok ? r.json() : {}))
    .then((data: Record<string, PickSocialCounts>) => {
      for (const id of ids) {
        const raw = data[String(id)];
        const value: PickSocialCounts | null = raw
          ? {
              reactionCount: Number(raw.reactionCount ?? 0),
              hasReacted: !!raw.hasReacted,
              commentCount: Number(raw.commentCount ?? 0),
            }
          : null;
        const cbs = waiters.get(id) ?? [];
        waiters.delete(id);
        cbs.forEach((cb) => cb(value));
      }
    })
    .catch(() => {
      for (const id of ids) {
        const cbs = waiters.get(id) ?? [];
        waiters.delete(id);
        cbs.forEach((cb) => cb(null));
      }
    });
}

/** Coalesce per-card social-summary requests into one batch call. */
export function requestPickSocialSummaryBatch(pickId: number): Promise<PickSocialCounts | null> {
  if (pickId <= 0) return Promise.resolve(null);
  return new Promise((resolve) => {
    const list = waiters.get(pickId) ?? [];
    list.push(resolve);
    waiters.set(pickId, list);
    pending.add(pickId);
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushQueue, FLUSH_MS);
  });
}

/** Direct batch fetch for pages that know all visible pick ids up front. */
export async function fetchPickSocialSummariesBatch(
  pickIds: number[],
): Promise<Map<number, PickSocialCounts>> {
  const ids = [...new Set(pickIds.filter((id) => id > 0))].slice(0, 80);
  const out = new Map<number, PickSocialCounts>();
  if (ids.length === 0) return out;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${getApiUrl()}/accumulators/social-summary/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) return out;
  const data = (await res.json()) as Record<string, PickSocialCounts>;
  for (const id of ids) {
    const raw = data[String(id)];
    if (!raw) continue;
    out.set(id, {
      reactionCount: Number(raw.reactionCount ?? 0),
      hasReacted: !!raw.hasReacted,
      commentCount: Number(raw.commentCount ?? 0),
    });
  }
  return out;
}
