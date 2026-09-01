'use client';

import { useT } from '@/context/LanguageContext';
import { isFootballOnlyDiscovery } from '@/lib/football-only-discovery';
import type { CreatePickSport } from '../types';

export function CreatePickSportChips({
  sport,
  onSport,
}: {
  sport: CreatePickSport;
  onSport: (sport: CreatePickSport) => void;
}) {
  const t = useT();
  const options: { key: CreatePickSport; label: string }[] = isFootballOnlyDiscovery()
    ? [{ key: 'football', label: t('create_pick.sport_football') }]
    : [
        { key: 'football', label: t('create_pick.sport_football') },
        { key: 'basketball', label: t('create_pick.sport_basketball') },
        { key: 'rugby', label: t('create_pick.sport_rugby') },
        { key: 'mma', label: t('create_pick.sport_mma') },
        { key: 'volleyball', label: t('create_pick.sport_volleyball') },
        { key: 'hockey', label: t('create_pick.sport_hockey') },
        { key: 'american_football', label: t('create_pick.sport_american_football') },
        { key: 'tennis', label: t('create_pick.sport_tennis') },
      ];

  return (
    <section
      id="create-pick-sport"
      className="mb-6 w-full min-w-0 scroll-mt-[calc(var(--br-chrome-below-header)+3.5rem)]"
      aria-labelledby="create-pick-sport-heading"
    >
      <p
        id="create-pick-sport-heading"
        className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-2 px-0.5"
      >
        1 · Sport
      </p>
      <div className="w-full min-w-0 overflow-hidden">
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide touch-pan-x [-webkit-overflow-scrolling:touch]">
          {options.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSport(key)}
              className={`shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                sport === key
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
