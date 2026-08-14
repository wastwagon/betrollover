'use client';

import { useT } from '@/context/LanguageContext';
import { formatFootballOutcomeLabel } from '@betrollover/shared-types';

export type ListingPreviewSelection = {
  matchDescription: string;
  prediction: string;
  odds: number;
  sport?: string;
};

type CreatePickListingPreviewProps = {
  title: string;
  selections: ListingPreviewSelection[];
  totalOdds: number;
  price: number;
  className?: string;
};

/**
 * First-listing preview: how the marketplace card will read before publish.
 */
export function CreatePickListingPreview({
  title,
  selections,
  totalOdds,
  price,
  className = '',
}: CreatePickListingPreviewProps) {
  const t = useT();
  if (selections.length === 0) return null;

  const displayTitle = title.trim() || t('create_pick.preview_untitled');
  const isFree = !(Number(price) > 0);

  return (
    <div
      className={`rounded-xl border border-dashed border-[var(--primary)]/40 bg-[var(--card)]/90 px-3 py-3 min-w-0 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
        {t('create_pick.preview_label')}
      </p>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <p className="text-sm font-semibold text-[var(--text)] truncate min-w-0" title={displayTitle}>
          {displayTitle}
        </p>
        <span
          className={`shrink-0 text-xs font-bold tabular-nums ${
            isFree ? 'text-violet-700 dark:text-violet-300' : 'text-[var(--primary)]'
          }`}
        >
          {isFree ? t('marketplace.filter_free_only') : `GHS ${Number(price).toFixed(2)}`}
        </span>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
        {t('pick_card.picks_odds', {
          n: String(selections.length),
          odds: Number(totalOdds).toFixed(2),
        })}
      </p>
      <ul className="mt-2 space-y-1">
        {selections.slice(0, 3).map((s, i) => (
          <li key={i} className="flex justify-between gap-2 text-[11px] min-w-0">
            <span className="truncate text-[var(--text)] font-medium min-w-0">{s.matchDescription}</span>
            <span className="shrink-0 text-[var(--text-muted)] tabular-nums">
              {formatFootballOutcomeLabel(s.prediction)} @{s.odds.toFixed(2)}
            </span>
          </li>
        ))}
        {selections.length > 3 ? (
          <li className="text-[10px] text-[var(--text-muted)] italic">
            {t('pick_card.more_picks', { n: String(selections.length - 3) })}
          </li>
        ) : null}
      </ul>
      {isFree ? (
        <p className="mt-2 text-[10px] text-[var(--text-muted)] leading-snug">{t('create_pick.preview_free_note')}</p>
      ) : (
        <p className="mt-2 text-[10px] text-[var(--text-muted)] leading-snug">{t('create_pick.preview_paid_note')}</p>
      )}
    </div>
  );
}
