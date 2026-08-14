'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';

/** Tipster net share after platform fee on winning paid picks (matches Terms). */
export const TIPSTER_PAYOUT_SHARE = 0.7;
export const PLATFORM_FEE_SHARE = 0.3;

type SellerPayoutSplitCalloutProps = {
  priceGhs: number;
  className?: string;
  compact?: boolean;
};

/**
 * Clear 70/30 payout math before publishing a paid pick.
 */
export function SellerPayoutSplitCallout({
  priceGhs,
  className = '',
  compact = false,
}: SellerPayoutSplitCalloutProps) {
  const t = useT();
  const price = Math.max(0, Number(priceGhs) || 0);
  if (price <= 0) return null;

  const tipsterNet = price * TIPSTER_PAYOUT_SHARE;
  const platformFee = price * PLATFORM_FEE_SHARE;

  return (
    <aside
      className={`rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-900/15 ${
        compact ? 'px-3 py-2' : 'px-3.5 py-3'
      } min-w-0 ${className}`}
      aria-live="polite"
    >
      <p className={`font-semibold text-emerald-900 dark:text-emerald-200 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {t('seller_payout.title')}
      </p>
      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
        {t('seller_payout.body')}
      </p>
      <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg bg-[var(--card)]/80 border border-[var(--separator)] px-1.5 py-1.5">
          <dt className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">{t('seller_payout.buyer_pays')}</dt>
          <dd className="text-xs font-bold text-[var(--text)] tabular-nums">GHS {price.toFixed(2)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--card)]/80 border border-emerald-200/70 dark:border-emerald-800/40 px-1.5 py-1.5">
          <dt className="text-[9px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{t('seller_payout.you_get')}</dt>
          <dd className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">GHS {tipsterNet.toFixed(2)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--card)]/80 border border-amber-200/70 dark:border-amber-800/40 px-1.5 py-1.5">
          <dt className="text-[9px] uppercase tracking-wide text-amber-700 dark:text-amber-300">{t('seller_payout.platform')}</dt>
          <dd className="text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">GHS {platformFee.toFixed(2)}</dd>
        </div>
      </dl>
      <p className="mt-1.5 text-[10px] text-[var(--text-muted)] leading-snug">
        {t('seller_payout.loss_note')}{' '}
        <Link href="/earnings" className="text-[var(--primary)] hover:underline font-medium">
          {t('seller_payout.earnings_link')}
        </Link>
      </p>
    </aside>
  );
}
