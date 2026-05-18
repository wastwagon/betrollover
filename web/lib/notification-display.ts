import type { NotificationListItem } from '@/components/notifications/NotificationListRow';

type TranslateFn = (key: string, params?: Record<string, string>) => string;

const PICK_SOCIAL_I18N: Record<string, { title: string; message: string }> = {
  pick_comment: {
    title: 'notifications.pick_comment.title',
    message: 'notifications.pick_comment.message',
  },
  pick_comment_reply: {
    title: 'notifications.pick_comment.reply_title',
    message: 'notifications.pick_comment.reply_message',
  },
  pick_comment_thread: {
    title: 'notifications.pick_comment.thread_title',
    message: 'notifications.pick_comment.thread_message',
  },
  pick_comment_reaction: {
    title: 'notifications.pick_comment.reaction_title',
    message: 'notifications.pick_comment.reaction_message',
  },
  pick_comment_mention: {
    title: 'notifications.pick_comment.mention_title',
    message: 'notifications.pick_comment.mention_message',
  },
};

function metaString(metadata: NotificationListItem['metadata'], key: string): string {
  if (!metadata || typeof metadata !== 'object') return '';
  const v = (metadata as Record<string, unknown>)[key];
  return v != null ? String(v) : '';
}

/** Prefer localized copy for pick-comment alerts when metadata includes actor name. */
export function localizeNotification(
  n: Pick<NotificationListItem, 'type' | 'title' | 'message' | 'metadata'>,
  t: TranslateFn,
): { title: string; message: string } {
  const keys = PICK_SOCIAL_I18N[n.type];
  const actor = metaString(n.metadata, 'actorName');
  const pick = metaString(n.metadata, 'pickLabel') || metaString(n.metadata, 'pickTitle');
  if (keys && actor) {
    const params = { actor, pick };
    return { title: t(keys.title, params), message: t(keys.message, params) };
  }
  return { title: n.title, message: n.message };
}
