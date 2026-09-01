import type { ComponentType } from 'react';
import {
  IconBell,
  IconCart,
  IconChat,
  IconHeart,
  IconPicks,
  IconShield,
  IconStar,
  IconTrophy,
  IconUsers,
  IconWallet,
} from '@/components/ios/icons';

export type NotificationVisual = {
  Icon: ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
};

const MARKETPLACE: NotificationVisual = {
  Icon: IconCart,
  colorClass: 'text-[var(--primary)]',
  bgClass: 'bg-[var(--primary-light)]',
};

const SOCIAL_CHAT: NotificationVisual = {
  Icon: IconChat,
  colorClass: 'text-[var(--primary)]',
  bgClass: 'bg-[var(--primary-light)]',
};

const SOCIAL_HEART: NotificationVisual = {
  Icon: IconHeart,
  colorClass: 'text-[var(--destructive)]',
  bgClass: 'bg-[var(--destructive-light)]',
};

const WALLET: NotificationVisual = {
  Icon: IconWallet,
  colorClass: 'text-[var(--primary)]',
  bgClass: 'bg-[var(--primary-light)]',
};

const ACCOUNT: NotificationVisual = {
  Icon: IconShield,
  colorClass: 'text-[var(--primary)]',
  bgClass: 'bg-[var(--primary-light)]',
};

const ACHIEVEMENT: NotificationVisual = {
  Icon: IconTrophy,
  colorClass: 'text-[var(--accent)]',
  bgClass: 'bg-[var(--accent-light)]',
};

const SYSTEM: NotificationVisual = {
  Icon: IconBell,
  colorClass: 'text-[var(--text-muted)]',
  bgClass: 'bg-[var(--fill-secondary)]',
};

const BY_TYPE: Record<string, NotificationVisual> = {
  purchase: MARKETPLACE,
  settlement: { Icon: IconTrophy, colorClass: 'text-[var(--primary)]', bgClass: 'bg-[var(--primary-light)]' },
  refund: { Icon: IconWallet, colorClass: 'text-[var(--accent)]', bgClass: 'bg-[var(--accent-light)]' },
  payout: MARKETPLACE,
  pick_published: MARKETPLACE,
  coupon_sold: MARKETPLACE,
  new_pick_from_followed: MARKETPLACE,
  subscription: { Icon: IconStar, colorClass: 'text-[var(--accent)]', bgClass: 'bg-[var(--accent-light)]' },
  subscription_refund: WALLET,
  subscription_payout: WALLET,
  deposit_success: WALLET,
  withdrawal: WALLET,
  withdrawal_done: { Icon: IconWallet, colorClass: 'text-[var(--success)]', bgClass: 'bg-[var(--success-light)]' },
  withdrawal_failed: { Icon: IconWallet, colorClass: 'text-[var(--destructive)]', bgClass: 'bg-[var(--destructive-light)]' },
  withdrawal_rejected: { Icon: IconWallet, colorClass: 'text-[var(--accent)]', bgClass: 'bg-[var(--accent-light)]' },
  new_follower: { Icon: IconUsers, colorClass: 'text-[var(--primary)]', bgClass: 'bg-[var(--primary-light)]' },
  follow: { Icon: IconUsers, colorClass: 'text-[var(--primary)]', bgClass: 'bg-[var(--primary-light)]' },
  roi_below_minimum: ACCOUNT,
  tipster_approved: { Icon: IconPicks, colorClass: 'text-[var(--success)]', bgClass: 'bg-[var(--success-light)]' },
  tipster_rejected: ACCOUNT,
  support: ACCOUNT,
  leaderboard_rank_up: ACHIEVEMENT,
  system: SYSTEM,
  system_announcement: SYSTEM,
  pick_comment: SOCIAL_CHAT,
  pick_comment_reply: SOCIAL_CHAT,
  pick_comment_thread: SOCIAL_CHAT,
  pick_comment_reaction: SOCIAL_HEART,
  pick_comment_mention: SOCIAL_CHAT,
};

const BY_ICON: Record<string, NotificationVisual> = {
  bell: SYSTEM,
  cart: MARKETPLACE,
  comment: SOCIAL_CHAT,
  trophy: ACHIEVEMENT,
  wallet: WALLET,
  'user-plus': { Icon: IconUsers, colorClass: 'text-[var(--primary)]', bgClass: 'bg-[var(--primary-light)]' },
  star: { Icon: IconStar, colorClass: 'text-[var(--accent)]', bgClass: 'bg-[var(--accent-light)]' },
  check: { Icon: IconPicks, colorClass: 'text-[var(--success)]', bgClass: 'bg-[var(--success-light)]' },
  alert: { Icon: IconShield, colorClass: 'text-[var(--accent)]', bgClass: 'bg-[var(--accent-light)]' },
};

/**
 * iOS-style notification row visuals (icon + tint) aligned with backend notification-types.config categories.
 */
export function getNotificationVisual(type: string, icon?: string | null): NotificationVisual {
  const lower = (type || '').toLowerCase();
  if (BY_TYPE[lower]) return BY_TYPE[lower];
  if (lower.startsWith('pick_comment')) {
    return lower === 'pick_comment_reaction' ? SOCIAL_HEART : SOCIAL_CHAT;
  }
  if (lower.includes('withdrawal')) {
    if (lower.includes('failed')) return BY_TYPE.withdrawal_failed;
    if (lower.includes('reject')) return BY_TYPE.withdrawal_rejected;
    if (lower.includes('done') || lower.includes('complete')) return BY_TYPE.withdrawal_done;
    return WALLET;
  }
  if (lower.includes('deposit') || lower.includes('wallet') || lower.includes('subscription')) {
    return WALLET;
  }
  if (lower.includes('purchase') || lower.includes('settlement') || lower.includes('pick') || lower.includes('coupon')) {
    return MARKETPLACE;
  }
  if (lower.includes('follow')) return BY_TYPE.new_follower;
  if (icon && BY_ICON[icon]) return BY_ICON[icon];
  return SYSTEM;
}
