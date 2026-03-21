/**
 * Shared withdrawal status labels and badge styles (user wallet + admin).
 * Keep in sync with backend statuses: pending | processing | completed | failed | rejected | cancelled
 */

export const WITHDRAWAL_STATUS_KEYS = {
  pending: 'wallet.status_pending',
  processing: 'wallet.status_processing',
  completed: 'wallet.status_completed',
  failed: 'wallet.status_failed',
  rejected: 'wallet.status_rejected',
  cancelled: 'wallet.status_cancelled',
} as const;

export type WithdrawalStatusKey = keyof typeof WITHDRAWAL_STATUS_KEYS;

export function withdrawalStatusLabelKey(status: string): string {
  return WITHDRAWAL_STATUS_KEYS[status as WithdrawalStatusKey] ?? 'wallet.status_unknown';
}

/** Admin table: colored pill */
export function adminWithdrawalStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    rejected: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return map[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}

/** User wallet list: compact pill */
export function walletWithdrawalStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    processing: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
    failed: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    rejected: 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30',
    cancelled: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  };
  return map[status] ?? 'bg-[var(--border)] text-[var(--text-muted)] border-[var(--border)]';
}

/** Admin UI (English) — table status column */
export const ADMIN_WITHDRAWAL_STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting review',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export function adminWithdrawalStatusLabel(status: string): string {
  return ADMIN_WITHDRAWAL_STATUS_LABEL[status] ?? status;
}
