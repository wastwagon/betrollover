'use client';

import Link from 'next/link';
import { useT } from '@/context/LanguageContext';
import type { TipsterCardData } from '@/components/TipsterCard';

type TipsterCompareBarProps = {
  selected: TipsterCardData[];
  onClear: () => void;
  onRemove: (id: number) => void;
};

/**
 * Sticky compare tray — up to 3 tipsters side-by-side.
 */
export function TipsterCompareBar({ selected, onClear, onRemove }: TipsterCompareBarProps) {
  const t = useT();
  if (selected.length < 2) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] xl:bottom-4 z-40 px-3 pointer-events-none">
      <div className="mx-auto max-w-4xl pointer-events-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-bold text-[var(--text)]">{t('tipster.compare_title')}</p>
          <button type="button" onClick={onClear} className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--primary)]">
            {t('tipster.compare_clear')}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {selected.map((tip) => {
            const settled = (tip.total_wins ?? 0) + (tip.total_losses ?? 0);
            return (
              <div
                key={tip.id}
                className="relative rounded-xl border border-[var(--separator)] bg-[var(--fill-secondary)]/40 px-2.5 py-2 min-w-0"
              >
                <button
                  type="button"
                  onClick={() => onRemove(tip.id)}
                  className="absolute top-1 right-1 text-[var(--text-muted)] hover:text-red-600 text-sm leading-none px-1"
                  aria-label={t('tipster.compare_remove')}
                >
                  ×
                </button>
                <Link href={`/tipsters/${tip.username}`} className="block min-w-0 pr-4 hover:text-[var(--primary)]">
                  <p className="text-xs font-semibold truncate text-[var(--text)]">{tip.display_name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">@{tip.username}</p>
                </Link>
                <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                  <div>
                    <dt className="text-[var(--text-muted)]">ROI</dt>
                    <dd className="font-bold tabular-nums text-[var(--text)]">
                      {settled > 0 ? `${Number(tip.roi).toFixed(1)}%` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">{t('tipster.win_rate_short')}</dt>
                    <dd className="font-bold tabular-nums text-[var(--text)]">
                      {settled > 0 ? `${Number(tip.win_rate).toFixed(0)}%` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">{t('tipster.settled_short')}</dt>
                    <dd className="font-bold tabular-nums text-[var(--text)]">{settled}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">★</dt>
                    <dd className="font-bold tabular-nums text-[var(--text)]">
                      {tip.avg_rating != null && (tip.review_count ?? 0) > 0
                        ? Number(tip.avg_rating).toFixed(1)
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
