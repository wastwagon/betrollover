'use client';

import { useT } from '@/context/LanguageContext';

export type TipsterReviewSnippet = {
  id: number;
  rating: number;
  comment: string | null;
  reviewer?: { displayName?: string | null } | null;
};

type TipsterTrustStripProps = {
  settledCount: number;
  avgOdds?: number | null;
  avgRating?: number | null;
  reviewCount?: number | null;
  reviews?: TipsterReviewSnippet[];
  compact?: boolean;
  className?: string;
};

function Stars({ avg }: { avg: number }) {
  const rounded = Math.round(avg);
  return (
    <span className="flex" aria-hidden>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-sm ${s <= rounded ? 'text-amber-400' : 'text-[var(--separator)]'}`}>
          ★
        </span>
      ))}
    </span>
  );
}

/** Settled sample size + ratings — Tipstrr-style trust near tipster numbers. */
export function TipsterTrustStrip({
  settledCount,
  avgOdds,
  avgRating,
  reviewCount,
  reviews = [],
  compact = false,
  className = '',
}: TipsterTrustStripProps) {
  const t = useT();
  const hasRating = avgRating != null && (reviewCount ?? 0) > 0;
  const snippets = reviews.filter((r) => r.comment?.trim()).slice(0, compact ? 1 : 3);

  if (settledCount <= 0 && !hasRating && snippets.length === 0 && !(avgOdds && avgOdds > 0)) {
    return null;
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {settledCount > 0 ? (
          <span className="inline-flex items-center rounded-md bg-[var(--fill-secondary)] px-2 py-1 font-semibold text-[var(--text)] tabular-nums">
            {t('tipster.settled', { n: String(settledCount) })}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md bg-[var(--fill-secondary)] px-2 py-1 font-medium text-[var(--text-muted)]">
            {t('tipster.stats_update')}
          </span>
        )}
        {avgOdds != null && avgOdds > 0 ? (
          <span className="text-[var(--text-muted)] tabular-nums">
            {t('tipster.avg_odds')} {Number(avgOdds).toFixed(2)}
          </span>
        ) : null}
        {hasRating ? (
          <span className="inline-flex items-center gap-1.5 text-[var(--text)]">
            <Stars avg={avgRating!} />
            <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {Number(avgRating).toFixed(1)}
            </span>
            <span className="text-[var(--text-muted)]">
              ({reviewCount} {(reviewCount ?? 0) !== 1 ? t('tipster.reviews') : t('tipster.review')})
            </span>
          </span>
        ) : null}
      </div>

      {!compact && snippets.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {snippets.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-[var(--separator)] bg-[var(--card)] px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Stars avg={r.rating} />
                {r.reviewer?.displayName ? (
                  <span className="text-[11px] font-medium text-[var(--text-muted)] truncate">
                    {r.reviewer.displayName}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[var(--text)] leading-relaxed line-clamp-3">{r.comment}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
