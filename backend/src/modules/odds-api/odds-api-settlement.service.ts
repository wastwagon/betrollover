import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { OddsApiService, SPORT_ODDS_PREFIXES, oddsIdToNumber } from './odds-api.service';
import { SettlementService } from '../accumulators/settlement.service';
import { isSportEnabled } from '../../config/sports.config';

/**
 * Fetches completed match scores from The Odds API and updates sport_events,
 * then runs settlement so Odds API sports auto-settle without relying on FixtureScheduler.
 *
 * Cron: every 2 hours (respects ENABLE_SCHEDULING).
 * Cost: ~1 credit per active competition per run (shared with odds sync credits).
 */
@Injectable()
export class OddsApiSettlementService {
  private readonly logger = new Logger(OddsApiSettlementService.name);

  /** Sports we auto-settle via The Odds API scores endpoint */
  private readonly COVERED_SPORTS = [
    'basketball',
    'rugby',
    'mma',
    'hockey',
    'american_football',
    'tennis',
  ] as const;

  constructor(
    @InjectRepository(SportEvent)
    private sportEventRepo: Repository<SportEvent>,
    private oddsApi: OddsApiService,
    private settlementService: SettlementService,
    private configService: ConfigService,
  ) {}

  /**
   * Fetch completed scores from The Odds API and mark matching sport_events as finished (FT).
   * Returns the number of events updated.
   * Matches by: (sport, apiId) → raw_json->>'id' → (sport, homeTeam, awayTeam, eventDate).
   */
  async syncResults(): Promise<{ updated: number }> {
    let updated = 0;
    const key = this.oddsApi.getApiKey();
    if (!key) {
      this.logger.warn('ODDS_API_KEY not set — skipping Odds API results sync');
      return { updated };
    }

    for (const sport of this.COVERED_SPORTS) {
      if (!isSportEnabled(sport)) continue;

      const prefixes = SPORT_ODDS_PREFIXES[sport] ?? [];
      if (!prefixes.length) continue;

      const sportKeys = await this.oddsApi.getActiveSportKeys(prefixes);
      if (!sportKeys.length) {
        this.logger.debug(`OddsApi sync: no active keys for ${sport}`);
        continue;
      }

      for (const sportKey of sportKeys) {
        const scores = await this.oddsApi.getScores(sportKey, 3);
        const completed = scores.filter((s) => s.completed && s.scores?.length);
        if (completed.length > 0) {
          this.logger.debug(`OddsApi ${sport} ${sportKey}: ${completed.length} completed of ${scores.length} total`);
        }

        for (const result of completed) {
          const rawId = typeof result.id === 'string' ? result.id : String(result.id ?? '');
          const apiId = rawId ? oddsIdToNumber(rawId) : 0;

          let event = await this.sportEventRepo.findOne({ where: { sport, apiId } });
          if (!event && rawId) {
            event = await this.sportEventRepo
              .createQueryBuilder('e')
              .where('e.sport = :sport', { sport })
              .andWhere("e.raw_json->>'id' = :rawId", { rawId })
              .getOne();
          }
          if (!event) {
            event = await this.sportEventRepo
              .createQueryBuilder('e')
              .where('e.sport = :sport', { sport })
              .andWhere('e.status != :ft', { ft: 'FT' })
              .andWhere('LOWER(TRIM(e.home_team)) = LOWER(TRIM(:home))', { home: result.home_team })
              .andWhere('LOWER(TRIM(e.away_team)) = LOWER(TRIM(:away))', { away: result.away_team })
              .andWhere('e.event_date::date = :date', {
                date: new Date(result.commence_time).toISOString().split('T')[0],
              })
              .getOne();
          }
          if (!event || event.status === 'FT') continue;

          const scoreHome = result.scores?.find(
            (s) => s.name.toLowerCase() === result.home_team.toLowerCase(),
          ) ?? result.scores?.[0];
          const scoreAway = result.scores?.find(
            (s) => s.name.toLowerCase() === result.away_team.toLowerCase(),
          ) ?? result.scores?.[1];

          const homeScore = this.oddsApi.parseScore(scoreHome?.score);
          const awayScore = this.oddsApi.parseScore(scoreAway?.score);

          await this.sportEventRepo.update(
            { id: event.id },
            {
              status: 'FT',
              homeScore: homeScore ?? event.homeScore,
              awayScore: awayScore ?? event.awayScore,
              syncedAt: new Date(),
            },
          );
          updated++;
          this.logger.log(
            `OddsApi settled ${sport}: ${event.homeTeam} ${homeScore ?? '?'} – ${awayScore ?? '?'} ${event.awayTeam}`,
          );
        }
      }
    }

    if (updated > 0) {
      this.logger.log(`OddsApi results sync: ${updated} event(s) marked FT`);
    }

    return { updated };
  }

  /** Every 2 hours — fetch scores, mark events FT, then run settlement.
   * Chaining settlement here ensures Odds API sports settle even if FixtureScheduler
   * is disabled or runs before we've synced. Respects ENABLE_SCHEDULING. */
  @Cron('0 */2 * * *')
  async handleCron(): Promise<void> {
    if (this.configService.get('ENABLE_SCHEDULING') !== 'true') return;

    const { updated } = await this.syncResults();
    if (updated > 0) {
      const result = await this.settlementService.runSettlement();
      if (result.ticketsSettled > 0 || result.picksUpdated > 0) {
        this.logger.log(
          `OddsApi settlement: ${result.picksUpdated} picks updated, ${result.ticketsSettled} tickets settled`,
        );
      }
    }
  }
}
