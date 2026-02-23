import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { SportEventOdd } from '../sport-events/entities/sport-event-odd.entity';
import { OddsApiService, SPORT_ODDS_PREFIXES, oddsIdToNumber } from '../odds-api/odds-api.service';
import { isSportEnabled } from '../../config/sports.config';

@Injectable()
export class BasketballSyncService {
  private readonly logger = new Logger(BasketballSyncService.name);

  constructor(
    @InjectRepository(SportEvent)
    private sportEventRepo: Repository<SportEvent>,
    @InjectRepository(SportEventOdd)
    private oddsRepo: Repository<SportEventOdd>,
    private oddsApi: OddsApiService,
    private configService: ConfigService,
  ) {}

  async sync(): Promise<{ games: number; odds: number }> {
    if (!isSportEnabled('basketball')) return { games: 0, odds: 0 };

    const sportKeys = await this.oddsApi.getActiveSportKeys(SPORT_ODDS_PREFIXES.basketball);
    if (!sportKeys.length) {
      this.logger.log('Basketball sync: no active competitions');
      return { games: 0, odds: 0 };
    }

    let gamesCount = 0;
    let oddsCount = 0;

    for (const sportKey of sportKeys) {
      const events = await this.oddsApi.getEventsWithOdds(sportKey);

      for (const evt of events) {
        const apiId = oddsIdToNumber(evt.id);
        if (!apiId) continue;

        const odds = this.oddsApi.extractH2hOdds(evt);
        if (!odds.length) continue; // Only store events with at least one odds market

        await this.sportEventRepo.upsert(
          {
            sport: 'basketball',
            apiId,
            leagueId: null,
            leagueName: evt.sport_title,
            homeTeam: evt.home_team,
            awayTeam: evt.away_team,
            homeTeamLogo: null,
            awayTeamLogo: null,
            homeCountryCode: null,
            awayCountryCode: null,
            eventDate: new Date(evt.commence_time),
            status: 'NS',
            homeScore: null,
            awayScore: null,
            rawJson: { id: evt.id, sport_key: evt.sport_key },
            syncedAt: new Date(),
          },
          { conflictPaths: ['sport', 'apiId'] },
        );
        gamesCount++;

        const saved = await this.sportEventRepo.findOne({ where: { sport: 'basketball', apiId } });
        if (saved) {
          await this.oddsRepo.delete({ sportEventId: saved.id });
          await this.oddsRepo.save(odds.map((o) => ({ sportEventId: saved.id, ...o })));
          oddsCount++;
        }
      }
    }

    this.logger.log(`Basketball sync: ${gamesCount} matches, ${oddsCount} with odds (${sportKeys.length} competitions)`);
    return { games: gamesCount, odds: oddsCount };
  }

  @Cron('15 0 * * *') // 12:15 AM — consolidated to midnight window
  async handleCron(): Promise<void> {
    if (this.configService.get('ENABLE_SCHEDULING') !== 'true') return;
    await this.sync();
  }
}
