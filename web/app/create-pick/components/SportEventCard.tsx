'use client';

import { TeamBadge } from '@/components/TeamBadge';
import type { SportEventItem, FixtureOdd } from '../types';
import type { NonFootballSport } from '../types';
import { groupOddsByMarket } from '../odds-utils';
import { formatFixtureDateTime } from '../utils/format';

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
  const grouped = groupOddsByMarket(odds);

  return (
    <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] overflow-hidden">
      <div className="p-4">
        <div className="font-semibold text-[var(--text)] flex items-center gap-2 flex-wrap">
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
        <div className="text-xs text-[var(--text-muted)] mt-1">
          {event.leagueName || leagueLabel} • {formatFixtureDateTime(event.eventDate)}
        </div>
      </div>
      {odds.length > 0 ? (
        <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
          {([...marketOrder.filter((m) => grouped[m]), ...Object.keys(grouped).filter((m) => !marketOrder.includes(m))]).map(
            (marketName) => (
              <div key={marketName} className="mt-3">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
                  {marketName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(grouped[marketName] || []).map((odd) => (
                    <button
                      key={odd.id}
                      onClick={() => onAddSelection(event, odd, sport)}
                      className="px-3 py-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium text-sm transition-colors border border-[var(--border)] active:scale-95"
                    >
                      <span className="font-semibold">{odd.marketValue}</span>
                      <span className="ml-1.5 text-[var(--primary)]">{Number(odd.odds).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="px-4 pb-4 pt-0 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
          Odds not yet available
        </div>
      )}
    </div>
  );
}
