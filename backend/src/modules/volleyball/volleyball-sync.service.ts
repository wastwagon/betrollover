import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { extractCountryCodesFromTeams } from '../../common/team-country.util';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { SportEventOdd } from '../sport-events/entities/sport-event-odd.entity';
import { VolleyballApiService } from './volleyball-api.service';
import { getEnabledVolleyballLeagueIds } from '../../config/volleyball-leagues.config';
import { isSportEnabled } from '../../config/sports.config';
import { getSyncDates, MAX_ODDS_EVENTS_PER_RUN, SYNC_LOOKAHEAD_DAYS } from '../../config/api-limits.config';

@Injectable()
export class VolleyballSyncService {
  private readonly logger = new Logger(VolleyballSyncService.name);

  constructor(
    @InjectRepository(SportEvent)
    private sportEventRepo: Repository<SportEvent>,
    @InjectRepository(SportEventOdd)
    private oddsRepo: Repository<SportEventOdd>,
    private volleyballApi: VolleyballApiService,
    private configService: ConfigService,
  ) {}

  async sync(): Promise<{ games: number; odds: number }> {
    if (!isSportEnabled('volleyball')) return { games: 0, odds: 0 };
    const enabledLeagueIds = new Set(getEnabledVolleyballLeagueIds());
    const dates = getSyncDates();

    let gamesCount = 0;
    for (const date of dates) {
      const items = await this.volleyballApi.getGames(date);
      const filtered = items.filter((g) => g.league?.id && enabledLeagueIds.has(g.league.id));
      for (const g of filtered) {
        const homeLogo = typeof (g as any).teams?.home?.logo === 'string' && (g as any).teams.home.logo.startsWith('http') ? (g as any).teams.home.logo : null;
        const awayLogo = typeof (g as any).teams?.away?.logo === 'string' && (g as any).teams.away.logo.startsWith('http') ? (g as any).teams.away.logo : null;
        const { home: homeCc, away: awayCc } = extractCountryCodesFromTeams((g as any).teams?.home, (g as any).teams?.away);
        const homeScore = typeof g.scores?.home === 'number' ? g.scores.home : null;
        const awayScore = typeof g.scores?.away === 'number' ? g.scores.away : null;
        await this.sportEventRepo.upsert(
          {
            sport: 'volleyball',
            apiId: g.id,
            leagueId: g.league?.id ?? null,
            leagueName: g.league?.name ?? null,
            homeTeam: g.teams?.home?.name?.trim() || 'Home',
            awayTeam: g.teams?.away?.name?.trim() || 'Away',
            homeTeamLogo: homeLogo,
            awayTeamLogo: awayLogo,
            homeCountryCode: homeCc,
            awayCountryCode: awayCc,
            eventDate: new Date(g.date),
            status: g.status?.short || 'NS',
            homeScore,
            awayScore,
            rawJson: JSON.parse(JSON.stringify(g)),
            syncedAt: new Date(),
          },
          { conflictPaths: ['sport', 'apiId'] },
        );
        gamesCount++;
      }
    }

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + SYNC_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
    const withoutOdds = await this.sportEventRepo
      .createQueryBuilder('e')
      .leftJoin('e.odds', 'o')
      .where("e.sport = 'volleyball'")
      .andWhere("e.status IN ('NS', 'TBD')")
      .andWhere('e.eventDate >= :now', { now })
      .andWhere('e.eventDate <= :end', { end: sevenDaysLater })
      .andWhere('o.id IS NULL')
      .orderBy('e.eventDate', 'ASC')
      .limit(MAX_ODDS_EVENTS_PER_RUN)
      .getMany();

    let oddsCount = 0;
    for (const event of withoutOdds) {
      const odds = await this.volleyballApi.getOdds(event.apiId);
      if (odds.length === 0) continue;
      await this.oddsRepo.delete({ sportEventId: event.id });
      for (const o of odds) {
        await this.oddsRepo.save({
          sportEventId: event.id,
          marketName: o.marketName,
          marketValue: o.marketValue,
          odds: o.odds,
        });
      }
      oddsCount++;
    }

    if (gamesCount > 0 || oddsCount > 0) {
      this.logger.log(`Volleyball sync: ${gamesCount} games, ${oddsCount} odds updated`);
    }
    return { games: gamesCount, odds: oddsCount };
  }

  @Cron('35 0 * * *') // 12:35 AM — consolidated to midnight window
  async handleCron(): Promise<void> {
    if (this.configService.get('ENABLE_SCHEDULING') !== 'true') return;
    await this.sync();
  }
}
