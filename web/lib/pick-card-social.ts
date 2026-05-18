import type { PickSocialCounts } from '@/components/pick-social/PickSocialBar';

export interface PickSocialFields {
  id: number;
  reactionCount?: number;
  hasReacted?: boolean;
  commentCount?: number;
}

export function getPickCardSocialProps(
  pick: PickSocialFields,
  options?: {
    enabled?: boolean;
    /** When true, skip per-card social-summary fetch (list APIs already returned counts). */
    countsFromServer?: boolean;
    loginRedirectPath?: string;
    onCountsChange?: (pickId: number, counts: PickSocialCounts) => void;
  },
) {
  const enabled = options?.enabled !== false;
  return {
    socialEnabled: enabled,
    socialCountsFromServer: options?.countsFromServer !== false,
    reactionCount: pick.reactionCount ?? 0,
    hasReacted: pick.hasReacted ?? false,
    commentCount: pick.commentCount ?? 0,
    loginRedirectPath: options?.loginRedirectPath,
    onSocialCountsChange: options?.onCountsChange
      ? (counts: PickSocialCounts) => options.onCountsChange!(pick.id, counts)
      : undefined,
  };
}

export function mergeSocialCountsIntoList<T extends PickSocialFields>(
  list: T[],
  pickId: number,
  counts: PickSocialCounts,
): T[] {
  return list.map((p) =>
    p.id === pickId
      ? {
          ...p,
          reactionCount: counts.reactionCount,
          hasReacted: counts.hasReacted,
          commentCount: counts.commentCount,
        }
      : p,
  );
}
