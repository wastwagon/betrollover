'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import { getApiUrl } from '@/lib/site-config';
import {
  fetchSellingThresholds,
  type SellingThresholds,
  SELLING_THRESHOLDS_FALLBACK,
} from '@/lib/selling-thresholds';

type TipsterStats = {
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  winRate: number;
  roi: number;
};

type TipsterSellUnlockChecklistProps = {
  className?: string;
  compact?: boolean;
};

/**
 * Progress toward paid marketplace unlock (min ROI + min win rate).
 */
export function TipsterSellUnlockChecklist({
  className = '',
  compact = false,
}: TipsterSellUnlockChecklistProps) {
  const t = useT();
  const [stats, setStats] = useState<TipsterStats | null>(null);
  const [thresholds, setThresholds] = useState<SellingThresholds>(SELLING_THRESHOLDS_FALLBACK);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    Promise.all([
      fetch(`${getApiUrl()}/tipster/stats`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetchSellingThresholds(),
    ])
      .then(([s, th]) => {
        if (cancelled) return;
        if (s && typeof s === 'object') {
          setStats({
            totalPicks: Number(s.totalPicks) || 0,
            wonPicks: Number(s.wonPicks) || 0,
            lostPicks: Number(s.lostPicks) || 0,
            winRate: Number(s.winRate) || 0,
            roi: Number(s.roi) || 0,
          });
        }
        setThresholds(th);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !stats) return null;

  const settled = stats.wonPicks + stats.lostPicks;
  const hasRecord = settled > 0;
  const roiOk = hasRecord && stats.roi >= thresholds.minimumROI;
  const wrOk = hasRecord && stats.winRate >= thresholds.minimumWinRate;
  const canSell = roiOk && wrOk;

  const steps = [
    {
      id: 'record',
      done: hasRecord,
      label: t('seller_checklist.step_settle', { n: String(Math.max(settled, 0)) }),
    },
    {
      id: 'roi',
      done: roiOk,
      label: t('seller_checklist.step_roi', {
        current: hasRecord ? stats.roi.toFixed(1) : '—',
        min: String(thresholds.minimumROI),
      }),
    },
    {
      id: 'wr',
      done: wrOk,
      label: t('seller_checklist.step_wr', {
        current: hasRecord ? stats.winRate.toFixed(1) : '—',
        min: String(thresholds.minimumWinRate),
      }),
    },
  ];

  return (
    <aside
      className={`rounded-2xl border ${
        canSell
          ? 'border-[var(--primary)]/25 bg-[var(--primary-light)]'
          : 'border-[var(--accent)]/40 bg-[var(--accent)]/10'
      } ${compact ? 'px-3 py-2.5' : 'px-4 py-3.5'} min-w-0 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p
            className={`font-bold ${compact ? 'text-[11px]' : 'text-xs'} ${
              canSell
                ? 'text-[var(--primary)]'
                : 'text-[var(--accent)]'
            }`}
          >
            {canSell ? t('seller_checklist.title_ready') : t('seller_checklist.title_build')}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
            {canSell ? t('seller_checklist.sub_ready') : t('seller_checklist.sub_build')}
          </p>
        </div>
        <Link
          href="/create-pick"
          className={`shrink-0 text-xs font-semibold ${
            canSell ? 'text-[var(--primary)]' : 'text-[var(--accent)]'
          } hover:underline`}
        >
          {canSell ? t('dashboard.create_paid_pick') : t('dashboard.create_free_pick')} →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-2 text-xs text-[var(--text)]">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                s.done
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--card)] border border-[var(--separator)] text-[var(--text-muted)]'
              }`}
              aria-hidden
            >
              {s.done ? '✓' : ''}
            </span>
            <span className={s.done ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}>{s.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
