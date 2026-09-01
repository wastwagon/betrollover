'use client';

import { Input, Field, fieldControlClassName } from '@/components/ui/Input';
import { buttonClassName } from '@/components/ui/button-styles';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useT } from '@/context/LanguageContext';
import type { TranslationKey } from '@/lib/translations/en';
import type { CreatePickSport, FilterOptions, Fixture, FixtureOdd, NonFootballSport, SportEventItem } from '../types';
import { SPORT_MARKET_ORDERS } from '../sport-markets';
import { FootballFixtureCard } from './FootballFixtureCard';
import { SportEventCard } from './SportEventCard';
import { SportEmptyState } from './SportEmptyState';
import { SportLoadingSpinner } from './SportLoadingSpinner';

type CountKind = 'fixtures' | 'games' | 'matches' | 'fights';

type TFn = (key: TranslationKey, vars?: Record<string, string>) => string;

function availableCountLabel(n: number, kind: CountKind, t: TFn): string {
  const keys: Record<CountKind, [TranslationKey, TranslationKey]> = {
    fixtures: ['create_pick.available_fixtures_one', 'create_pick.available_fixtures_other'],
    games: ['create_pick.available_games_one', 'create_pick.available_games_other'],
    matches: ['create_pick.available_matches_one', 'create_pick.available_matches_other'],
    fights: ['create_pick.available_fights_one', 'create_pick.available_fights_other'],
  };
  const [oneKey, otherKey] = keys[kind];
  return n === 1 ? t(oneKey) : t(otherKey, { n: String(n) });
}

function BoldLeadingCount({ text }: { text: string }) {
  const m = text.match(/^(\d+)/);
  if (!m) return <>{text}</>;
  return (
    <>
      <strong>{m[1]}</strong>
      {text.slice(m[0].length)}
    </>
  );
}

export type NonFootballBoard = {
  available: SportEventItem[];
  all: SportEventItem[];
  loading: boolean;
};

const NON_FOOTBALL_META: Record<
  NonFootballSport,
  {
    countKind: CountKind;
    loadingKey: TranslationKey;
    emptyNoOddsTitle: TranslationKey;
    emptyNoOddsHint: TranslationKey;
    emptyFilteredTitle: TranslationKey;
    emptyFilteredHint: TranslationKey;
    leagueLabel?: string;
  }
> = {
  basketball: {
    countKind: 'games',
    loadingKey: 'create_pick.loading_basketball_games',
    emptyNoOddsTitle: 'create_pick.empty_basketball_no_odds_title',
    emptyNoOddsHint: 'create_pick.empty_basketball_no_odds_hint',
    emptyFilteredTitle: 'create_pick.empty_filtered_games',
    emptyFilteredHint: 'create_pick.empty_filtered_hint',
  },
  rugby: {
    countKind: 'matches',
    loadingKey: 'create_pick.loading_rugby_matches',
    emptyNoOddsTitle: 'create_pick.empty_rugby_no_odds_title',
    emptyNoOddsHint: 'create_pick.empty_rugby_no_odds_hint',
    emptyFilteredTitle: 'create_pick.empty_filtered_matches',
    emptyFilteredHint: 'create_pick.empty_filtered_hint',
  },
  mma: {
    countKind: 'fights',
    loadingKey: 'create_pick.loading_mma_fights',
    emptyNoOddsTitle: 'create_pick.empty_mma_no_odds_title',
    emptyNoOddsHint: 'create_pick.empty_mma_no_odds_hint',
    emptyFilteredTitle: 'create_pick.empty_filtered_fights',
    emptyFilteredHint: 'create_pick.empty_filtered_hint',
    leagueLabel: 'Event',
  },
  volleyball: {
    countKind: 'matches',
    loadingKey: 'create_pick.loading_volleyball_matches',
    emptyNoOddsTitle: 'create_pick.empty_volleyball_no_odds_title',
    emptyNoOddsHint: 'create_pick.empty_volleyball_no_odds_hint',
    emptyFilteredTitle: 'create_pick.empty_filtered_matches',
    emptyFilteredHint: 'create_pick.empty_filtered_hint',
  },
  hockey: {
    countKind: 'games',
    loadingKey: 'create_pick.loading_hockey_games',
    emptyNoOddsTitle: 'create_pick.empty_hockey_no_odds_title',
    emptyNoOddsHint: 'create_pick.empty_hockey_no_odds_hint',
    emptyFilteredTitle: 'create_pick.empty_filtered_games',
    emptyFilteredHint: 'create_pick.empty_filtered_hint',
  },
  american_football: {
    countKind: 'games',
    loadingKey: 'create_pick.loading_american_football_games',
    emptyNoOddsTitle: 'create_pick.empty_american_football_no_odds_title',
    emptyNoOddsHint: 'create_pick.empty_american_football_no_odds_hint',
    emptyFilteredTitle: 'create_pick.empty_filtered_games',
    emptyFilteredHint: 'create_pick.empty_filtered_hint',
  },
  tennis: {
    countKind: 'matches',
    loadingKey: 'create_pick.loading_tennis_matches',
    emptyNoOddsTitle: 'create_pick.empty_tennis_no_odds_title',
    emptyNoOddsHint: 'create_pick.empty_tennis_no_odds_hint',
    emptyFilteredTitle: 'create_pick.empty_filtered_matches',
    emptyFilteredHint: 'create_pick.empty_filtered_hint',
    leagueLabel: 'Tournament',
  },
};

function searchPlaceholder(sport: CreatePickSport, t: TFn): string {
  if (sport === 'football') return t('create_pick.search_football');
  if (sport === 'tennis') return t('create_pick.search_tennis');
  if (sport === 'mma') return t('create_pick.search_mma');
  return t('create_pick.search_team');
}

export function CreatePickSelectPanel({
  sport,
  teamSearch,
  onTeamSearch,
  searchApplied,
  selectedCountry,
  onCountry,
  selectedLeague,
  onLeague,
  sportLeague,
  onSportLeague,
  onClearFootballFilters,
  onClearSportFilters,
  countries,
  competitionOptions,
  uniqueSportLeagues,
  footballLoading,
  fixtureError,
  onRetryFixtures,
  availableFixtures,
  fixtures,
  firstFixtureIdPerLeagueApi,
  loadingOdds,
  collapsedOdds,
  onLoadOdds,
  onToggleCollapsed,
  onAddFootball,
  boards,
  onAddSportEvent,
}: {
  sport: CreatePickSport;
  teamSearch: string;
  onTeamSearch: (v: string) => void;
  searchApplied: string;
  selectedCountry: string;
  onCountry: (v: string) => void;
  selectedLeague: string;
  onLeague: (v: string) => void;
  sportLeague: string;
  onSportLeague: (v: string) => void;
  onClearFootballFilters: () => void;
  onClearSportFilters: () => void;
  countries: string[];
  competitionOptions: FilterOptions['leagues'];
  uniqueSportLeagues: string[];
  footballLoading: boolean;
  fixtureError: string | null;
  onRetryFixtures: () => void;
  availableFixtures: Fixture[];
  fixtures: Fixture[];
  firstFixtureIdPerLeagueApi: Map<number, number>;
  loadingOdds: Set<number>;
  collapsedOdds: Set<number>;
  onLoadOdds: (f: Fixture) => void;
  onToggleCollapsed: (id: number) => void;
  onAddFootball: (f: Fixture, odd: FixtureOdd) => void;
  boards: Record<NonFootballSport, NonFootballBoard>;
  onAddSportEvent: (e: SportEventItem, odd: FixtureOdd, eventSport: NonFootballSport) => void;
}) {
  const t = useT();
  const footballFiltered = Boolean(selectedCountry || selectedLeague || searchApplied);
  const sportFiltered = Boolean(sportLeague || teamSearch);
  const activeBoard = sport === 'football' ? null : boards[sport];
  const activeMeta = sport === 'football' ? null : NON_FOOTBALL_META[sport];
  const availableCount =
    sport === 'football'
      ? availableFixtures.length
      : activeBoard?.available.length ?? 0;
  const countKind: CountKind = sport === 'football' ? 'fixtures' : (activeMeta?.countKind ?? 'matches');

  return (
    <div id="create-pick-select" className="flex-1 min-w-0 scroll-mt-[calc(var(--br-chrome-below-header)+3.5rem)]">
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-3 px-0.5">
        2 · Select
      </p>
      <div className="space-y-4">
        <div className="mb-4 min-w-0">
          <div className="relative min-w-0">
            <Input
              id="create-pick-search"
              type="text"
              placeholder={searchPlaceholder(sport, t)}
              value={teamSearch}
              onChange={(e) => onTeamSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {teamSearch ? (
              <button
                type="button"
                onClick={() => onTeamSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                title={t('create_pick.clear_search_title')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 min-w-0 w-full">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[var(--text-muted)] text-sm">
              {sport === 'football' ? t('create_pick.click_hint') : t('create_pick.click_hint_other')}
            </p>
            <p className="text-[var(--text)] text-sm font-medium">
              <BoldLeadingCount text={availableCountLabel(availableCount, countKind, t)} />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0 w-full">
            {sport === 'football' ? (
              <>
                <div className="flex min-w-0 max-w-full flex-1 basis-full items-center gap-2 sm:basis-auto sm:flex-initial">
                  <Field label={t('create_pick.country')} htmlFor="create-pick-country">
                    <select
                      id="create-pick-country"
                      value={selectedCountry}
                      onChange={(e) => onCountry(e.target.value)}
                      className={fieldControlClassName(undefined, 'sm:min-w-[140px]')}
                    >
                      <option value="">{t('create_pick.all_countries')}</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country === 'World' ? t('live_scores.world_international') : country}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {competitionOptions.length > 0 ? (
                  <div className="flex min-w-0 max-w-full flex-1 basis-full items-center gap-2 sm:basis-auto sm:flex-initial">
                    <Field label={t('create_pick.competition')} htmlFor="create-pick-competition">
                      <select
                        id="create-pick-competition"
                        value={competitionOptions.some((l) => String(l.id) === selectedLeague) ? selectedLeague : ''}
                        onChange={(e) => onLeague(e.target.value)}
                        className={fieldControlClassName(undefined, 'sm:min-w-[200px]')}
                        title={
                          selectedCountry
                            ? selectedCountry === 'World'
                              ? t('create_pick.international_only')
                              : t('create_pick.leagues_in', { country: selectedCountry })
                            : t('create_pick.filter_by_league')
                        }
                      >
                        <option value="">{t('create_pick.all_competitions')}</option>
                        {competitionOptions.map((l) => (
                          <option key={l.id} value={String(l.id)}>
                            {l.country ? `${l.name} (${l.country})` : l.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                ) : null}
                {footballFiltered ? (
                  <button
                    type="button"
                    onClick={onClearFootballFilters}
                    title={t('create_pick.clear_all_filters_title')}
                    className={buttonClassName({ variant: 'secondary', size: 'sm' })}
                  >
                    {t('create_pick.clear_filters')}
                  </button>
                ) : null}
              </>
            ) : null}

            {sport !== 'football' && uniqueSportLeagues.length > 0 ? (
              <div className="flex min-w-0 max-w-full flex-1 basis-full items-center gap-2 sm:basis-auto sm:flex-initial">
                <Field label={t('create_pick.competition')} htmlFor="create-pick-sport-league">
                  <select
                    id="create-pick-sport-league"
                    value={sportLeague}
                    onChange={(e) => onSportLeague(e.target.value)}
                    className={fieldControlClassName(undefined, 'sm:min-w-[200px]')}
                  >
                    <option value="">{t('create_pick.all_competitions')}</option>
                    {uniqueSportLeagues.map((league) => (
                      <option key={league} value={league}>
                        {league}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}
            {sport !== 'football' && sportFiltered ? (
              <button
                type="button"
                onClick={onClearSportFilters}
                title={t('create_pick.clear_all_filters_title')}
                className={buttonClassName({ variant: 'secondary', size: 'sm' })}
              >
                {t('create_pick.clear_filters')}
              </button>
            ) : null}
          </div>
        </div>

        {footballLoading && sport === 'football' ? <LoadingSkeleton count={4} /> : null}

        {sport !== 'football' && activeBoard && activeMeta ? (
          <>
            {activeBoard.loading ? <SportLoadingSpinner label={t(activeMeta.loadingKey)} /> : null}
            {!activeBoard.loading && activeBoard.available.length === 0 ? (
              activeBoard.all.filter((e) => e.odds && e.odds.length > 0).length === 0 ? (
                <SportEmptyState label={t(activeMeta.emptyNoOddsTitle)} hint={t(activeMeta.emptyNoOddsHint)} />
              ) : (
                <SportEmptyState label={t(activeMeta.emptyFilteredTitle)} hint={t(activeMeta.emptyFilteredHint)} />
              )
            ) : null}
          </>
        ) : null}

        {fixtureError ? (
          <div className="rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive-light)] p-4 mb-4">
            <h4 className="font-semibold text-[var(--destructive)] mb-1">{t('create_pick.fixture_load_error_title')}</h4>
            <p className="text-sm text-[var(--text)]">{fixtureError}</p>
            <p className="text-xs text-[var(--text-muted)] mt-2">{t('create_pick.fixture_load_error_hint')}</p>
            <button
              type="button"
              onClick={onRetryFixtures}
              className="mt-2 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {t('error.try_again')}
            </button>
          </div>
        ) : null}

        {!footballLoading && !fixtureError && sport === 'football' && availableFixtures.length === 0 && fixtures.length === 0 ? (
          <div className="bg-[var(--card)] rounded-card border border-[var(--border)] p-6">
            <EmptyState
              title={footballFiltered ? t('create_pick.no_fixtures_filtered') : t('create_pick.no_fixtures')}
              description={
                footballFiltered ? t('create_pick.fixtures_sync_filtered') : t('create_pick.fixtures_sync')
              }
              actionLabel={footballFiltered ? t('create_pick.clear_filters') : t('create_pick.go_dashboard')}
              actionHref="/dashboard/sell"
              onActionClick={footballFiltered ? onClearFootballFilters : undefined}
            />
          </div>
        ) : null}

        {!footballLoading && !fixtureError && sport === 'football' && availableFixtures.length === 0 && fixtures.length > 0 ? (
          <div className="bg-[var(--card)] rounded-card border border-[var(--border)] p-6">
            <EmptyState
              title={t('create_pick.all_started_title')}
              description={t('create_pick.all_started_desc')}
              actionLabel=""
            />
          </div>
        ) : null}

        {!footballLoading && sport === 'football' && availableFixtures.length > 0 ? (
          <div className="space-y-4">
            {availableFixtures.map((f) => (
              <FootballFixtureCard
                key={f.id}
                fixture={f}
                isLoadingOdds={loadingOdds.has(f.id)}
                isCollapsed={collapsedOdds.has(f.id)}
                showLeagueInsights={f.league?.apiId == null || firstFixtureIdPerLeagueApi.get(f.league.apiId) === f.id}
                onLoadOdds={onLoadOdds}
                onToggleCollapsed={onToggleCollapsed}
                onAddSelection={onAddFootball}
              />
            ))}
          </div>
        ) : null}

        {sport !== 'football' && activeBoard && activeBoard.available.length > 0 ? (
          <div className="space-y-4">
            {activeBoard.available.map((e) => (
              <SportEventCard
                key={e.id}
                event={e}
                marketOrder={SPORT_MARKET_ORDERS[sport]}
                sport={sport}
                onAddSelection={onAddSportEvent}
                leagueLabel={activeMeta?.leagueLabel}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
