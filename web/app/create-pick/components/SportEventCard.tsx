'use client';

import { useMemo } from 'react';
import { TeamBadge } from '@/components/TeamBadge';
import type { SportEventItem, FixtureOdd } from '../types';
import type { NonFootballSport } from '../types';
import { groupOddsByMarket, orderedMarketNames } from '../odds-utils';
import { formatFixtureDateTime } from '../utils/format';
import { OddsMarketAccordion } from './OddsMarketAccordion';

interface SportEventCardProps {
  event: SportEventItem;
  marketOrder: string[];
  sport: NonFootballSport;
  onAddSelection: (event: SportEventItem, odd: FixtureOdd, sport: NonFootballSport) => void;
  leagueLabel?: string;
}

export function SportEventCard({
  event,
  marketOrder,
  sport,
  onAddSelection,
  leagueLabel = 'League',
}: SportEventCardProps) {
  const odds = event.odds ?? [];
  const grouped = useMemo(() => groupOddsByMarket(odds), [odds]);
  const marketNames = useMemo(
    () =>
      orderedMarketNames(grouped, {
        preferredOrder: marketOrder,
        isSupported: () => true,
      }),
    [grouped, marketOrder],
  );

  return (
    <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] overflow-hidden w-full min-w-0 max-w-full">
      <div className="p-3 sm:p-4 min-w-0">
        <div className="font-semibold text-[var(--text)] text-[15px] sm:text-base flex items-center gap-2 flex-wrap min-w-0 break-words">
          <span className="flex items-center gap-1.5">
            <TeamBadge logo={event.homeTeamLogo} countryCode={event.homeCountryCode} name={event.homeTeam} size={20} />
            {event.homeTeam}
          </span>
          <span className="text-[var(--text-muted)]">vs</span>
          <span className="flex items-center gap-1.5">
            <TeamBadge logo={event.awayTeamLogo} countryCode={event.awayCountryCode} name={event.awayTeam} size={20} />
            {event.awayTeam}
          </span>
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1 break-words min-w-0">
          {event.leagueName || leagueLabel} • {formatFixtureDateTime(event.eventDate)}
        </div>
      </div>
      {odds.length > 0 ? (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-[var(--border)]">
          <OddsMarketAccordion
            marketNames={marketNames}
            groupedOdds={grouped}
            onSelect={(odd) => onAddSelection(event, odd, sport)}
          />
        </div>
      ) : (
        <div className="px-3 sm:px-4 pb-4 pt-0 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
          Odds not yet available
        </div>
      )}
    </div>
  );
}
