import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { OddsApiService, SPORT_ODDS_PREFIXES, oddsIdToNumber } from './odds-api.service';
import { isSportEnabled } from '../../config/sports.config';

/**
 * Fetches completed match scores from The Odds API and updates sport_events
 * so the main SettlementService can auto-settle pending coupons.
 *
 * Cron: every 4 hours.
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
  ) {}

  /**
   * Fetch completed scores from The Odds API and mark matching sport_events as finished (FT).
   * Returns the number of events updated.
   */
  async syncResults(): Promise<{ updated: number }> {
    let updated = 0;

    for (const sport of this.COVERED_SPORTS) {
      if (!isSportEnabled(sport)) continue;

      const prefixes = SPORT_ODDS_PREFIXES[sport] ?? [];
      if (!prefixes.length) continue;

      const sportKeys = await this.oddsApi.getActiveSportKeys(prefixes);

      for (const sportKey of sportKeys) {
        // daysFrom=3 covers matches completed in last 3 days (catches delayed result updates)
        const scores = await this.oddsApi.getScores(sportKey, 3);
        const completed = scores.filter((s) => s.completed && s.scores?.length);

        for (const result of completed) {
          const apiId = oddsIdToNumber(result.id);
          if (!apiId) continue;

          // Find our stored event
          const event = await this.sportEventRepo.findOne({
            where: { sport, apiId },
          });
          if (!event || event.status === 'FT') continue;

          // Map scores — The Odds API returns scores in same order as home_team/away_team
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
          this.logger.debug(
            `Settled ${sport}: ${event.homeTeam} ${homeScore ?? '?'} – ${awayScore ?? '?'} ${event.awayTeam}`,
          );
        }
      }
    }

    if (updated > 0) {
      this.logger.log(`OddsApi results sync: ${updated} event(s) marked FT`);
    }

    return { updated };
  }

  /** Every 4 hours — fetch scores and mark completed events as FT */
  @Cron('0 */4 * * *')
  async handleCron(): Promise<void> {
    await this.syncResults();
  }
}
