import { getApiUrl } from '@/lib/site-config';
import type { PickSocialCounts } from '@/components/pick-social/PickSocialBar';

const cache = new Map<string, Promise<PickSocialCounts | null>>();

/** Load reaction/comment counts for a pick card (cached briefly per id). */
export async function fetchPickSocialSummary(pickId: number): Promise<PickSocialCounts | null> {
  if (pickId <= 0) return null;
  const key = String(pickId);
  let pending = cache.get(key);
  if (!pending) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    pending = fetch(`${getApiUrl()}/accumulators/${pickId}/social-summary`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || typeof data !== 'object') return null;
        return {
          reactionCount: Number((data as PickSocialCounts).reactionCount ?? 0),
          hasReacted: !!(data as PickSocialCounts).hasReacted,
          commentCount: Number((data as PickSocialCounts).commentCount ?? 0),
        };
      })
      .catch(() => null)
      .finally(() => {
        if (typeof window !== 'undefined') {
          window.setTimeout(() => cache.delete(key), 8000);
        }
      });
    cache.set(key, pending);
  }
  return pending;
}
