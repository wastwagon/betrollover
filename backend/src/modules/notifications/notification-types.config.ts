/**
 * Comprehensive notification types for BetRollover platform.
 * Each type maps to in-app notification + optional email (via SendGrid).
 * Professional email templates use category-based styling and contextual subjects.
 */
export const NOTIFICATION_TYPES = {
  pick_published: {
    icon: 'check',
    defaultSubject: 'Pick Published',
    emailSubject: (ctx: Record<string, string>) => `Your pick "${ctx.pickTitle || 'Pick'}" is now live`,
    ctaText: 'View Marketplace',
    category: 'marketplace',
  },
  purchase: {
    icon: 'cart',
    defaultSubject: 'Purchase Complete',
    emailSubject: (ctx: Record<string, string>) => `Purchase confirmed: ${ctx.pickTitle || 'Pick'}`,
    ctaText: 'View My Purchases',
    category: 'marketplace',
  },
  settlement: {
    icon: 'trophy',
    defaultSubject: 'Pick Settled',
    emailSubject: (ctx: Record<string, string>) => ctx.variant === 'won' ? `Pick won: ${ctx.pickTitle || 'Pick'}` : `Pick settled: ${ctx.pickTitle || 'Pick'}`,
    ctaText: 'View My Purchases',
    category: 'marketplace',
  },
  roi_below_minimum: {
    icon: 'alert',
    defaultSubject: 'ROI Below Minimum',
    emailSubject: () => 'Your ROI has fallen below the minimum. Post free picks to improve.',
    ctaText: 'Create Free Pick',
    category: 'account',
  },
  deposit_success: {
    icon: 'wallet',
    defaultSubject: 'Deposit Received',
    emailSubject: (ctx: Record<string, string>) => `Deposit of GHS ${ctx.amount || '0'} received`,
    ctaText: 'View Wallet',
    category: 'wallet',
  },
  withdrawal_done: {
    icon: 'wallet',
    defaultSubject: 'Withdrawal Completed',
    emailSubject: (ctx: Record<string, string>) => `Withdrawal of GHS ${ctx.amount || '0'} completed`,
    ctaText: 'View Wallet',
    category: 'wallet',
  },
  withdrawal_failed: {
    icon: 'alert',
    defaultSubject: 'Withdrawal Failed',
    emailSubject: (ctx: Record<string, string>) => `Withdrawal of GHS ${ctx.amount || '0'} failed`,
    ctaText: 'View Wallet',
    category: 'wallet',
  },
  coupon_sold: {
    icon: 'cart',
    defaultSubject: 'Coupon Sold',
    emailSubject: (ctx: Record<string, string>) => `Someone purchased "${ctx.pickTitle || 'your coupon'}"`,
    ctaText: 'View Marketplace',
    category: 'marketplace',
  },
  new_follower: {
    icon: 'user-plus',
    defaultSubject: 'New Follower',
    emailSubject: () => 'Someone started following you',
    ctaText: 'View Tipsters',
    category: 'social',
  },
  new_pick_from_followed: {
    icon: 'bell',
    defaultSubject: 'New Pick from Followed Tipster',
    emailSubject: (ctx: Record<string, string>) => `${ctx.tipsterName || 'A tipster'} you follow posted a new pick`,
    ctaText: 'View Marketplace',
    category: 'social',
  },
  leaderboard_rank_up: {
    icon: 'trophy',
    defaultSubject: 'Leaderboard Rank Up',
    emailSubject: (ctx: Record<string, string>) => `You're now rank #${ctx.rank || '?'} on the leaderboard!`,
    ctaText: 'View Leaderboard',
    category: 'achievement',
  },
  tipster_approved: {
    icon: 'check',
    defaultSubject: 'Tipster Approved',
    emailSubject: () => 'You\'re now a tipster! Start creating picks.',
    ctaText: 'Create Pick',
    category: 'account',
  },
  tipster_rejected: {
    icon: 'x',
    defaultSubject: 'Tipster Request Rejected',
    emailSubject: () => 'Tipster request not approved',
    ctaText: 'Go to Dashboard',
    category: 'account',
  },
  system_announcement: {
    icon: 'megaphone',
    defaultSubject: 'Announcement',
    emailSubject: (ctx: Record<string, string>) => ctx.title || 'Platform announcement',
    ctaText: 'View Details',
    category: 'system',
  },
} as const;

export type NotificationTypeKey = keyof typeof NOTIFICATION_TYPES;

const CATEGORY_COLORS: Record<string, string> = {
  marketplace: '#10b981',
  wallet: '#3b82f6',
  account: '#8b5cf6',
  social: '#ec4899',
  achievement: '#f59e0b',
  system: '#64748b',
};

export function getNotificationTypeConfig(type: string) {
  return (NOTIFICATION_TYPES as Record<string, { emailSubject: (ctx: Record<string, string>) => string; ctaText?: string; category?: string }>)[type];
}

export function getEmailSubject(type: string, title: string, metadata?: Record<string, string>): string {
  const config = getNotificationTypeConfig(type);
  if (config?.emailSubject) {
    return config.emailSubject(metadata || {});
  }
  return title;
}

export function getCtaText(type: string): string {
  const config = getNotificationTypeConfig(type);
  return config?.ctaText || 'View details';
}

export function getCategoryColor(type: string): string {
  const config = getNotificationTypeConfig(type);
  const cat = config?.category || 'system';
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.system;
}
