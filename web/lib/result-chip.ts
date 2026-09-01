/** Won / lost / void / pending chips. Sport emoji labels keep their own palette. */

export const RESULT_CHIP = {
  won: 'bg-[var(--success-light)] text-[var(--success)] border border-[var(--success)]/20',
  lost: 'bg-[var(--destructive-light)] text-[var(--destructive)] border border-[var(--destructive)]/25',
  void: 'bg-[var(--fill-secondary)] text-[var(--text-muted)] border border-[var(--separator)]',
  cancelled: 'bg-[var(--fill-secondary)] text-[var(--text-muted)] border border-[var(--separator)]',
  pending: 'bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/25',
  pending_approval: 'bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/25',
  active: 'bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20',
} as const;

const FALLBACK_CHIP =
  'bg-[var(--fill-secondary)] text-[var(--text-muted)] border border-[var(--separator)]';

export function resultChipClass(result?: string | null): string {
  if (!result) return FALLBACK_CHIP;
  const key = result.toLowerCase() as keyof typeof RESULT_CHIP;
  return RESULT_CHIP[key] ?? FALLBACK_CHIP;
}

export const RESULT_SURFACE = {
  won: 'border-[var(--success)]/25 bg-[var(--success-light)]',
  lost: 'border-[var(--destructive)]/25 bg-[var(--destructive-light)]',
  pending: 'border-[var(--border)] bg-[var(--card)]',
  void: 'border-[var(--border)] bg-[var(--card)]',
} as const;

export function resultSurfaceClass(result?: string | null): string {
  if (!result) return RESULT_SURFACE.pending;
  const key = result.toLowerCase() as keyof typeof RESULT_SURFACE;
  return RESULT_SURFACE[key] ?? RESULT_SURFACE.pending;
}

export const OUTCOME_TEXT = {
  positive: 'text-[var(--success)]',
  negative: 'text-[var(--destructive)]',
  muted: 'text-[var(--text-muted)]',
} as const;

export const OUTCOME_CARD = {
  positive: 'bg-[var(--success-light)] border-[var(--success)]/25',
  negative: 'bg-[var(--destructive-light)] border-[var(--destructive)]/25',
  neutral: 'bg-[var(--card)] border-[var(--border)]',
} as const;
