'use client';

import { TeamBadge } from '@/components/TeamBadge';
import { LeagueInsightsPanel } from '@/components/LeagueInsightsPanel';
import type { Fixture, FixtureOdd } from '../types';
import { groupOddsByMarket, MARKET_ORDER, filterCorrectScoreOdds } from '../odds-utils';
import { formatMarketValue, formatFixtureDateTime } from '../utils/format';
import { Button } from '@/components/ui/Button';
import { useT } from '@/context/LanguageContext';

interface FootballFixtureCardProps {
  fixture: Fixture;
  isLoadingOdds: boolean;
  isCollapsed: boolean;
  /** When false, hides the league table/scorers accordion (e.g. duplicate league already shown on an earlier card). Default true. */
  showLeagueInsights?: boolean;
  onLoadOdds: (fixture: Fixture) => void;
  onToggleCollapsed: (fixtureId: number) => void;
  onAddSelection: (fixture: Fixture, odd: FixtureOdd) => void;
}

export function FootballFixtureCard({
  fixture,
  isLoadingOdds,
  isCollapsed,
  showLeagueInsights = true,
  onLoadOdds,
  onToggleCollapsed,
  onAddSelection,
}: FootballFixtureCardProps) {
  const t = useT();
  const groupedOdds = fixture.odds ? groupOddsByMarket(fixture.odds) : {};
  const hasOdds = fixture.odds && fixture.odds.length > 0;
  const showOdds = hasOdds && !isCollapsed;

  const toggleCollapsed = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCollapsed(fixture.id);
  };

  return (
    <div className="bg-[var(--card)] rounded-card shadow-card border border-[var(--border)] overflow-hidden transition-shadow hover:shadow-card-hover w-full min-w-0 max-w-full">
      <div className="p-4 cursor-pointer min-w-0" onClick={() => !hasOdds && onLoadOdds(fixture)}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-[var(--text)] text-base flex items-center gap-2 flex-wrap min-w-0 break-words">
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
            <div className="text-xs text-[var(--text-muted)] mt-1 break-words">
              {fixture.leagueName || 'League'} • {formatFixtureDateTime(fixture.matchDate)}
            </div>
          </div>
          {!hasOdds && !fixture.oddsError && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onLoadOdds(fixture);
              }}
              disabled={isLoadingOdds}
            >
              {isLoadingOdds ? 'Loading...' : 'Load Odds'}
            </Button>
          )}
          {hasOdds && !fixture.oddsError && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={toggleCollapsed}
            >
              {isCollapsed ? t('create_pick.show_odds') : t('create_pick.hide_odds')}
            </Button>
          )}
          {fixture.oddsError && (
            <div className="min-w-0 max-w-full sm:max-w-xs px-3 py-1.5 text-xs text-[var(--accent)] bg-[var(--accent-light)] rounded-lg break-words">
              {fixture.oddsError}
            </div>
          )}
        </div>
      </div>

      {showLeagueInsights && fixture.league?.apiId != null && (
        <div className="px-4 pb-3 border-t border-[var(--border)]">
          <LeagueInsightsPanel
            leagueApiId={fixture.league.apiId}
            season={fixture.league.season ?? null}
            subtitle={fixture.leagueName || fixture.league.name}
          />
        </div>
      )}

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
                      type="button"
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
