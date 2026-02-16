import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PredictionFixture } from './entities/prediction-fixture.entity';
import { Prediction } from './entities/prediction.entity';
import { Tipster } from './entities/tipster.entity';
import { TipsterPerformanceLog } from './entities/tipster-performance-log.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureUpdateService } from '../fixtures/fixture-update.service';
import { NotificationsService } from '../notifications/notifications.service';

const TOP_RANK_THRESHOLD = 10;

@Injectable()
export class ResultTrackerService {
  private readonly logger = new Logger(ResultTrackerService.name);

  constructor(
    @InjectRepository(PredictionFixture)
    private predictionFixtureRepo: Repository<PredictionFixture>,
    @InjectRepository(Prediction)
    private predictionRepo: Repository<Prediction>,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(TipsterPerformanceLog)
    private performanceLogRepo: Repository<TipsterPerformanceLog>,
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    private fixtureUpdateService: FixtureUpdateService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Cron: run every 5 minutes to check and update results
   */
  @Cron('*/5 * * * *')
  async runScheduledCheck(): Promise<void> {
    this.logger.log('Running scheduled result check');
    try {
      await this.checkAndUpdateResults();
    } catch (err: any) {
      this.logger.error('Result check failed', err?.stack || err);
    }
  }

  /**
   * Check all pending predictions and update results
   */
  async checkAndUpdateResults(): Promise<{
    fixturesUpdated: number;
    predictionsSettled: number;
    tipstersUpdated: number;
  }> {
    // 1. Refresh finished fixtures from API (ensure we have latest scores)
    await this.fixtureUpdateService.updateFinishedFixtures();

    const now = new Date();
    const pending = await this.predictionFixtureRepo.find({
      where: {
        resultStatus: 'pending',
        matchDate: LessThan(now),
      },
      select: ['id', 'predictionId', 'fixtureId', 'selectedOutcome'],
    });

    let fixturesUpdated = 0;
    const settledPredictionIds = new Set<number>();

    for (const pf of pending) {
      const fixture = await this.fixtureRepo.findOne({
        where: { id: pf.fixtureId },
        select: ['id', 'status', 'homeScore', 'awayScore'],
      });

      if (!fixture || fixture.status !== 'FT') continue;
      if (fixture.homeScore == null || fixture.awayScore == null) continue;

      const isWon = this.checkIfWon(
        pf.selectedOutcome || '',
        fixture.homeScore,
        fixture.awayScore,
      );

      await this.predictionFixtureRepo.update(pf.id, {
        resultStatus: isWon ? 'won' : 'lost',
        actualScore: `${fixture.homeScore}-${fixture.awayScore}`,
      });
      fixturesUpdated++;
      settledPredictionIds.add(pf.predictionId);
    }

    let predictionsSettled = 0;
    let tipstersUpdated = 0;

    for (const predictionId of settledPredictionIds) {
      const settled = await this.checkAccaSettlement(predictionId);
      if (settled) {
        predictionsSettled++;
        tipstersUpdated++;
      }
    }

    if (tipstersUpdated > 0) {
      await this.updateLeaderboardRankings();
    }

    return { fixturesUpdated, predictionsSettled, tipstersUpdated };
  }

  /**
   * Determine if prediction was correct based on selected outcome
   */
  private checkIfWon(
    selectedOutcome: string,
    homeScore: number,
    awayScore: number,
  ): boolean {
    const outcome = (selectedOutcome || '').trim().toLowerCase();
    const totalGoals = homeScore + awayScore;
    const homeWon = homeScore > awayScore;
    const draw = homeScore === awayScore;
    const awayWon = awayScore > homeScore;

    if (outcome === 'home') return homeWon;
    if (outcome === 'draw') return draw;
    if (outcome === 'away') return awayWon;
    if (outcome === 'home_away') return homeWon || awayWon;
    if (outcome === 'btts') return homeScore > 0 && awayScore > 0;
    if (outcome === 'over25') return totalGoals > 2;
    if (outcome === 'under25') return totalGoals < 2;

    // Correct score: normalize "2-1", "2:1" etc.
    const expected = outcome.replace(/:/g, '-');
    const actual = `${homeScore}-${awayScore}`;
    if (expected === actual) return true;

    return false;
  }

  /**
   * Check if all legs of accumulator are finished and settle
   */
  private async checkAccaSettlement(predictionId: number): Promise<boolean> {
    const fixtures = await this.predictionFixtureRepo.find({
      where: { predictionId },
      order: { legNumber: 'ASC' },
    });

    const allSettled = fixtures.every(
      (f) => ['won', 'lost', 'void'].includes(f.resultStatus),
    );
    if (!allSettled) return false;

    const accaWon = fixtures.every((f) => f.resultStatus === 'won');
    const prediction = await this.predictionRepo.findOne({
      where: { id: predictionId },
      select: ['id', 'tipsterId', 'combinedOdds', 'status'],
    });

    if (!prediction || prediction.status !== 'pending') return false;

    const combinedOdds = Number(prediction.combinedOdds);
    const actualResult = accaWon ? combinedOdds - 1 : -1;
    const status = accaWon ? 'won' : 'lost';

    await this.predictionRepo.update(predictionId, {
      status,
      actualResult,
      settledAt: new Date(),
    });

    await this.updateTipsterPerformance(
      prediction.tipsterId,
      status,
      actualResult,
      combinedOdds,
    );

    return true;
  }

  /**
   * Update tipster's overall statistics
   */
  private async updateTipsterPerformance(
    tipsterId: number,
    result: string,
    profit: number,
    odds: number,
  ): Promise<void> {
    const tipster = await this.tipsterRepo.findOne({
      where: { id: tipsterId },
    });
    if (!tipster) return;

    const totalPredictions = tipster.totalPredictions || 0;
    if (totalPredictions === 0) return;

    const totalWins = result === 'won' ? (tipster.totalWins || 0) + 1 : (tipster.totalWins || 0);
    const totalLosses =
      result === 'lost' ? (tipster.totalLosses || 0) + 1 : (tipster.totalLosses || 0);
    const currentStreak =
      result === 'won'
        ? Math.max(1, (tipster.currentStreak || 0) + 1)
        : Math.min(-1, (tipster.currentStreak || 0) - 1);
    const totalProfit = Number(tipster.totalProfit || 0) + profit;
    const winRate = totalPredictions > 0 ? (totalWins / totalPredictions) * 100 : 0;
    const roi = totalPredictions > 0 ? (totalProfit / totalPredictions) * 100 : 0;
    const bestStreak = Math.max(tipster.bestStreak || 0, currentStreak);
    const avgOdds =
      totalPredictions > 0
        ? (Number(tipster.avgOdds || 0) * (totalPredictions - 1) + odds) / totalPredictions
        : odds;

    await this.tipsterRepo.update(tipsterId, {
      totalWins,
      totalLosses,
      winRate,
      roi,
      currentStreak,
      bestStreak,
      totalProfit,
      avgOdds,
      lastPredictionDate: new Date(),
    });
  }

  /**
   * Cron: update leaderboard every 6 hours at :30 (0:30, 6:30, 12:30, 18:30)
   */
  @Cron('30 0,6,12,18 * * *')
  async runScheduledLeaderboardUpdate(): Promise<void> {
    this.logger.log('Updating leaderboard rankings');
    try {
      await this.updateLeaderboardRankings();
    } catch (err: any) {
      this.logger.error('Leaderboard update failed', err?.stack || err);
    }
  }

  /**
   * Cron: daily performance snapshot at 11 PM
   */
  @Cron('0 23 * * *')
  async runDailySnapshot(): Promise<void> {
    this.logger.log('Taking daily performance snapshot');
    try {
      await this.takePerformanceSnapshot();
    } catch (err: any) {
      this.logger.error('Daily snapshot failed', err?.stack || err);
    }
  }

  /**
   * Update leaderboard rankings by ROI
   */
  private async updateLeaderboardRankings(): Promise<void> {
    const tipsters = await this.tipsterRepo.find({
      where: { isActive: true },
      order: { roi: 'DESC' },
      select: ['id', 'userId', 'leaderboardRank'],
    });

    const oldRankMap = new Map(tipsters.map((t) => [t.id, t.leaderboardRank]));

    for (let i = 0; i < tipsters.length; i++) {
      const newRank = i + 1;
      await this.tipsterRepo.update(tipsters[i].id, {
        leaderboardRank: newRank,
      });

      const tipster = tipsters[i];
      if (!tipster.userId) continue;

      const oldRank = oldRankMap.get(tipster.id) ?? null;
      const movedIntoTop =
        newRank <= TOP_RANK_THRESHOLD &&
        (oldRank == null || oldRank > TOP_RANK_THRESHOLD);

      if (movedIntoTop) {
        await this.notificationsService.create({
          userId: tipster.userId,
          type: 'leaderboard_rank_up',
          title: 'Leaderboard Rank Up',
          message: `You're now rank #${newRank} on the leaderboard! Keep up the great picks.`,
          link: '/leaderboard',
          icon: 'trophy',
          sendEmail: true,
          metadata: { rank: String(newRank) },
        }).catch(() => {});
      }
    }
  }

  /**
   * Take daily performance snapshot for all tipsters
   */
  async takePerformanceSnapshot(): Promise<{ snapshots: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const tipsters = await this.tipsterRepo.find({
      where: { isActive: true },
      select: ['id', 'totalPredictions', 'winRate', 'roi', 'currentStreak', 'totalProfit'],
    });

    const byRoi = [...tipsters].sort(
      (a, b) => Number(b.roi || 0) - Number(a.roi || 0),
    );

    let snapshots = 0;
    for (let i = 0; i < tipsters.length; i++) {
      const t = tipsters[i];
      const rank = byRoi.findIndex((r) => r.id === t.id) + 1;

      await this.performanceLogRepo.upsert(
        {
          tipsterId: t.id,
          snapshotDate: today,
          totalPredictions: t.totalPredictions ?? 0,
          winRate: t.winRate ?? 0,
          roi: t.roi ?? 0,
          currentStreak: t.currentStreak ?? 0,
          totalProfit: t.totalProfit ?? 0,
          dailyRank: rank,
          weeklyRank: rank,
          monthlyRank: rank,
        },
        { conflictPaths: ['tipsterId', 'snapshotDate'] },
      );
      snapshots++;
    }

    this.logger.log(`Saved ${snapshots} performance snapshots`);
    return { snapshots };
  }

  /**
   * Manual trigger for leaderboard update (e.g. from admin)
   */
  async updateLeaderboardNow(): Promise<{ message: string }> {
    await this.updateLeaderboardRankings();
    return { message: 'Leaderboard updated' };
  }

  /**
   * Manual trigger (e.g. from admin)
   */
  async runNow(): Promise<{
    fixturesUpdated: number;
    predictionsSettled: number;
    tipstersUpdated: number;
  }> {
    return this.checkAndUpdateResults();
  }
}
