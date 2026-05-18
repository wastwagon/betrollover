import type { PickCommentItem } from '@/components/pick-social/PickCommentsPanel';

export function findInTree(items: PickCommentItem[], id: number): PickCommentItem | null {
  for (const c of items) {
    if (c.id === id) return c;
    const nested = findInTree(c.replies ?? [], id);
    if (nested) return nested;
  }
  return null;
}

export function maxCommentIdInTree(items: PickCommentItem[]): number {
  let max = 0;
  const walk = (list: PickCommentItem[]) => {
    for (const c of list) {
      if (c.id > max) max = c.id;
      if (c.replies?.length) walk(c.replies);
    }
  };
  walk(items);
  return max;
}

export function addReplyToTree(
  items: PickCommentItem[],
  parentId: number,
  reply: PickCommentItem,
): PickCommentItem[] {
  return items.map((c) => {
    if (c.id === parentId) {
      return { ...c, replies: [...(c.replies ?? []), { ...reply, replies: reply.replies ?? [] }] };
    }
    if (c.replies?.length) {
      return { ...c, replies: addReplyToTree(c.replies, parentId, reply) };
    }
    return c;
  });
}

/** Merge incremental poll payloads into the threaded comment tree. */
export function mergePollComments(prev: PickCommentItem[], incoming: PickCommentItem[]): {
  tree: PickCommentItem[];
  needsFullReload: boolean;
} {
  if (incoming.length === 0) {
    return { tree: prev, needsFullReload: false };
  }
  let next = prev;
  let needsFullReload = false;
  for (const c of incoming) {
    if (findInTree(next, c.id)) continue;
    if (c.parentId == null) {
      next = [...next, { ...c, replies: c.replies ?? [] }];
      continue;
    }
    if (!findInTree(next, c.parentId)) {
      needsFullReload = true;
      continue;
    }
    next = addReplyToTree(next, c.parentId, { ...c, replies: c.replies ?? [] });
  }
  return { tree: next, needsFullReload };
}
