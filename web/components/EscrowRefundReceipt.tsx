'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { IconShield } from '@/components/ios/icons';
import { resolveEscrowPhase } from '@/components/EscrowPurchaseTimeline';

type EscrowRefundReceiptProps = {
  result?: string | null;
  escrowStatus?: string | null;
  isPaid: boolean;
  amount?: number | null;
  settledAt?: string | null;
  className?: string;
};

/** Buyer-facing proof that a lost/void paid pick credited the wallet. */
export function EscrowRefundReceipt({
  result,
  escrowStatus,
  isPaid,
  amount,
  settledAt,
  className = '',
}: EscrowRefundReceiptProps) {
  const t = useT();
  const phase = resolveEscrowPhase({ result, escrowStatus, isPaid });
  if (!isPaid || phase !== 'refunded') return null;

  const amt = amount != null && Number.isFinite(Number(amount)) ? Number(amount) : null;

  return (
    <aside
      className={`rounded-2xl border border-[var(--success)]/25 bg-[var(--success-light)] p-4 min-w-0 ${className}`}
      aria-label={t('escrow_receipt.title')}
    >
      <div className="flex items-start gap-3 min-w-0">
        <IconShield className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--success)]">
            {t('escrow_receipt.title')}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)] tabular-nums">
            {amt != null
              ? t('escrow_receipt.credited', { amount: amt.toFixed(2) })
              : t('escrow_receipt.credited_generic')}
          </p>
          {settledAt ? (
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)] tabular-nums">
              {t('escrow_receipt.settled')} {new Date(settledAt).toLocaleString()}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-[var(--text-muted)] leading-snug">
            {t('escrow_receipt.body')}
          </p>
          <Link
            href="/wallet"
            className="inline-flex mt-2 text-sm font-semibold text-[var(--primary)] underline underline-offset-2"
          >
            {t('escrow_receipt.wallet')}
          </Link>
        </div>
      </div>
    </aside>
  );
}
