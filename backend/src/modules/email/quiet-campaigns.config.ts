export type QuietStepKey = 'quiet_7d' | 'quiet_14d';

export type QuietStep = {
  key: QuietStepKey;
  minHoursQuiet: number;
  requiresPrior: QuietStepKey | null;
  subject: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
};

export const QUIET_7_HOURS = 7 * 24;
export const QUIET_14_HOURS = 14 * 24;
/** Digest only if last login or purchase is newer than this. Quiet nudges take over after. */
export const DIGEST_ACTIVE_WITHIN_HOURS = QUIET_7_HOURS;

/** Opt-in only. One-time 7d then 14d. Informational — not betting advice. */
export const QUIET_STEPS: QuietStep[] = [
  {
    key: 'quiet_7d',
    minHoursQuiet: QUIET_7_HOURS,
    requiresPrior: null,
    subject: 'A short list is waiting',
    eyebrow: 'Still here',
    title: 'Today’s free slips',
    body: 'Ranked free football slips are on the homepage — still to kick off. Informational only — 18+. You pick your own legs; we don’t stake for you.',
    ctaLabel: 'View today’s list',
    ctaPath: '/#free-tip-of-the-day',
  },
  {
    key: 'quiet_14d',
    minHoursQuiet: QUIET_14_HOURS,
    requiresPrior: 'quiet_7d',
    subject: 'Two-fold shorts from tipsters',
    eyebrow: 'Tipsters',
    title: 'Short lists, two legs',
    body: 'Over 1.5 and Over 2.5 2-folds are on the board. Follow a tipster for those shorts. Educational tool — not a guarantee. 18+.',
    ctaLabel: 'Browse tipsters',
    ctaPath: '/tipsters',
  },
];

export function lastActivityMs(
  user: { lastLogin?: Date | null; createdAt?: Date | null },
  lastPurchaseMs = 0,
): number {
  const login = user.lastLogin ? new Date(user.lastLogin).getTime() : 0;
  const created = user.createdAt ? new Date(user.createdAt).getTime() : 0;
  return Math.max(login, lastPurchaseMs || 0, created);
}

export function pickQuietStep(hoursQuiet: number, sent: Set<string>): QuietStep | null {
  for (const step of QUIET_STEPS) {
    if (sent.has(step.key)) continue;
    if (hoursQuiet < step.minHoursQuiet) continue;
    if (step.requiresPrior && !sent.has(step.requiresPrior)) continue;
    return step;
  }
  return null;
}
