import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, SelectQueryBuilder } from 'typeorm';
import { Tipster } from './entities/tipster.entity';
import { Prediction } from './entities/prediction.entity';
import { PredictionFixture } from './entities/prediction-fixture.entity';
import { TipsterFollow } from './entities/tipster-follow.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { PickMarketplace } from '../accumulators/entities/pick-marketplace.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { TipsterSubscriptionPackage } from '../subscriptions/entities/tipster-subscription-package.entity';
import {
  LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING,
  LEADERBOARD_MIN_SETTLED_WEEKLY,
} from '@betrollover/shared-types';
import { AccumulatorsService } from '../accumulators/accumulators.service';

const SORT_COLUMNS: Record<string, string> = {
  roi: 'roi',
  win_rate: 'winRate',
  total_profit: 'totalProfit',
  total_predictions: 'totalPredictions',
};

/** Tipster profile: settlement presets filter by `updated_at`; optional `from`/`to` filters by coupon post time `created_at`. */
export type TipsterProfilePerformancePeriod = 'all' | 'week' | 'month' | 'd60' | 'd90';

export function parseTipsterProfilePerformancePeriod(raw: string | undefined): TipsterProfilePerformancePeriod {
  const v = (raw ?? 'all').toLowerCase().trim();
  if (v === 'week' || v === 'weekly') return 'week';
  if (v === 'month' || v === 'monthly') return 'month';
  if (v === '60d' || v === 'd60') return 'd60';
  if (v === '90d' || v === 'd90') return 'd90';
  return 'all';
}

/** Profile stats + archive: settlement time (`updated_at`). Active coupons list is not narrowed by this. */
export type TipsterProfileSettlementWindow = { kind: 'settlement_period'; period: TipsterProfilePerformancePeriod };

/** Custom calendar on tipster page: coupons **posted** in range (`created_at`); stats from those coupons only. */
export type TipsterProfilePostedWindow = {
  kind: 'posted_between';
  from: string;
  to: string;
  startUtc: Date;
  endExclusiveUtc: Date;
};

export type TipsterProfilePerformanceWindow = TipsterProfileSettlementWindow | TipsterProfilePostedWindow;

const TIPSTER_POSTED_RANGE_MAX_DAYS = 366;

function parseYmdUtcStrict(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo || dt.getUTCDate() !== d) return null;
  return dt;
}

/**
 * When both `from` and `to` are valid `YYYY-MM-DD` (UTC calendar days), `from <= to`, span <= 366 days.
 * Takes precedence over `performance` on GET /tipsters/:username.
 */
export function parseTipsterProfilePostedBetween(fromRaw?: string, toRaw?: string): TipsterProfilePostedWindow | null {
  if (fromRaw == null || toRaw == null) return null;
  const from = fromRaw.trim();
  const to = toRaw.trim();
  if (!from || !to) return null;
  const startUtc = parseYmdUtcStrict(from);
  const toDayUtc = parseYmdUtcStrict(to);
  if (!startUtc || !toDayUtc || startUtc > toDayUtc) return null;
  const spanDays = (toDayUtc.getTime() - startUtc.getTime()) / 86400000 + 1;
  if (spanDays > TIPSTER_POSTED_RANGE_MAX_DAYS) return null;
  const endExclusiveUtc = new Date(toDayUtc.getTime() + 86400000);
  return { kind: 'posted_between', from, to, startUtc, endExclusiveUtc };
}

export function buildTipsterProfilePerformanceWindow(
  performanceRaw: string | undefined,
  fromRaw?: string,
  toRaw?: string,
): TipsterProfilePerformanceWindow {
  const posted = parseTipsterProfilePostedBetween(fromRaw, toRaw);
  if (posted) return posted;
  return { kind: 'settlement_period', period: parseTipsterProfilePerformancePeriod(performanceRaw) };
}

function settledPickCount(row: { total_wins?: number; total_losses?: number }): number {
  return (row.total_wins ?? 0) + (row.total_losses ?? 0);
}

function leaderboardRowProfit(row: { total_profit?: number; profit?: number }): number {
  return Number(row.total_profit ?? row.profit ?? 0);
}

/** Leaderboard row ordering (ROI, then profit, then win rate). Works for all-time and period rows (`profit` or `total_profit`). */
function compareLeaderboardRows(
  a: { roi: number; total_profit?: number; profit?: number; win_rate: number },
  b: { roi: number; total_profit?: number; profit?: number; win_rate: number },
): number {
  const roi = (b.roi ?? 0) - (a.roi ?? 0);
  if (roi !== 0) return roi;
  const profit = leaderboardRowProfit(b) - leaderboardRowProfit(a);
  if (profit !== 0) return profit;
  return (b.win_rate ?? 0) - (a.win_rate ?? 0);
}

/** Browse / leaderboard ordering: measurable performance first; never rank empty profiles above tipsters with settled picks. */
function tipsterListingActivityTier(row: { total_wins?: number; total_losses?: number; total_predictions?: number }): number {
  const settled = (row.total_wins ?? 0) + (row.total_losses ?? 0) > 0;
  if (settled) return 0;
  if ((row.total_predictions ?? 0) > 0) return 1;
  return 2;
}

@Injectable()
export class TipstersApiService {
  constructor(
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(Prediction)
    private predictionRepo: Repository<Prediction>,
    @InjectRepository(PredictionFixture)
    private predictionFixtureRepo: Repository<PredictionFixture>,
    @InjectRepository(TipsterFollow)
    private followRepo: Repository<TipsterFollow>,
    @InjectRepository(AccumulatorTicket)
    private ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(AccumulatorPick)
    private pickRepo: Repository<AccumulatorPick>,
    @InjectRepository(PickMarketplace)
    private marketplaceRepo: Repository<PickMarketplace>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(TipsterSubscriptionPackage)
    private subscriptionPackageRepo: Repository<TipsterSubscriptionPackage>,
    @Inject(forwardRef(() => AccumulatorsService))
    private readonly accumulatorsService: AccumulatorsService,
  ) {}

  /** At most one active package per tipster (DB-enforced); map user id → package id. */
  private async loadActiveVipPackageIdsByUserIds(userIds: number[]): Promise<Map<number, number>> {
    if (userIds.length === 0) return new Map();
    const unique = [...new Set(userIds)];
    const rows = await this.subscriptionPackageRepo.find({
      where: { tipsterUserId: In(unique), status: 'active' },
      select: ['id', 'tipsterUserId'],
    });
    const m = new Map<number, number>();
    for (const r of rows) {
      m.set(r.tipsterUserId, r.id);
    }
    return m;
  }

  /**
   * All-time leaderboard rows sorted by live ROI (ticket-backed stats for humans).
   * Same ordering as GET /leaderboard?period=all_time — do not use tipsters.leaderboardRank for user-facing rank.
   */
  private async computeAllTimeLeaderboardSortedEntries(sport?: string): Promise<{
    tipsters: Array<
      Pick<
        Tipster,
        | 'id'
        | 'username'
        | 'displayName'
        | 'avatarUrl'
        | 'userId'
        | 'totalPredictions'
        | 'totalWins'
        | 'totalLosses'
        | 'winRate'
        | 'roi'
        | 'totalProfit'
        | 'leaderboardRank'
        | 'isAi'
      >
    >;
    sorted: Array<{
      id: number;
      username: string;
      display_name: string;
      avatar_url: string | null;
      is_ai: boolean;
      roi: number;
      win_rate: number;
      total_predictions: number;
      total_wins: number;
      total_losses: number;
      total_profit: number;
      leaderboard_rank: number | null;
    }>;
  }> {
    const tipstersRaw = await this.tipsterRepo.find({
      where: { isActive: true },
      select: [
        'id',
        'username',
        'displayName',
        'avatarUrl',
        'userId',
        'totalPredictions',
        'totalWins',
        'totalLosses',
        'winRate',
        'roi',
        'totalProfit',
        'leaderboardRank',
        'isAi',
      ],
    });
    const humanIdsForStatus = [...new Set(tipstersRaw.map((t) => t.userId).filter((id): id is number => id != null))];
    let activeHumanIds = new Set<number>();
    if (humanIdsForStatus.length > 0) {
      const activeRows = await this.usersRepo.find({
        where: { id: In(humanIdsForStatus), status: UserStatus.ACTIVE },
        select: ['id'],
      });
      activeHumanIds = new Set(activeRows.map((r) => r.id));
    }
    const tipsters = tipstersRaw.filter(
      (t) => t.isAi || (t.userId != null && activeHumanIds.has(t.userId)),
    );
    const humanUserIds = tipsters.filter((t) => t.userId != null).map((t) => t.userId!);
    const ticketStatsMap = await this.computeStatsFromTickets(humanUserIds, sport);

    const entries = tipsters.map((t) => {
      const ticketStats = t.userId != null ? ticketStatsMap.get(t.userId) : null;
      const totalPredictions = ticketStats ? ticketStats.total : t.totalPredictions;
      const totalWins = ticketStats ? ticketStats.won : t.totalWins;
      const totalLosses = ticketStats ? ticketStats.lost : t.totalLosses;
      const winRate = ticketStats ? ticketStats.winRate : Number(t.winRate);
      const roi = ticketStats ? ticketStats.roi : Number(t.roi);
      return {
        id: t.id,
        username: t.username,
        display_name: t.displayName,
        avatar_url: t.avatarUrl,
        is_ai: !!t.isAi,
        roi,
        win_rate: winRate,
        total_predictions: totalPredictions,
        total_wins: totalWins,
        total_losses: totalLosses,
        total_profit: Number(t.totalProfit),
        leaderboard_rank: t.leaderboardRank,
      };
    });

    const withSettled = entries.filter((e) => settledPickCount(e) > 0);
    const minPrimary = LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING;
    const primary = withSettled.filter((e) => settledPickCount(e) >= minPrimary).sort(compareLeaderboardRows);
    const secondary = withSettled.filter((e) => settledPickCount(e) < minPrimary).sort(compareLeaderboardRows);
    const sorted = [...primary, ...secondary];

    return { tipsters, sorted };
  }

  /**
   * Single pass over all-time sorted leaderboard: tipster entity id and user id → rank (1-based).
   * Same ordering as GET /leaderboard?period=all_time (ROI). Unlisted tipsters are omitted from both maps.
   */
  private async getAllTimeLeaderboardRankMaps(sport?: string): Promise<{
    byTipsterId: Map<number, number>;
    byUserId: Map<number, number>;
  }> {
    const { sorted, tipsters } = await this.computeAllTimeLeaderboardSortedEntries(sport);
    const tipsterIdToUserId = new Map<number, number>();
    for (const t of tipsters) {
      if (t.userId != null) tipsterIdToUserId.set(t.id, t.userId);
    }
    const byTipsterId = new Map<number, number>();
    const byUserId = new Map<number, number>();
    for (let i = 0; i < sorted.length; i++) {
      const r = i + 1;
      const e = sorted[i];
      byTipsterId.set(e.id, r);
      const uid = tipsterIdToUserId.get(e.id);
      if (uid != null) byUserId.set(uid, r);
    }
    return { byTipsterId, byUserId };
  }

  private async getAllTimeLeaderboardRankMap(sport?: string): Promise<Map<number, number>> {
    return (await this.getAllTimeLeaderboardRankMaps(sport)).byTipsterId;
  }

  /**
   * User id → all-time leaderboard rank (1-based), same ordering as GET /leaderboard?period=all_time.
   * Omitted if the tipster has no settled picks (not eligible for the leaderboard list).
   */
  async getLeaderboardRankByUserIdMap(sport?: string): Promise<Map<number, number>> {
    return (await this.getAllTimeLeaderboardRankMaps(sport)).byUserId;
  }

  /** Compute stats from accumulator_tickets for human tipsters (userId) - matches Marketplace logic */
  private async computeStatsFromTickets(userIds: number[], sport?: string): Promise<
    Map<number, { total: number; won: number; lost: number; winRate: number; roi: number; currentStreak: number; bestStreak: number }>
  > {
    if (userIds.length === 0) return new Map();
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .select('t.userId', 'userId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.result = :won THEN 1 ELSE 0 END)', 'won')
      .addSelect('SUM(CASE WHEN t.result = :lost THEN 1 ELSE 0 END)', 'lost')
      .addSelect('COALESCE(SUM(CASE WHEN t.result = :won THEN t.totalOdds ELSE 0 END), 0)', 'totalOddsWon')
      .where('t.userId IN (:...userIds)', { userIds })
      .setParameter('won', 'won')
      .setParameter('lost', 'lost')
      .groupBy('t.userId');

    if (sport) {
      // ticket sport column stores display names (e.g. 'Basketball', 'MMA')
      const displayName = sport.charAt(0).toUpperCase() + sport.slice(1).replace('_', ' ');
      qb.andWhere('LOWER(t.sport) = LOWER(:sport)', { sport: displayName });
    }

    const rows = await qb.getRawMany();

    const statsMap = new Map<number, { total: number; won: number; lost: number; winRate: number; roi: number; currentStreak: number; bestStreak: number }>();
    for (const row of rows) {
      const userId = Number(row.userId);
      const total = Number(row.total) || 0;
      const won = Number(row.won) || 0;
      const lost = Number(row.lost) || 0;
      const settled = won + lost;
      const winRate = settled > 0 ? (won / settled) * 100 : 0;
      const totalOddsWon = Number(row.totalOddsWon) || 0;
      // ROI: equal stake per coupon (1 unit). Formula: ((returns - investment) / investment) * 100
      // Same % for any stake (e.g. GHS 100/coupon): returns = sum(totalOdds) for won, investment = settled count
      const totalInvestment = settled;
      const totalReturns = won > 0 ? totalOddsWon : 0;
      const roi = totalInvestment > 0 ? ((totalReturns - totalInvestment) / totalInvestment) * 100 : 0;
      const { currentStreak, bestStreak } = await this.computeStreakFromTickets(userId);
      statsMap.set(userId, { total, won, lost, winRate, roi, currentStreak, bestStreak });
    }
    return statsMap;
  }

  /**
   * Stats from accumulator_tickets — same basis as GET /tipsters/:username and listings.
   * Use for VIP marketplace and any surface that must match the public profile.
   */
  async getPublicTicketStatsForUsers(userIds: number[]) {
    return this.computeStatsFromTickets(userIds);
  }

  /** Settled marketplace coupons posted in the current calendar week/month (same ROI basis as computeStatsFromTickets). */
  private async computeStatsFromTicketsInPeriod(
    userIds: number[],
    period: 'monthly' | 'weekly',
    sport?: string,
  ): Promise<Map<number, { total: number; won: number; lost: number; winRate: number; roi: number }>> {
    if (userIds.length === 0) return new Map();
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .select('t.userId', 'userId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.result = :won THEN 1 ELSE 0 END)', 'won')
      .addSelect('SUM(CASE WHEN t.result = :lost THEN 1 ELSE 0 END)', 'lost')
      .addSelect('COALESCE(SUM(CASE WHEN t.result = :won THEN t.totalOdds ELSE 0 END), 0)', 'totalOddsWon')
      .where('t.userId IN (:...userIds)', { userIds })
      .andWhere('t.result IN (:...settled)', { settled: ['won', 'lost'] })
      .setParameter('won', 'won')
      .setParameter('lost', 'lost');

    if (period === 'monthly') {
      qb.andWhere("t.created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)")
        .andWhere("t.created_at < DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'");
    } else {
      qb.andWhere("t.created_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP)")
        .andWhere("t.created_at < DATE_TRUNC('week', CURRENT_TIMESTAMP) + INTERVAL '1 week'");
    }

    if (sport) {
      const displayName = sport.charAt(0).toUpperCase() + sport.slice(1).replace('_', ' ');
      qb.andWhere('LOWER(t.sport) = LOWER(:sport)', { sport: displayName });
    }

    qb.groupBy('t.userId');
    const rows = await qb.getRawMany();

    const statsMap = new Map<number, { total: number; won: number; lost: number; winRate: number; roi: number }>();
    for (const row of rows) {
      const userId = Number(row.userId);
      const total = Number(row.total) || 0;
      const won = Number(row.won) || 0;
      const lost = Number(row.lost) || 0;
      const settled = won + lost;
      const winRate = settled > 0 ? (won / settled) * 100 : 0;
      const totalOddsWon = Number(row.totalOddsWon) || 0;
      const totalInvestment = settled;
      const totalReturns = won > 0 ? totalOddsWon : 0;
      const roi = totalInvestment > 0 ? ((totalReturns - totalInvestment) / totalInvestment) * 100 : 0;
      statsMap.set(userId, { total, won, lost, winRate, roi });
    }
    return statsMap;
  }

  /**
   * Recompute tipster stats from accumulator_tickets and persist to tipsters table.
   * Used after settlement and admin actions so persisted stats match marketplace coupons.
   *
   * **Avg odds:** mean of `totalOdds` (combined coupon price) over **settled** coupons only
   * (`won` / `lost` / `void`). Pending listings are excluded so the figure reflects completed
   * plays, not unpublished stake levels.
   */
  async recalculateAndPersistTipsterStats(userId: number): Promise<boolean> {
    const tipster = await this.tipsterRepo.findOne({ where: { userId } });
    if (!tipster) return false;

    const tickets = await this.ticketRepo.find({
      where: { userId },
      select: ['id', 'result', 'totalOdds', 'createdAt'],
      order: { createdAt: 'ASC' },
    });

    const totalPredictions = tickets.length;
    const settled = tickets.filter((t) => t.result === 'won' || t.result === 'lost');
    const totalWins = settled.filter((t) => t.result === 'won').length;
    const totalLosses = settled.filter((t) => t.result === 'lost').length;

    const totalProfit = settled.reduce((sum, t) => {
      return sum + (t.result === 'won' ? Number(t.totalOdds) - 1 : -1);
    }, 0);

    const winRate = settled.length > 0 ? (totalWins / settled.length) * 100 : 0;
    const roi = totalPredictions > 0 ? (totalProfit / totalPredictions) * 100 : 0;
    const { currentStreak, bestStreak } = await this.computeStreakFromTickets(userId);

    const finished = tickets.filter((t) => ['won', 'lost', 'void'].includes(t.result));
    const oddsSumFinished = finished.reduce((s, t) => s + Number(t.totalOdds), 0);
    const avgOdds =
      finished.length > 0 ? Math.round((oddsSumFinished / finished.length) * 100) / 100 : 0;

    const lastTicket = tickets[tickets.length - 1];
    const lastPredictionDate = lastTicket?.createdAt ?? null;

    await this.tipsterRepo.update(tipster.id, {
      totalPredictions,
      totalWins,
      totalLosses,
      winRate,
      roi,
      currentStreak,
      bestStreak,
      totalProfit,
      avgOdds,
      lastPredictionDate,
    });
    return true;
  }

  /**
   * Mean combined coupon odds (`totalOdds`) over finished coupons only — same definition as persisted `avgOdds`.
   */
  private async getAvgOddsFromSettledTickets(userId: number): Promise<number> {
    const row = await this.ticketRepo
      .createQueryBuilder('t')
      .select('COALESCE(AVG(t.totalOdds), 0)', 'avg')
      .where('t.userId = :uid', { uid: userId })
      .andWhere('t.result IN (:...r)', { r: ['won', 'lost', 'void'] })
      .getRawOne<{ avg: string }>();
    return Math.round(Number(row?.avg ?? 0) * 100) / 100;
  }

  private async computeStreakFromTickets(userId: number): Promise<{ currentStreak: number; bestStreak: number }> {
    const tickets = await this.ticketRepo.find({
      where: { userId },
      select: ['result', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const settled = tickets.filter((t) => t.result === 'won' || t.result === 'lost');
    let currentStreak = 0;
    let bestStreak = 0;
    let run = 0;
    for (const t of settled) {
      const sign = t.result === 'won' ? 1 : -1;
      if (run === 0 || (run > 0 && sign === 1) || (run < 0 && sign === -1)) {
        run += sign;
      } else {
        run = sign;
      }
      if (run > 0) bestStreak = Math.max(bestStreak, run);
      if (settled.indexOf(t) === 0) currentStreak = run;
    }
    return { currentStreak, bestStreak };
  }

  /** Streak from rows already ordered newest settlement first (W/L only). */
  private computeStreakFromOrderedResults(rows: { result: string }[]): { currentStreak: number; bestStreak: number } {
    let currentStreak = 0;
    let bestStreak = 0;
    let run = 0;
    for (let i = 0; i < rows.length; i++) {
      const t = rows[i];
      const sign = t.result === 'won' ? 1 : -1;
      if (run === 0 || (run > 0 && sign === 1) || (run < 0 && sign === -1)) {
        run += sign;
      } else {
        run = sign;
      }
      if (run > 0) bestStreak = Math.max(bestStreak, run);
      if (i === 0) currentStreak = run;
    }
    return { currentStreak, bestStreak };
  }

  private applyTipsterProfilePeriodFilter(
    qb: SelectQueryBuilder<AccumulatorTicket>,
    period: TipsterProfilePerformancePeriod,
  ): void {
    if (period === 'all') return;
    switch (period) {
      case 'week':
        qb.andWhere("t.updated_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP)");
        break;
      case 'month':
        qb.andWhere("t.updated_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)");
        break;
      case 'd60':
        qb.andWhere("t.updated_at >= NOW() - INTERVAL '60 days'");
        break;
      case 'd90':
        qb.andWhere("t.updated_at >= NOW() - INTERVAL '90 days'");
        break;
    }
  }

  /** Stats + archive: settlement presets use `updated_at`; custom range uses coupon post time `created_at`. */
  private applyTipsterProfileWindowOnTicket(
    qb: SelectQueryBuilder<AccumulatorTicket>,
    window: TipsterProfilePerformanceWindow,
  ): void {
    if (window.kind === 'posted_between') {
      qb.andWhere('t.createdAt >= :__tw0', { __tw0: window.startUtc });
      qb.andWhere('t.createdAt < :__tw1', { __tw1: window.endExclusiveUtc });
      return;
    }
    this.applyTipsterProfilePeriodFilter(qb, window.period);
  }

  /**
   * Marketplace settled coupons only.
   * Settlement presets: window by `updated_at`. Custom posted range: window by `createdAt`.
   * `total` = won + lost + void; ROI / win rate use won+lost only (same as public profile formulas).
   */
  private async computeMarketplaceProfileStats(
    userId: number,
    window: TipsterProfilePerformanceWindow,
  ): Promise<{
    total: number;
    won: number;
    lost: number;
    winRate: number;
    roi: number;
    currentStreak: number;
    bestStreak: number;
    avgOdds: number;
  }> {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'total')
      .addSelect(`SUM(CASE WHEN t.result = :won THEN 1 ELSE 0 END)`, 'won')
      .addSelect(`SUM(CASE WHEN t.result = :lost THEN 1 ELSE 0 END)`, 'lost')
      .addSelect(`COALESCE(SUM(CASE WHEN t.result = :won2 THEN t.totalOdds ELSE 0 END), 0)`, 'totalOddsWon')
      .addSelect('COALESCE(AVG(t.totalOdds), 0)', 'avgOdds')
      .where('t.userId = :uid', { uid: userId })
      .andWhere('t.isMarketplace = :im', { im: true })
      .andWhere('t.result IN (:...fin)', { fin: ['won', 'lost', 'void'] })
      .setParameter('won', 'won')
      .setParameter('lost', 'lost')
      .setParameter('won2', 'won');

    this.applyTipsterProfileWindowOnTicket(qb, window);

    const row = await qb.getRawOne<{
      total: string;
      won: string;
      lost: string;
      totalOddsWon: string;
      avgOdds: string;
    }>();

    const total = Number(row?.total ?? 0) || 0;
    const won = Number(row?.won ?? 0) || 0;
    const lost = Number(row?.lost ?? 0) || 0;
    const settledWL = won + lost;
    const winRate = settledWL > 0 ? (won / settledWL) * 100 : 0;
    const totalOddsWon = Number(row?.totalOddsWon ?? 0) || 0;
    const roi = settledWL > 0 ? ((totalOddsWon - settledWL) / settledWL) * 100 : 0;
    const avgOdds = Math.round(Number(row?.avgOdds ?? 0) * 100) / 100;

    const streakQb = this.ticketRepo
      .createQueryBuilder('t')
      .select(['t.id', 't.result'])
      .where('t.userId = :uid', { uid: userId })
      .andWhere('t.isMarketplace = :im', { im: true })
      .andWhere('t.result IN (:...wl)', { wl: ['won', 'lost'] });
    this.applyTipsterProfileWindowOnTicket(streakQb, window);
    const streakRows = await streakQb.orderBy('t.updatedAt', 'DESC').take(500).getMany();
    const { currentStreak, bestStreak } = this.computeStreakFromOrderedResults(streakRows);

    return { total, won, lost, winRate, roi, currentStreak, bestStreak, avgOdds };
  }

  async getTipsters(options: {
    limit: number;
    sortBy: string;
    order: 'asc' | 'desc';
    isAi?: boolean;
    userId?: number;
    search?: string;
    sport?: string;
  }) {
    const qb = this.tipsterRepo
      .createQueryBuilder('t')
      .leftJoin(User, 'u', 'u.id = t.userId')
      .where('t.isActive = :active', { active: true })
      // Exclude orphaned human tipsters (user deleted; user_id set to null by ON DELETE SET NULL)
      .andWhere('(t.isAi = true OR t.userId IS NOT NULL)')
      // Human tipsters only if linked user account is active (suspended / inactive hidden from public)
      .andWhere('(t.isAi = true OR (t.userId IS NOT NULL AND u.status = :userActive))', {
        userActive: UserStatus.ACTIVE,
      })
      .select([
        't.id',
        't.username',
        't.displayName',
        't.avatarUrl',
        't.bio',
        't.isAi',
        't.userId',
        't.totalPredictions',
        't.totalWins',
        't.totalLosses',
        't.winRate',
        't.roi',
        't.currentStreak',
        't.bestStreak',
        't.totalProfit',
        't.avgOdds',
        't.leaderboardRank',
      ])
      .orderBy(`t.${SORT_COLUMNS[options.sortBy] || 'roi'}`, options.order.toUpperCase() as 'ASC' | 'DESC')
      .take(
        options.search?.trim()
          ? Math.min(200, Math.max(options.limit * 4, options.limit + 20))
          : Math.min(400, Math.max(options.limit * 25, options.limit + 50)),
      );

    if (options.isAi !== undefined) {
      qb.andWhere('t.isAi = :isAi', { isAi: options.isAi });
    }

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(t.displayName) LIKE :term OR LOWER(t.username) LIKE :term OR LOWER(t.bio) LIKE :term)',
        { term },
      );
    }

    const tipsters = await qb.getMany();
    const humanUserIds = tipsters.filter((t) => t.userId != null).map((t) => t.userId!);
    const vipPackageMap = await this.loadActiveVipPackageIdsByUserIds(humanUserIds);
    const ticketStatsMap = await this.computeStatsFromTickets(humanUserIds, options.sport);

    const aiTipsterIds = tipsters.filter((t) => t.isAi).map((t) => t.id);
    let predictionCountByTipsterId = new Map<number, number>();
    if (aiTipsterIds.length > 0) {
      const predRows = await this.predictionRepo
        .createQueryBuilder('p')
        .select('p.tipsterId', 'tipsterId')
        .addSelect('COUNT(*)', 'cnt')
        .where('p.tipsterId IN (:...ids)', { ids: aiTipsterIds })
        .groupBy('p.tipsterId')
        .getRawMany();
      predictionCountByTipsterId = new Map(predRows.map((r) => [Number(r.tipsterId), Number(r.cnt) || 0]));
    }

    const tipsterIds = tipsters.map((t) => t.id);
    const followerCountMap = new Map<number, number>();
    if (tipsterIds.length > 0) {
      const counts = await this.followRepo
        .createQueryBuilder('f')
        .select('f.tipsterId', 'tipsterId')
        .addSelect('COUNT(*)', 'cnt')
        .where('f.tipsterId IN (:...ids)', { ids: tipsterIds })
        .groupBy('f.tipsterId')
        .getRawMany();
      counts.forEach((r) => followerCountMap.set(Number(r.tipsterId), Number(r.cnt) || 0));
    }

    let followingSet = new Set<number>();
    if (options.userId) {
      const follows = await this.followRepo.find({
        where: {
          userId: options.userId,
          tipsterId: In(tipsters.map((t) => t.id)),
        },
        select: ['tipsterId'],
      });
      followingSet = new Set(follows.map((f) => f.tipsterId));
    }

    const mapped = tipsters.map((t) => {
      const ticketStats = t.userId != null ? ticketStatsMap.get(t.userId) : null;
      const totalPredictions = ticketStats
        ? ticketStats.total
        : t.isAi
          ? (predictionCountByTipsterId.get(t.id) ?? t.totalPredictions)
          : t.totalPredictions;
      const totalWins = ticketStats ? ticketStats.won : t.totalWins;
      const totalLosses = ticketStats ? ticketStats.lost : t.totalLosses;
      const winRate = ticketStats ? ticketStats.winRate : Number(t.winRate);
      const roi = ticketStats ? ticketStats.roi : Number(t.roi);
      const currentStreak = ticketStats ? ticketStats.currentStreak : (t.currentStreak ?? 0);
      const bestStreak = ticketStats ? ticketStats.bestStreak : (t.bestStreak ?? 0);

      return {
        id: t.id,
        username: t.username,
        display_name: t.displayName,
        avatar_url: t.avatarUrl,
        bio: t.bio,
        is_ai: t.isAi,
        total_predictions: totalPredictions,
        total_wins: totalWins,
        total_losses: totalLosses,
        win_rate: winRate,
        roi: roi,
        current_streak: currentStreak,
        best_streak: bestStreak,
        total_profit: Number(t.totalProfit),
        avg_odds: Number(t.avgOdds),
        leaderboard_rank: t.leaderboardRank,
        follower_count: followerCountMap.get(t.id) ?? 0,
        is_following: followingSet.has(t.id),
        vip_package_id: t.userId != null ? vipPackageMap.get(t.userId) ?? null : null,
      };
    });

    const sortCol = options.sortBy || 'roi';
    const asc = options.order === 'asc';
    mapped.sort((a, b) => {
      const tierA = tipsterListingActivityTier(a);
      const tierB = tipsterListingActivityTier(b);
      if (tierA !== tierB) return tierA - tierB;
      const aVal = Number(a[sortCol as keyof typeof a] ?? 0);
      const bVal = Number(b[sortCol as keyof typeof b] ?? 0);
      const cmp = asc ? aVal - bVal : bVal - aVal;
      if (cmp !== 0) return cmp;
      return (b.follower_count ?? 0) - (a.follower_count ?? 0);
    });

    const sliced = mapped.slice(0, options.limit);
    let rankCounter = 0;
    return sliced.map((row) => ({
      ...row,
      leaderboard_rank: tipsterListingActivityTier(row) === 0 ? ++rankCounter : null,
    }));
  }

  /** Public: active tipster usernames for sitemap generation (no stats payload). */
  async listActiveTipsterUsernames(): Promise<{ usernames: string[] }> {
    const rows = await this.tipsterRepo
      .createQueryBuilder('t')
      .leftJoin(User, 'u', 'u.id = t.userId')
      .select('t.username', 'username')
      .where('t.isActive = :active', { active: true })
      .andWhere('(t.isAi = true OR t.userId IS NOT NULL)')
      .andWhere('(t.isAi = true OR (t.userId IS NOT NULL AND u.status = :userActive))', {
        userActive: UserStatus.ACTIVE,
      })
      .orderBy('t.username', 'ASC')
      .getRawMany<{ username: string }>();
    return { usernames: rows.map((r) => r.username) };
  }

  async getTipsterProfile(username: string, window: TipsterProfilePerformanceWindow) {
    const tipster = await this.tipsterRepo.findOne({
      where: { username },
    });
    if (!tipster) return null;

    if (tipster.userId != null) {
      const owner = await this.usersRepo.findOne({
        where: { id: tipster.userId },
        select: ['id', 'status'],
      });
      if (!owner || owner.status !== UserStatus.ACTIVE) {
        return null;
      }
    }

    const marketplaceCoupons = await this.getMarketplaceCouponsForTipster(username, window);

    let totalPredictions = tipster.totalPredictions;
    let totalWins = tipster.totalWins;
    let totalLosses = tipster.totalLosses;
    let winRate = Number(tipster.winRate);
    let roi = Number(tipster.roi);
    let currentStreak = tipster.currentStreak ?? 0;
    let bestStreak = tipster.bestStreak ?? 0;
    let avgOddsLive = Number(tipster.avgOdds);

    if (tipster.userId != null) {
      const mp = await this.computeMarketplaceProfileStats(tipster.userId, window);
      totalPredictions = mp.total;
      totalWins = mp.won;
      totalLosses = mp.lost;
      winRate = mp.winRate;
      roi = mp.roi;
      currentStreak = mp.currentStreak;
      bestStreak = mp.bestStreak;
      avgOddsLive = mp.avgOdds;
    }

    const performance = await this.tipsterRepo.query(
      `SELECT * FROM tipster_performance_log
       WHERE tipster_id = $1
       ORDER BY snapshot_date DESC
       LIMIT 30`,
      [tipster.id],
    );

    const followerCount = await this.followRepo.count({ where: { tipsterId: tipster.id } });
    const allTimeRankMap = await this.getAllTimeLeaderboardRankMap();
    const liveLeaderboardRank = allTimeRankMap.get(tipster.id) ?? null;
    const leaderboardRankForResponse =
      window.kind === 'settlement_period' && window.period === 'all' ? liveLeaderboardRank : null;

    return {
      tipster: {
        id: tipster.id,
        user_id: tipster.userId,
        username: tipster.username,
        display_name: tipster.displayName,
        avatar_url: tipster.avatarUrl,
        bio: tipster.bio,
        is_ai: tipster.isAi,
        tipster_type: tipster.tipsterType,
        personality_profile: tipster.personalityProfile,
        total_predictions: totalPredictions,
        total_wins: totalWins,
        total_losses: totalLosses,
        win_rate: winRate,
        roi: roi,
        current_streak: currentStreak,
        best_streak: bestStreak,
        total_profit: Number(tipster.totalProfit),
        avg_odds: avgOddsLive,
        leaderboard_rank: leaderboardRankForResponse,
        follower_count: followerCount,
        last_prediction_date: tipster.lastPredictionDate,
        join_date: tipster.joinDate,
        is_active: tipster.isActive,
      },
      marketplace_coupons: marketplaceCoupons,
      archived_coupons: await this.getArchivedCouponsForTipster(username, window),
      archived_settled_count: await this.getArchivedSettledCount(username, window),
      performance_history: performance,
      performance_period: window.kind === 'settlement_period' ? window.period : null,
      posted_date_range: window.kind === 'posted_between' ? { from: window.from, to: window.to } : null,
    };
  }

  /** Total count of settled marketplace coupons in the selected window. */
  async getArchivedSettledCount(username: string, window: TipsterProfilePerformanceWindow): Promise<number> {
    const tipster = await this.tipsterRepo.findOne({ where: { username }, select: ['userId'] });
    if (!tipster?.userId) return 0;
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .where('t.userId = :uid', { uid: tipster.userId })
      .andWhere('t.isMarketplace = :im', { im: true })
      .andWhere('t.result IN (:...r)', { r: ['won', 'lost', 'void'] });
    this.applyTipsterProfileWindowOnTicket(qb, window);
    return qb.getCount();
  }

  /** Settled marketplace coupons for archive; limited to 50 most recent in the selected window. */
  async getArchivedCouponsForTipster(username: string, window: TipsterProfilePerformanceWindow) {
    const tipster = await this.tipsterRepo.findOne({ where: { username } });
    if (!tipster?.userId) return [];

    const mp = await this.computeMarketplaceProfileStats(tipster.userId, window);
    const winRate = mp.winRate;
    const totalPredictions = mp.total;
    const totalWins = mp.won;
    const totalLosses = mp.lost;

    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.picks', 'p')
      .where('t.userId = :uid', { uid: tipster.userId })
      .andWhere('t.isMarketplace = :im', { im: true })
      .andWhere('t.result IN (:...r)', { r: ['won', 'lost', 'void'] });
    this.applyTipsterProfileWindowOnTicket(qb, window);
    const tickets = await qb.orderBy('t.updatedAt', 'DESC').take(50).getMany();

    const validTickets = tickets.filter((t) => t.picks?.length);
    const user = await this.usersRepo.findOne({
      where: { id: tipster.userId },
      select: ['id', 'displayName', 'username', 'avatar'],
    });
    const allTimeRankMap = await this.getAllTimeLeaderboardRankMap();
    const liveRank =
      window.kind === 'settlement_period' && window.period === 'all' ? allTimeRankMap.get(tipster.id) ?? null : null;

    // Enrich picks with fixture scores (FT scoreline) for settled coupons
    const fixtureIds = [...new Set(validTickets.flatMap((t) => (t.picks || []).map((p) => p.fixtureId).filter(Boolean) as number[]))];
    const fixtures = fixtureIds.length > 0
      ? await this.fixtureRepo.find({ where: { id: In(fixtureIds) }, select: ['id', 'homeScore', 'awayScore', 'status'] })
      : [];
    const fixtureMap = new Map(fixtures.map((f) => [f.id, f]));

    return validTickets.map((ticket) => ({
      ...ticket,
      picks: (ticket.picks || []).map((p: AccumulatorPick & { fixtureId?: number | null }) => {
        const fix = p.fixtureId ? fixtureMap.get(p.fixtureId) : null;
        return {
          ...p,
          homeScore: fix?.homeScore ?? null,
          awayScore: fix?.awayScore ?? null,
          fixtureStatus: fix?.status ?? null,
          status: p.result || 'pending',
        };
      }),
      price: Number(ticket.price),
      purchaseCount: 0,
      tipster: user
        ? {
            id: user.id,
            displayName: user.displayName,
            username: user.username,
            avatarUrl: user.avatar ?? tipster.avatarUrl,
            isAi: !!tipster.isAi,
            winRate,
            totalPicks: totalPredictions,
            wonPicks: totalWins,
            lostPicks: totalLosses,
            rank: liveRank,
          }
        : null,
    }));
  }

  /** Marketplace coupons for this tipster only. Deduplicated, same format as marketplace. */
  async getMarketplaceCouponsForTipster(username: string, window: TipsterProfilePerformanceWindow) {
    const tipster = await this.tipsterRepo.findOne({ where: { username } });
    if (!tipster?.userId) return [];

    const mp = await this.computeMarketplaceProfileStats(tipster.userId, window);
    const winRate = mp.winRate;
    const totalPredictions = mp.total;
    const totalWins = mp.won;
    const totalLosses = mp.lost;

    const rows = await this.marketplaceRepo.find({
      where: { status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount'],
    });
    const accIds = rows.map((r) => r.accumulatorId);
    if (accIds.length === 0) return [];

    // Only show tickets that are still unsettled (result = pending). Settled tickets appear in Archive.
    const tqb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.picks', 'p')
      .where('t.id IN (:...ids)', { ids: accIds })
      .andWhere('t.userId = :uid', { uid: tipster.userId })
      .andWhere('t.result = :pend', { pend: 'pending' })
      .andWhere('t.isMarketplace = :im', { im: true });
    if (window.kind === 'posted_between') {
      tqb.andWhere('t.createdAt >= :__pa0', { __pa0: window.startUtc });
      tqb.andWhere('t.createdAt < :__pa1', { __pa1: window.endExclusiveUtc });
    }
    const tickets = await tqb.orderBy('t.createdAt', 'DESC').getMany();

    // Include all marketplace coupons (upcoming + started/settled) so picks show on profile
    const validTickets = tickets.filter((t) => t.picks?.length);

    const seen = new Set<string>();
    const deduped: typeof validTickets = [];
    for (const t of validTickets) {
      const fp = t.picks?.map((p) => `${p.fixtureId}:${p.prediction}:${Number(p.odds)}`).sort().join('|') ?? '';
      if (fp && seen.has(fp)) continue;
      if (fp) seen.add(fp);
      deduped.push(t);
    }

    const user = await this.usersRepo.findOne({
      where: { id: tipster.userId },
      select: ['id', 'displayName', 'username', 'avatar'],
    });
    const priceMap = new Map(rows.map((r) => [r.accumulatorId, Number(r.price)]));
    const purchaseCountMap = new Map(rows.map((r) => [r.accumulatorId, r.purchaseCount || 0]));
    const allTimeRankMap = await this.getAllTimeLeaderboardRankMap();
    const liveRank =
      window.kind === 'settlement_period' && window.period === 'all' ? allTimeRankMap.get(tipster.id) ?? null : null;

    return deduped.map((ticket) => ({
      ...ticket,
      price: priceMap.get(ticket.id) ?? 0,
      purchaseCount: purchaseCountMap.get(ticket.id) ?? 0,
      tipster: user
        ? {
            id: user.id,
            displayName: user.displayName,
            username: user.username,
            avatarUrl: user.avatar ?? tipster.avatarUrl,
            isAi: !!tipster.isAi,
            winRate,
            totalPicks: totalPredictions,
            wonPicks: totalWins,
            lostPicks: totalLosses,
            rank: liveRank,
          }
        : null,
    }));
  }

  async getLeaderboard(options: {
    period: 'all_time' | 'monthly' | 'weekly';
    limit: number;
    sport?: string;
  }) {
    if (options.period === 'all_time') {
      const { tipsters, sorted: sortedAll } = await this.computeAllTimeLeaderboardSortedEntries(options.sport);
      const sorted = sortedAll.slice(0, options.limit);
      const ranked = sorted.map((e, i) => ({ ...e, rank: i + 1 }));

      const tipsterUserIds = ranked
        .map((e) => tipsters.find((t) => t.username === e.username)?.userId)
        .filter((id): id is number => id != null);
      const vipMap = await this.loadActiveVipPackageIdsByUserIds([...new Set(tipsterUserIds)]);
      const withVip = ranked.map((e) => {
        const uid = tipsters.find((t) => t.username === e.username)?.userId;
        return { ...e, vip_package_id: uid != null ? vipMap.get(uid) ?? null : null };
      });

      if (tipsterUserIds.length > 0) {
        try {
          const revRows: Array<{ tipster_id: number; avg: string; cnt: string }> = await this.tipsterRepo.query(
            `SELECT tipster_id, AVG(rating)::numeric(3,1) AS avg, COUNT(*) AS cnt
             FROM coupon_reviews WHERE tipster_id = ANY($1) GROUP BY tipster_id`,
            [tipsterUserIds],
          );
          const revMap = new Map(revRows.map((r) => [Number(r.tipster_id), { avg: Number(r.avg), cnt: Number(r.cnt) }]));
          return withVip.map((e) => {
            const uid = tipsters.find((t) => t.username === e.username)?.userId;
            const rv = uid != null ? revMap.get(uid) : undefined;
            return { ...e, avg_rating: rv?.avg ?? null, review_count: rv?.cnt ?? null };
          });
        } catch { /* coupon_reviews not yet available */ }
      }
      return withVip;
    }

    // Human: coupon **posted** in the calendar window (created_at), not last touch (updated_at).
    // Half-open [start, end) so "this week/month" does not include future or spill past the period.
    const dateFilter =
      options.period === 'monthly'
        ? "at.created_at >= DATE_TRUNC('month', CURRENT_DATE) AND at.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'"
        : "at.created_at >= DATE_TRUNC('week', CURRENT_DATE) AND at.created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'";

    // AI tipsters: from predictions. Human tipsters: from accumulator_tickets.
    const predDateFilter =
      options.period === 'monthly'
        ? "p.prediction_date >= DATE_TRUNC('month', CURRENT_DATE) AND p.prediction_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'"
        : "p.prediction_date >= DATE_TRUNC('week', CURRENT_DATE) AND p.prediction_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'";

    const sportDisplayFilter = options.sport
      ? `AND LOWER(at.sport) = LOWER('${options.sport.charAt(0).toUpperCase() + options.sport.slice(1).replace('_', ' ')}')`
      : '';

    const [aiRows, humanRows] = await Promise.all([
      this.tipsterRepo.query(
        `SELECT t.id, t.username, t.display_name, t.avatar_url,
          COUNT(p.id)::int as cnt,
          SUM(CASE WHEN p.status = 'won' THEN 1 ELSE 0 END)::int as wins,
          COALESCE(SUM(p.actual_result), 0)::float as profit
         FROM tipsters t
         LEFT JOIN predictions p ON t.id = p.tipster_id AND ${predDateFilter}
         WHERE t.is_active = true
         AND (
           t.is_ai = true
           OR EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id AND u.status = 'active')
         )
         GROUP BY t.id, t.username, t.display_name, t.avatar_url`,
        [],
      ),
      this.tipsterRepo.query(
        `SELECT t.id, t.username, t.display_name, t.avatar_url,
          COUNT(at.id)::int as cnt,
          SUM(CASE WHEN at.result = 'won' THEN 1 ELSE 0 END)::int as wins,
          COALESCE(SUM(CASE WHEN at.result = 'won' THEN at.total_odds - 1 ELSE -1 END), 0)::float as profit
         FROM tipsters t
         INNER JOIN users u ON u.id = t.user_id AND u.status = 'active'
         INNER JOIN accumulator_tickets at ON at.user_id = t.user_id
           AND at.result IN ('won', 'lost') AND ${dateFilter} ${sportDisplayFilter}
         WHERE t.is_active = true AND t.user_id IS NOT NULL
         GROUP BY t.id, t.username, t.display_name, t.avatar_url`,
        [],
      ),
    ]);

    const merged = new Map<number, { id: number; username: string; display_name: string; avatar_url: string | null; cnt: number; wins: number; profit: number }>();
    for (const r of aiRows) {
      merged.set(r.id, {
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        cnt: Number(r.cnt ?? 0),
        wins: Number(r.wins ?? 0),
        profit: parseFloat(r.profit ?? 0),
      });
    }
    for (const r of humanRows) {
      const existing = merged.get(r.id);
      if (existing) {
        existing.cnt += Number(r.cnt ?? 0);
        existing.wins += Number(r.wins ?? 0);
        existing.profit += parseFloat(r.profit ?? 0);
      } else {
        merged.set(r.id, {
          id: r.id,
          username: r.username,
          display_name: r.display_name,
          avatar_url: r.avatar_url,
          cnt: Number(r.cnt ?? 0),
          wins: Number(r.wins ?? 0),
          profit: parseFloat(r.profit ?? 0),
        });
      }
    }

    const candidates = Array.from(merged.values()).filter((e) => e.cnt > 0 || e.profit !== 0);
    const tipsterIds = candidates.map((e) => e.id);
    const tipsterRows =
      tipsterIds.length > 0
        ? await this.tipsterRepo.find({
            where: { id: In(tipsterIds) },
            select: ['id', 'userId', 'isAi'],
          })
        : [];
    const idToUserId = new Map(tipsterRows.map((t) => [t.id, t.userId]));
    const idToIsAi = new Map(tipsterRows.map((t) => [t.id, !!t.isAi]));
    const humanUserIds = [...new Set(tipsterRows.map((t) => t.userId).filter((id): id is number => id != null))];
    const periodTicketStats = await this.computeStatsFromTicketsInPeriod(humanUserIds, options.period, options.sport);

    const enriched = candidates.map((r) => {
      const userId = idToUserId.get(r.id) ?? null;
      const human = userId != null ? periodTicketStats.get(userId) : undefined;
      if (human && human.total > 0) {
        return {
          ...r,
          roi: human.roi,
          win_rate: human.winRate,
          total_predictions: human.total,
          total_wins: human.won,
          total_losses: human.lost,
        };
      }
      const settled = r.cnt;
      const wins = r.wins;
      const losses = Math.max(0, settled - wins);
      const winRate = settled > 0 ? (wins / settled) * 100 : 0;
      const roi = settled > 0 ? (r.profit / settled) * 100 : 0;
      return {
        ...r,
        roi,
        win_rate: winRate,
        total_predictions: settled,
        total_wins: wins,
        total_losses: losses,
      };
    });

    const withSettled = enriched.filter((r) => settledPickCount(r) > 0);
    const minPrimary =
      options.period === 'weekly'
        ? LEADERBOARD_MIN_SETTLED_WEEKLY
        : LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING;
    const primary = withSettled.filter((r) => settledPickCount(r) >= minPrimary).sort(compareLeaderboardRows);
    const secondary = withSettled.filter((r) => settledPickCount(r) < minPrimary).sort(compareLeaderboardRows);
    const sorted = [...primary, ...secondary].slice(0, options.limit);

    const periodVipUids = [
      ...new Set(sorted.map((r) => idToUserId.get(r.id)).filter((id): id is number => id != null)),
    ];
    const periodVipMap = await this.loadActiveVipPackageIdsByUserIds(periodVipUids);

    return sorted.map((r, i) => {
      const uid = idToUserId.get(r.id) ?? null;
      return {
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        is_ai: idToIsAi.get(r.id) ?? false,
        roi: r.roi,
        win_rate: r.win_rate,
        total_predictions: r.total_predictions,
        total_wins: r.total_wins,
        total_losses: r.total_losses,
        monthly_predictions: r.total_predictions,
        monthly_wins: r.total_wins,
        monthly_profit: r.profit,
        rank: i + 1,
        vip_package_id: uid != null ? periodVipMap.get(uid) ?? null : null,
      };
    });
  }

  /** Feed of marketplace picks from tipsters the user follows (for dashboard) */
  async getFeedFromFollowedTipsters(userId: number, limit = 20, offset = 0) {
    const follows = await this.followRepo.find({
      where: { userId },
      select: ['tipsterId'],
    });
    const tipsterIds = follows.map((f) => f.tipsterId);
    if (tipsterIds.length === 0) return [];

    const tipsters = await this.tipsterRepo.find({
      where: { id: In(tipsterIds) },
      select: ['id', 'userId', 'username', 'displayName', 'avatarUrl', 'winRate', 'isAi'],
    });
    const followedUserIds = tipsters.filter((t) => t.userId != null).map((t) => t.userId!);
    if (followedUserIds.length === 0) return [];

    const allTimeRankMap = await this.getAllTimeLeaderboardRankMap();

    const tickets = await this.ticketRepo.find({
      where: {
        userId: In(followedUserIds),
        status: 'active',
        isMarketplace: true,
      },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const listingRows = await this.marketplaceRepo.find({
      where: { accumulatorId: In(tickets.map((t) => t.id)), status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount', 'status'],
    });
    const priceMap = new Map(listingRows.map((r) => [r.accumulatorId, Number(r.price)]));
    const purchaseMap = new Map(listingRows.map((r) => [r.accumulatorId, r.purchaseCount || 0]));
    const rowByAccId = new Map(listingRows.map((r) => [r.accumulatorId, r]));

    const userMap = new Map<
      number,
      {
        displayName: string;
        username: string;
        avatarUrl: string | null;
        winRate: number;
        rank: number | null;
        isAi: boolean;
      }
    >();
    for (const t of tipsters) {
      if (t.userId) {
        userMap.set(t.userId, {
          displayName: t.displayName,
          username: t.username,
          avatarUrl: t.avatarUrl,
          winRate: Number(t.winRate),
          rank: allTimeRankMap.get(t.id) ?? null,
          isAi: !!t.isAi,
        });
      }
    }

    const ticketStatsMap = await this.computeStatsFromTickets(followedUserIds);

    const enrichedTickets = await this.accumulatorsService.enrichPicksWithFixtureScores(tickets);
    const filtered = enrichedTickets.filter((t) => t.picks?.length);

    return Promise.all(
      filtered.map(async (ticket) => {
        const row = rowByAccId.get(ticket.id) ?? null;
        const { picks, picksRevealed, accessViaSubscription } =
          await this.accumulatorsService.applyViewerPickVisibilityForTicket(
            ticket,
            row,
            userId,
            (ticket.picks ?? []) as unknown[],
          );

        const tipsterUser = userMap.get(ticket.userId!);
        const stats = ticketStatsMap.get(ticket.userId!);
        const totalPicks = stats?.total ?? 0;
        const wonPicks = stats?.won ?? 0;
        const lostPicks = stats?.lost ?? 0;
        const winRate = stats?.winRate ?? (tipsterUser?.winRate ?? 0);
        return {
          id: ticket.id,
          title: ticket.title,
          totalPicks: ticket.picks?.length ?? 0,
          totalOdds: Number(ticket.totalOdds),
          price: priceMap.get(ticket.id) ?? 0,
          purchaseCount: purchaseMap.get(ticket.id) ?? 0,
          status: ticket.status,
          result: ticket.result,
          picks,
          picksRevealed,
          ...(accessViaSubscription ? { accessViaSubscription: true } : {}),
          tipster: tipsterUser
            ? {
                id: 0,
                displayName: tipsterUser.displayName,
                username: tipsterUser.username,
                avatarUrl: tipsterUser.avatarUrl,
                isAi: tipsterUser.isAi,
                winRate,
                totalPicks,
                wonPicks,
                lostPicks,
                rank: tipsterUser.rank,
              }
            : null,
          createdAt: ticket.createdAt,
        };
      }),
    );
  }
}
