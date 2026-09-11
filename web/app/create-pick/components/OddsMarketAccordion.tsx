'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { FixtureOdd } from '../types';
import { filterCorrectScoreOdds } from '../odds-utils';
import { useT } from '@/context/LanguageContext';

export type OddsMarketAccordionProps = {
  marketNames: string[];
  groupedOdds: Record<string, FixtureOdd[]>;
  /** Format the selection label (football uses formatMarketValue; sports can pass identity). */
  formatValue?: (odd: FixtureOdd) => string;
  onSelect: (odd: FixtureOdd) => void;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 ease-out ${
        open ? 'rotate-180 text-[var(--primary)]' : ''
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Mobile-first exclusive accordion: exactly one market open at a time.
 * Compact header rows; options appear only in the active panel.
 */
export function OddsMarketAccordion({
  marketNames,
  groupedOdds,
  formatValue = (odd) => odd.marketValue,
  onSelect,
}: OddsMarketAccordionProps) {
  const t = useT();
  const baseId = useId();

  const panels = useMemo(() => {
    const out: { name: string; odds: FixtureOdd[] }[] = [];
    for (const name of marketNames) {
      let odds = groupedOdds[name] || [];
      if (name === 'Correct Score') {
        odds = filterCorrectScoreOdds(odds);
      }
      if (odds.length === 0) continue;
      out.push({ name, odds });
    }
    return out;
  }, [marketNames, groupedOdds]);

  const panelKey = useMemo(() => panels.map((p) => p.name).join('\0'), [panels]);
  const [activeMarket, setActiveMarket] = useState<string | null>(null);

  // Keep exactly one valid active panel when odds reload / markets change
  useEffect(() => {
    if (panels.length === 0) {
      setActiveMarket(null);
      return;
    }
    setActiveMarket((prev) => {
      if (prev && panels.some((p) => p.name === prev)) return prev;
      return panels[0].name;
    });
  }, [panelKey, panels]);

  if (panels.length === 0) return null;

  const openMarket = (name: string) => {
    // Exclusive accordion: one open at a time; re-tap keeps current open
    setActiveMarket(name);
  };

  return (
    <div className="mt-3 flex flex-col gap-1.5" role="list">
      {panels.map((panel, index) => {
        const open = activeMarket === panel.name;
        const headerId = `${baseId}-h-${index}`;
        const panelId = `${baseId}-p-${index}`;

        return (
          <div
            key={panel.name}
            role="listitem"
            className={`rounded-[var(--radius-sm)] border overflow-hidden transition-[border-color,box-shadow,background-color] duration-200 ${
              open
                ? 'border-[var(--primary)]/35 bg-[var(--card)] shadow-sm ring-1 ring-[var(--primary)]/15'
                : 'border-[var(--border)] bg-[var(--bg)]/40'
            }`}
          >
            <button
              type="button"
              id={headerId}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => openMarket(panel.name)}
              className="flex w-full min-h-11 items-center gap-2 px-3 py-2.5 text-left touch-manipulation active:bg-[var(--fill-secondary)]/60"
            >
              <span
                className={`h-8 w-0.5 shrink-0 rounded-full transition-colors ${
                  open ? 'bg-[var(--primary)]' : 'bg-transparent'
                }`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[13px] font-semibold leading-tight tracking-tight ${
                    open ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {panel.name}
                </span>
                <span className="mt-0.5 block text-[11px] tabular-nums text-[var(--text-tertiary)]">
                  {t('create_pick.market_option_count', { n: String(panel.odds.length) })}
                  {open ? ` · ${t('create_pick.market_tap_select')}` : ''}
                </span>
              </span>
              <Chevron open={open} />
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!open}
              className={
                open
                  ? 'grid grid-cols-2 gap-1.5 border-t border-[var(--border)]/80 bg-[var(--card)] px-2.5 py-2.5 sm:grid-cols-3'
                  : undefined
              }
            >
              {open
                ? panel.odds.map((odd) => (
                    <button
                      type="button"
                      key={odd.id}
                      onClick={() => onSelect(odd)}
                      className="flex min-h-11 flex-col items-stretch justify-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-left transition-colors touch-manipulation hover:border-[var(--primary)] hover:bg-[var(--primary-light)] active:scale-[0.98]"
                    >
                      <span className="text-[12px] font-semibold leading-snug text-[var(--text)] line-clamp-2">
                        {formatValue(odd)}
                      </span>
                      <span className="text-[13px] font-bold tabular-nums text-[var(--primary)]">
                        {Number(odd.odds).toFixed(2)}
                      </span>
                    </button>
                  ))
                : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
