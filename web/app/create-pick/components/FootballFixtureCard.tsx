'use client';

import { TeamBadge } from '@/components/TeamBadge';
import type { Fixture, FixtureOdd } from '../types';
import { groupOddsByMarket, MARKET_ORDER, filterCorrectScoreOdds } from '../odds-utils';
import { formatMarketValue, formatFixtureDateTime } from '../utils/format';

interface FootballFixtureCardProps {
  fixture: Fixture;
  isLoadingOdds: boolean;
  isCollapsed: boolean;
  onLoadOdds: (fixture: Fixture) => void;
  onToggleCollapsed: (fixtureId: number) => void;
  onAddSelection: (fixture: Fixture, odd: FixtureOdd) => void;
}

export function FootballFixtureCard({
  fixture,
  isLoadingOdds,
  isCollapsed,
  onLoadOdds,
  onToggleCollapsed,
  onAddSelection,
}: FootballFixtureCardProps) {
  const groupedOdds = fixture.odds ? groupOddsByMarket(fixture.odds) : {};
  const hasOdds = fixture.odds && fixture.odds.length > 0;
  const showOdds = hasOdds && !isCollapsed;

  const toggleCollapsed = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCollapsed(fixture.id);
  };

  return (
    <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] overflow-hidden transition-shadow hover:shadow-card-hover">
      <div className="p-4 cursor-pointer" onClick={() => !hasOdds && onLoadOdds(fixture)}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <span className="font-semibold text-[var(--text)] text-base flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5">
                <TeamBadge
                  logo={fixture.homeTeamLogo}
                  countryCode={fixture.homeCountryCode}
                  name={fixture.homeTeamName}
                  size={20}
                />
                {fixture.homeTeamName}
              </span>
              <span className="text-[var(--text-muted)]">vs</span>
              <span className="flex items-center gap-1.5">
                <TeamBadge
                  logo={fixture.awayTeamLogo}
                  countryCode={fixture.awayCountryCode}
                  name={fixture.awayTeamName}
                  size={20}
                />
                {fixture.awayTeamName}
              </span>
            </span>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {fixture.leagueName || 'League'} • {formatFixtureDateTime(fixture.matchDate)}
            </div>
          </div>
          {!hasOdds && !fixture.oddsError && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLoadOdds(fixture);
              }}
              disabled={isLoadingOdds}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors disabled:opacity-50"
            >
              {isLoadingOdds ? 'Loading...' : 'Load Odds'}
            </button>
          )}
          {hasOdds && !fixture.oddsError && (
            <button
              onClick={toggleCollapsed}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors"
            >
              {isCollapsed ? 'Show Odds' : 'Hide Odds'}
            </button>
          )}
          {fixture.oddsError && (
            <div className="px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg max-w-xs">
              {fixture.oddsError}
            </div>
          )}
        </div>
      </div>

      {showOdds && (
        <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
          {MARKET_ORDER.filter((market) => groupedOdds[market]).map((marketName) => {
            let marketOdds = groupedOdds[marketName];
            if (marketName === 'Correct Score') {
              marketOdds = filterCorrectScoreOdds(marketOdds);
              if (marketOdds.length === 0) return null;
            }
            return (
              <div key={marketName} className="mt-3 first:mt-3">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
                  {marketName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {marketOdds.map((odd) => (
                    <button
                      key={odd.id}
                      onClick={() => onAddSelection(fixture, odd)}
                      className="px-3 py-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] font-medium text-sm transition-colors border border-[var(--border)] active:scale-95"
                    >
                      <span className="font-semibold">{formatMarketValue(odd.marketName, odd.marketValue)}</span>
                      <span className="ml-1.5 text-[var(--primary)]">{Number(odd.odds).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
