/**
 * Admin notification templates.
 * Used by EmailService.sendAdminNotification for consistent subject, message, and CTA.
 */
export const ADMIN_NOTIFICATION_TEMPLATES = {
  withdrawal_request: {
    subject: (ctx: { amount: string; displayName: string }) =>
      `Withdrawal request: GHS ${ctx.amount} from ${ctx.displayName}`,
    message: (ctx: { displayName: string; email: string; amount: string }) =>
      `${ctx.displayName} (${ctx.email}) has requested a withdrawal of GHS ${ctx.amount}. The transfer is being processed via Paystack.`,
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
    subject: (ctx: { pickTitle: string; creatorName: string }) =>
      `New coupon: "${ctx.pickTitle}" by ${ctx.creatorName}`,
    message: (ctx: { creatorName: string; pickTitle: string; price?: number; isFree?: boolean }) =>
      ctx.isFree
        ? `${ctx.creatorName} has posted a free pick "${ctx.pickTitle}" to the marketplace.`
        : `${ctx.creatorName} has posted "${ctx.pickTitle}" at GHS ${Number(ctx.price || 0).toFixed(2)} to the marketplace.`,
    ctaText: 'View Marketplace',
    link: '/admin/marketplace',
    accentColor: '#10b981',
  },
} as const;

export type AdminNotificationType = keyof typeof ADMIN_NOTIFICATION_TEMPLATES;
