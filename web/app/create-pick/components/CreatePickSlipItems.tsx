'use client';

import { formatFootballOutcomeLabel } from '@betrollover/shared-types';
import type { SlipSelection } from '@/context/SlipCartContext';

export function CreatePickSlipItems({
  selections,
  onRemove,
  variant = 'desktop',
}: {
  selections: SlipSelection[];
  onRemove: (idx: number) => void;
  variant?: 'desktop' | 'sheet';
}) {
  const sheet = variant === 'sheet';
  return (
    <div className={sheet ? 'space-y-2 max-h-[180px] overflow-y-auto' : 'space-y-2 max-h-[300px] overflow-y-auto pr-2'}>
      {selections.map((s, i) => (
        <div
          key={i}
          className={
            sheet
              ? 'bg-[var(--fill-secondary)] rounded-[var(--radius)] p-4 border border-[var(--separator)]'
              : 'bg-[var(--bg)] rounded-[var(--radius-sm)] p-3 border border-[var(--separator)] hover:border-[var(--primary)]/40 transition-colors'
          }
        >
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className={`${sheet ? 'text-sm' : 'text-xs'} font-semibold text-[var(--text)] truncate min-w-0`}>
                {s.matchDescription}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 break-words">{formatFootballOutcomeLabel(s.prediction)}</p>
              <p
                className={`${sheet ? 'text-base mt-2' : 'text-sm mt-1'} font-bold text-[var(--primary)] tabular-nums`}
              >
                @ {s.odds.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className={
                sheet
                  ? 'touch-target shrink-0 inline-flex items-center justify-center rounded-lg text-[var(--destructive)] hover:bg-[var(--destructive-light)] transition-colors'
                  : 'shrink-0 text-[var(--destructive)] hover:opacity-80 transition-colors p-1'
              }
              title="Remove"
              aria-label="Remove selection"
            >
              {sheet ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
