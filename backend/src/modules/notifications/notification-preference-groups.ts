/**
 * Notification preference groups — UI toggles map to these keys; individual API types resolve to a group.
 */
export const NOTIFICATION_PREFERENCE_GROUPS = [
  'marketplace',
  'wallet',
  'social',
  'account',
  'system',
] as const;

export type NotificationPreferenceGroup = (typeof NOTIFICATION_PREFERENCE_GROUPS)[number];

const MARKETPLACE_TYPES = new Set([
  'pick_published',
  'purchase',
  'settlement',
  'coupon_sold',
  'new_pick_from_followed',
  'subscription',
  'leaderboard_rank_up',
]);

const WALLET_TYPES = new Set([
  'deposit_success',
  'withdrawal',
  'withdrawal_done',
  'withdrawal_failed',
  'withdrawal_rejected',
  'subscription_refund',
  'subscription_payout',
  'refund',
  'payout',
]);

const SOCIAL_TYPES = new Set(['new_follower', 'follow']);

const ACCOUNT_TYPES = new Set([
  'roi_below_minimum',
  'tipster_approved',
  'tipster_rejected',
  'support',
]);

export function resolveNotificationPreferenceGroup(type: string): NotificationPreferenceGroup {
  const lower = (type || '').toLowerCase();
  if (lower.startsWith('pick_comment') || lower === 'pick_comment_mention') return 'social';
  if (MARKETPLACE_TYPES.has(lower)) return 'marketplace';
  if (WALLET_TYPES.has(lower) || lower.includes('withdrawal') || lower.includes('deposit')) return 'wallet';
  if (SOCIAL_TYPES.has(lower) || lower.includes('follow')) return 'social';
  if (ACCOUNT_TYPES.has(lower) || lower.includes('tipster') || lower === 'support') return 'account';
  return 'system';
}

export function isNotificationPreferenceGroup(value: string): value is NotificationPreferenceGroup {
  return (NOTIFICATION_PREFERENCE_GROUPS as readonly string[]).includes(value);
}
