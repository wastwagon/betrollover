import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tipster } from './entities/tipster.entity';
import { Prediction } from './entities/prediction.entity';
import { PredictionFixture } from './entities/prediction-fixture.entity';
import { TipsterFollow } from './entities/tipster-follow.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { PickMarketplace } from '../accumulators/entities/pick-marketplace.entity';
import { User } from '../users/entities/user.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';

const SORT_COLUMNS: Record<string, string> = {
  roi: 'roi',
  win_rate: 'winRate',
  total_profit: 'totalProfit',
  total_predictions: 'totalPredictions',
};

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
  ) {}

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

  /** Settled marketplace coupons in the current calendar week/month (same ROI basis as computeStatsFromTickets). */
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
      qb.andWhere("t.updated_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)");
    } else {
      qb.andWhere("t.updated_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP)");
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
   * Used after admin deletes a coupon to keep ROI, win rate, streak, etc. in sync.
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

    const oddsSum = tickets.reduce((s, t) => s + Number(t.totalOdds), 0);
    const avgOdds = totalPredictions > 0 ? oddsSum / totalPredictions : 0;

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
      .where('t.isActive = :active', { active: true })
      // Exclude orphaned human tipsters (user deleted; user_id set to null by ON DELETE SET NULL)
      .andWhere('(t.isAi = true OR t.userId IS NOT NULL)')
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

  async getTipsterProfile(username: string) {
    const tipster = await this.tipsterRepo.findOne({
      where: { username },
    });
    if (!tipster) return null;

    const marketplaceCoupons = await this.getMarketplaceCouponsForTipster(username);

    const ticketStats =
      tipster.userId != null ? (await this.computeStatsFromTickets([tipster.userId])).get(tipster.userId) : null;
    const totalPredictions = ticketStats ? ticketStats.total : tipster.totalPredictions;
    const totalWins = ticketStats ? ticketStats.won : tipster.totalWins;
    const totalLosses = ticketStats ? ticketStats.lost : tipster.totalLosses;
    const winRate = ticketStats ? ticketStats.winRate : Number(tipster.winRate);
    const roi = ticketStats ? ticketStats.roi : Number(tipster.roi);
    const currentStreak = ticketStats ? ticketStats.currentStreak : (tipster.currentStreak ?? 0);
    const bestStreak = ticketStats ? ticketStats.bestStreak : (tipster.bestStreak ?? 0);

    const performance = await this.tipsterRepo.query(
      `SELECT * FROM tipster_performance_log
       WHERE tipster_id = $1
       ORDER BY snapshot_date DESC
       LIMIT 30`,
      [tipster.id],
    );

    const followerCount = await this.followRepo.count({ where: { tipsterId: tipster.id } });

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
        avg_odds: Number(tipster.avgOdds),
        leaderboard_rank: tipster.leaderboardRank,
        follower_count: followerCount,
        last_prediction_date: tipster.lastPredictionDate,
        join_date: tipster.joinDate,
        is_active: tipster.isActive,
      },
      marketplace_coupons: marketplaceCoupons,
      archived_coupons: await this.getArchivedCouponsForTipster(username),
      archived_settled_count: await this.getArchivedSettledCount(username),
      performance_history: performance,
    };
  }

  /** Total count of settled (won/lost/void) marketplace coupons for this tipster. Used for Archive tab label. */
  async getArchivedSettledCount(username: string): Promise<number> {
    const tipster = await this.tipsterRepo.findOne({ where: { username }, select: ['userId'] });
    if (!tipster?.userId) return 0;
    return this.ticketRepo.count({
      where: {
        userId: tipster.userId,
        result: In(['won', 'lost', 'void']),
        isMarketplace: true,
      },
    });
  }

  /** Settled (won/lost/void) coupons for this tipster. For archive display. Limited to 50 most recent. */
  async getArchivedCouponsForTipster(username: string) {
    const tipster = await this.tipsterRepo.findOne({ where: { username } });
    if (!tipster?.userId) return [];

    const ticketStats = (await this.computeStatsFromTickets([tipster.userId])).get(tipster.userId);
    const winRate = ticketStats ? ticketStats.winRate : Number(tipster.winRate);
    const totalPredictions = ticketStats ? ticketStats.total : tipster.totalPredictions;
    const totalWins = ticketStats ? ticketStats.won : tipster.totalWins;
    const totalLosses = ticketStats ? ticketStats.lost : tipster.totalLosses;

    const tickets = await this.ticketRepo.find({
      where: {
        userId: tipster.userId,
        result: In(['won', 'lost', 'void']),
        isMarketplace: true,
      },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const validTickets = tickets.filter((t) => t.picks?.length);
    const user = await this.usersRepo.findOne({
      where: { id: tipster.userId },
      select: ['id', 'displayName', 'username', 'avatar'],
    });

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
            winRate,
            totalPicks: totalPredictions,
            wonPicks: totalWins,
            lostPicks: totalLosses,
            rank: tipster.leaderboardRank ?? 0,
          }
        : null,
    }));
  }

  /** Marketplace coupons for this tipster only. Deduplicated, same format as marketplace. Uses computed stats from accumulator_tickets. */
  async getMarketplaceCouponsForTipster(username: string) {
    const tipster = await this.tipsterRepo.findOne({ where: { username } });
    if (!tipster?.userId) return [];

    const ticketStats = (await this.computeStatsFromTickets([tipster.userId])).get(tipster.userId);
    const winRate = ticketStats ? ticketStats.winRate : Number(tipster.winRate);
    const totalPredictions = ticketStats ? ticketStats.total : tipster.totalPredictions;
    const totalWins = ticketStats ? ticketStats.won : tipster.totalWins;
    const totalLosses = ticketStats ? ticketStats.lost : tipster.totalLosses;

    const rows = await this.marketplaceRepo.find({
      where: { status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount'],
    });
    const accIds = rows.map((r) => r.accumulatorId);
    if (accIds.length === 0) return [];

    // Only show tickets that are still unsettled (result = pending). Settled tickets appear in Archive.
    const tickets = await this.ticketRepo.find({
      where: {
        id: In(accIds),
        userId: tipster.userId,
        result: 'pending',
        isMarketplace: true,
      },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });

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
            winRate,
            totalPicks: totalPredictions,
            wonPicks: totalWins,
            lostPicks: totalLosses,
            rank: tipster.leaderboardRank ?? 0,
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
      const tipsters = await this.tipsterRepo.find({
        where: { isActive: true },
        select: ['id', 'username', 'displayName', 'avatarUrl', 'userId', 'totalPredictions', 'totalWins', 'totalLosses', 'winRate', 'roi', 'totalProfit', 'leaderboardRank'],
      });
      const humanUserIds = tipsters.filter((t) => t.userId != null).map((t) => t.userId!);
      const ticketStatsMap = await this.computeStatsFromTickets(humanUserIds, options.sport);

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
          roi,
          win_rate: winRate,
          total_predictions: totalPredictions,
          total_wins: totalWins,
          total_losses: totalLosses,
          total_profit: Number(t.totalProfit),
          leaderboard_rank: t.leaderboardRank,
        };
      });

      const sorted = entries
        .filter((e) => (e.total_wins ?? 0) + (e.total_losses ?? 0) > 0)
        .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
        .slice(0, options.limit);

      const ranked = sorted.map((e, i) => ({ ...e, rank: i + 1 }));

      // Enrich with review averages (by user_id from tipster entity)
      const tipsterUserIds = ranked
        .map((e) => tipsters.find((t) => t.username === e.username)?.userId)
        .filter((id): id is number => id != null);
      if (tipsterUserIds.length > 0) {
        try {
          const revRows: Array<{ tipster_id: number; avg: string; cnt: string }> = await this.tipsterRepo.query(
            `SELECT tipster_id, AVG(rating)::numeric(3,1) AS avg, COUNT(*) AS cnt
             FROM coupon_reviews WHERE tipster_id = ANY($1) GROUP BY tipster_id`,
            [tipsterUserIds],
          );
          const revMap = new Map(revRows.map((r) => [Number(r.tipster_id), { avg: Number(r.avg), cnt: Number(r.cnt) }]));
          return ranked.map((e) => {
            const uid = tipsters.find((t) => t.username === e.username)?.userId;
            const rv = uid != null ? revMap.get(uid) : undefined;
            return { ...e, avg_rating: rv?.avg ?? null, review_count: rv?.cnt ?? null };
          });
        } catch { /* coupon_reviews not yet available */ }
      }
      return ranked;
    }

    const dateFilter =
      options.period === 'monthly'
        ? "at.updated_at >= DATE_TRUNC('month', CURRENT_DATE)"
        : "at.updated_at >= DATE_TRUNC('week', CURRENT_DATE)";

    // AI tipsters: from predictions. Human tipsters: from accumulator_tickets.
    const predDateFilter =
      options.period === 'monthly'
        ? "p.prediction_date >= DATE_TRUNC('month', CURRENT_DATE)"
        : "p.prediction_date >= DATE_TRUNC('week', CURRENT_DATE)";

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
         GROUP BY t.id, t.username, t.display_name, t.avatar_url`,
        [],
      ),
      this.tipsterRepo.query(
        `SELECT t.id, t.username, t.display_name, t.avatar_url,
          COUNT(at.id)::int as cnt,
          SUM(CASE WHEN at.result = 'won' THEN 1 ELSE 0 END)::int as wins,
          COALESCE(SUM(CASE WHEN at.result = 'won' THEN at.total_odds - 1 ELSE -1 END), 0)::float as profit
         FROM tipsters t
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
            select: ['id', 'userId'],
          })
        : [];
    const idToUserId = new Map(tipsterRows.map((t) => [t.id, t.userId]));
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

    const withSettled = enriched.filter((r) => (r.total_wins ?? 0) + (r.total_losses ?? 0) > 0);
    const sorted = withSettled
      .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0) || b.profit - a.profit || (b.win_rate ?? 0) - (a.win_rate ?? 0))
      .slice(0, options.limit);

    return sorted.map((r, i) => ({
      id: r.id,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      roi: r.roi,
      win_rate: r.win_rate,
      total_predictions: r.total_predictions,
      total_wins: r.total_wins,
      total_losses: r.total_losses,
      monthly_predictions: r.total_predictions,
      monthly_wins: r.total_wins,
      monthly_profit: r.profit,
      rank: i + 1,
    }));
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
      select: ['id', 'userId', 'username', 'displayName', 'avatarUrl', 'winRate', 'leaderboardRank'],
    });
    const followedUserIds = tipsters.filter((t) => t.userId != null).map((t) => t.userId!);
    if (followedUserIds.length === 0) return [];

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
      select: ['accumulatorId', 'price', 'purchaseCount'],
    });
    const priceMap = new Map(listingRows.map((r) => [r.accumulatorId, Number(r.price)]));
    const purchaseMap = new Map(listingRows.map((r) => [r.accumulatorId, r.purchaseCount || 0]));

    const userMap = new Map<number, { displayName: string; username: string; avatarUrl: string | null; winRate: number; rank: number }>();
    for (const t of tipsters) {
      if (t.userId) {
        userMap.set(t.userId, {
          displayName: t.displayName,
          username: t.username,
          avatarUrl: t.avatarUrl,
          winRate: Number(t.winRate),
          rank: t.leaderboardRank ?? 0,
        });
      }
    }

    const ticketStatsMap = await this.computeStatsFromTickets(followedUserIds);

    return tickets
      .filter((t) => t.picks?.length)
      .map((ticket) => {
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
          picks: ticket.picks ?? [],
          tipster: tipsterUser
            ? {
                id: 0,
                displayName: tipsterUser.displayName,
                username: tipsterUser.username,
                avatarUrl: tipsterUser.avatarUrl,
                winRate,
                totalPicks,
                wonPicks,
                lostPicks,
                rank: tipsterUser.rank,
              }
            : null,
          createdAt: ticket.createdAt,
        };
      });
  }
}
