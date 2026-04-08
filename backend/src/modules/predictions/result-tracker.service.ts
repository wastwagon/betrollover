import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PredictionFixture } from './entities/prediction-fixture.entity';
import { Prediction } from './entities/prediction.entity';
import { Tipster } from './entities/tipster.entity';
import { TipsterPerformanceLog } from './entities/tipster-performance-log.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureUpdateService } from '../fixtures/fixture-update.service';
import { NotificationsService } from '../notifications/notifications.service';
import { determinePickResult } from '../accumulators/settlement-logic';

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
    // Finished fixture polling is owned by FixtureSchedulerService.
    // Here we only consume currently stored FT results to avoid duplicate API polling.

    const now = new Date();
    const pending = await this.predictionFixtureRepo.find({
      where: {
        resultStatus: 'pending',
        matchDate: LessThan(now),
      },
      select: ['id', 'predictionId', 'fixtureId', 'selectedOutcome'],
    });

    const footballFixtureIds = [
      ...new Set(pending.map((p) => p.fixtureId).filter((id): id is number => id != null)),
    ];
    const fixturesById =
      footballFixtureIds.length > 0
        ? new Map(
            (
              await this.fixtureRepo.find({
                where: { id: In(footballFixtureIds) },
                select: [
                  'id',
                  'status',
                  'homeScore',
                  'awayScore',
                  'homeTeamName',
                  'awayTeamName',
                  'htHomeScore',
                  'htAwayScore',
                ],
              })
            ).map((f) => [f.id, f] as const),
          )
        : new Map<number, Fixture>();

    let fixturesUpdated = 0;
    const settledPredictionIds = new Set<number>();

    for (const pf of pending) {
      if (pf.fixtureId == null) continue; // Non-football predictions handled separately (Phase 1+)
      const fixture = fixturesById.get(pf.fixtureId);

      if (!fixture || fixture.status !== 'FT') continue;
      if (fixture.homeScore == null || fixture.awayScore == null) continue;

      const legResult = this.gradeFixtureLeg(
        pf.selectedOutcome || '',
        fixture.homeScore,
        fixture.awayScore,
        fixture.homeTeamName,
        fixture.awayTeamName,
        fixture.htHomeScore,
        fixture.htAwayScore,
      );

      if (legResult == null) continue;

      await this.predictionFixtureRepo.update(pf.id, {
        resultStatus: legResult,
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
   * Grade one football leg: same rules as marketplace picks (`determinePickResult`).
   * Returns null when the result cannot be computed yet (e.g. first-half market but HT score not stored).
   */
  private gradeFixtureLeg(
    selectedOutcome: string,
    homeScore: number,
    awayScore: number,
    homeTeam?: string | null,
    awayTeam?: string | null,
    htHome?: number | null,
    htAway?: number | null,
  ): 'won' | 'lost' | 'void' | null {
    const outcome = (selectedOutcome || '').trim().toLowerCase();
    const r = determinePickResult(
      outcome,
      homeScore,
      awayScore,
      homeTeam ?? undefined,
      awayTeam ?? undefined,
      htHome ?? null,
      htAway ?? null,
    );
    if (r === 'won') return 'won';
    if (r === 'void') return 'void';
    if (r === 'lost') return 'lost';
    return null;
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

    const hasVoid = fixtures.some((f) => f.resultStatus === 'void');
    const allWon = fixtures.every((f) => f.resultStatus === 'won');
    const prediction = await this.predictionRepo.findOne({
      where: { id: predictionId },
      select: ['id', 'tipsterId', 'combinedOdds', 'status'],
    });

    if (!prediction || prediction.status !== 'pending') return false;

    const combinedOdds = Number(prediction.combinedOdds);
    let status: string;
    let actualResult: number;
    if (hasVoid) {
      status = 'void';
      actualResult = 0;
    } else if (allWon) {
      status = 'won';
      actualResult = combinedOdds - 1;
    } else {
      status = 'lost';
      actualResult = -1;
    }

    await this.predictionRepo.update(predictionId, {
      status,
      actualResult,
      settledAt: new Date(),
    });

    /** Tipster ROI / avg odds / win rate are persisted from accumulator_tickets in SettlementService.runSettlement */
    return true;
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
