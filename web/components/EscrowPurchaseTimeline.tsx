'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';

export type EscrowPhase = 'purchased' | 'held' | 'settling' | 'released' | 'refunded';

type EscrowPurchaseTimelineProps = {
  result?: string | null;
  escrowStatus?: 'held' | 'released' | 'refunded' | string | null;
  isPaid: boolean;
  purchasedAt?: string | null;
  className?: string;
  compact?: boolean;
};

function normalizeResult(result?: string | null): string {
  return (result ?? 'pending').toLowerCase();
}

export function resolveEscrowPhase(opts: {
  result?: string | null;
  escrowStatus?: string | null;
  isPaid: boolean;
}): EscrowPhase {
  const r = normalizeResult(opts.result);
  const esc = (opts.escrowStatus ?? '').toLowerCase();

  if (!opts.isPaid) {
    if (r === 'won') return 'released';
    if (r === 'lost' || r === 'void') return 'refunded';
    return 'settling';
  }

  if (esc === 'released' || r === 'won') return 'released';
  if (esc === 'refunded' || r === 'lost' || r === 'void') return 'refunded';
  if (r === 'pending') return 'held';
  return 'held';
}

function stepsForOutcome(
  phase: EscrowPhase,
  isPaid: boolean,
): { id: EscrowPhase; labelKey: string }[] {
  if (!isPaid) {
    return [
      { id: 'purchased', labelKey: 'escrow_timeline.step_unlocked' },
      { id: 'settling', labelKey: 'escrow_timeline.step_settling' },
      {
        id: phase === 'released' ? 'released' : 'refunded',
        labelKey: 'escrow_timeline.step_settled',
      },
    ];
  }
  const final: EscrowPhase = phase === 'refunded' ? 'refunded' : 'released';
  return [
    { id: 'purchased', labelKey: 'escrow_timeline.step_purchased' },
    { id: 'held', labelKey: 'escrow_timeline.step_held' },
    { id: 'settling', labelKey: 'escrow_timeline.step_settling' },
    {
      id: final,
      labelKey: final === 'released' ? 'escrow_timeline.step_released' : 'escrow_timeline.step_refunded',
    },
  ];
}

function phaseIndex(phase: EscrowPhase, steps: { id: EscrowPhase }[]): number {
  const i = steps.findIndex((s) => s.id === phase);
  if (i >= 0) return i;
  if (phase === 'held' || phase === 'settling') {
    const mid = steps.findIndex((s) => s.id === 'held' || s.id === 'settling');
    return mid >= 0 ? mid : 0;
  }
  return Math.max(0, steps.length - 1);
}

/** Buyer-facing escrow state machine: Purchased → Held → Settling → Released/Refunded. */
export function EscrowPurchaseTimeline({
  result,
  escrowStatus,
  isPaid,
  purchasedAt,
  className = '',
  compact = false,
}: EscrowPurchaseTimelineProps) {
  const t = useT();
  const phase = resolveEscrowPhase({ result, escrowStatus, isPaid });
  const steps = stepsForOutcome(phase, isPaid);
  const activeIdx = phaseIndex(phase, steps);
  const isTerminal = phase === 'released' || phase === 'refunded';

  const caption =
    phase === 'held'
      ? t('escrow_timeline.caption_held')
      : phase === 'settling'
        ? t('escrow_timeline.caption_settling')
        : phase === 'released'
          ? isPaid
            ? t('escrow_timeline.caption_released')
            : t('escrow_timeline.caption_settled_free')
          : phase === 'refunded'
            ? isPaid
              ? t('escrow_timeline.caption_refunded')
              : t('escrow_timeline.caption_settled_free')
            : t('escrow_timeline.caption_purchased');

  return (
    <aside
      className={`rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary-light)] ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5'
      } min-w-0 ${className}`}
      aria-label={t('escrow_timeline.title')}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className={`font-bold text-[var(--primary)] ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {t('escrow_timeline.title')}
        </p>
        {purchasedAt ? (
          <time className="text-[10px] text-[var(--text-muted)] tabular-nums shrink-0">
            {new Date(purchasedAt).toLocaleDateString()}
          </time>
        ) : null}
      </div>

      <ol className="flex items-start gap-0 min-w-0">
        {steps.map((step, idx) => {
          const complete = idx < activeIdx || (idx === activeIdx && isTerminal);
          const current = idx === activeIdx;
          const isLast = idx === steps.length - 1;
          const finalAmber = phase === 'refunded' && idx === steps.length - 1 && isPaid;
          return (
            <li key={`${step.id}-${idx}`} className="flex-1 min-w-0 flex flex-col items-center relative">
              {!isLast ? (
                <span
                  className={`absolute top-2 left-[50%] w-full h-0.5 ${
                    idx < activeIdx ? 'bg-[var(--primary)]' : 'bg-[var(--separator)]'
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative z-[1] flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold border ${
                  complete || current
                    ? finalAmber
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                      : 'bg-[var(--primary)] border-[var(--primary)] text-white'
                    : 'bg-[var(--card)] border-[var(--separator)] text-[var(--text-muted)]'
                }`}
              >
                {complete ? '✓' : idx + 1}
              </span>
              <span
                className={`mt-1.5 text-center leading-tight px-0.5 ${
                  compact ? 'text-[9px]' : 'text-[10px]'
                } ${
                  current || complete
                    ? 'font-semibold text-[var(--primary)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {t(step.labelKey)}
              </span>
            </li>
          );
        })}
      </ol>

      <p
        className={`mt-2.5 text-[var(--text)] leading-snug ${
          compact ? 'text-[10px]' : 'text-xs'
        }`}
      >
        {caption}
        {phase === 'refunded' && isPaid ? (
          <>
            {' '}
            <Link href="/wallet" className="font-semibold underline underline-offset-2">
              {t('wallet.title')}
            </Link>
          </>
        ) : null}
      </p>
    </aside>
  );
}
