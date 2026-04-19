/**
 * Admin notification templates.
 * Used by EmailService.sendAdminNotification for consistent subject, message, and CTA.
 */
export const ADMIN_NOTIFICATION_TEMPLATES = {
  withdrawal_request: {
    subject: (ctx: { amount: string; displayName: string }) =>
      `Withdrawal request: GHS ${ctx.amount} from ${ctx.displayName}`,
    message: (ctx: { displayName: string; email: string; amount: string; manual?: boolean }) =>
      ctx.manual
        ? `${ctx.displayName} (${ctx.email}) has requested a withdrawal of GHS ${ctx.amount}. Payout is manual — review and process in Admin → Withdrawals.`
        : `${ctx.displayName} (${ctx.email}) has requested a withdrawal of GHS ${ctx.amount}. Paystack transfer may be in progress or completed automatically.`,
    ctaText: 'View Withdrawals',
    link: '/admin/withdrawals',
    accentColor: '#64748b',
  },
  deposit_completed: {
    subject: (ctx: { amount: string; displayName: string }) =>
      `Deposit completed: GHS ${ctx.amount} from ${ctx.displayName}`,
    message: (ctx: { displayName: string; email: string; amount: string }) =>
      `${ctx.displayName} (${ctx.email}) has deposited GHS ${ctx.amount}. Funds have been credited to their wallet.`,
    ctaText: 'View Deposits',
    link: '/admin/deposits',
    accentColor: '#3b82f6',
  },
  new_user_registered: {
    subject: (ctx: { displayName: string }) =>
      `New user registered: ${ctx.displayName}`,
    message: (ctx: { displayName: string; email: string; username: string }) =>
      `${ctx.displayName} (${ctx.email}) has signed up as @${ctx.username}. They have been auto-approved as a tipster.`,
    ctaText: 'View Users',
    link: '/admin/users',
    accentColor: '#8b5cf6',
  },
  new_coupon_posted: {
    subject: (ctx: { couponId: number; creatorName: string }) =>
      `New pick #${ctx.couponId} by ${ctx.creatorName}`,
    message: (ctx: { creatorName: string; couponId: number; price?: number; isFree?: boolean }) =>
      ctx.isFree
        ? `${ctx.creatorName} has posted a free pick to the marketplace (pick #${ctx.couponId}).`
        : `${ctx.creatorName} has posted a marketplace pick at GHS ${Number(ctx.price || 0).toFixed(2)} (pick #${ctx.couponId}).`,
    ctaText: 'View Marketplace',
    link: '/admin/marketplace',
    accentColor: '#10b981',
  },
} as const;

export type AdminNotificationType = keyof typeof ADMIN_NOTIFICATION_TEMPLATES;
