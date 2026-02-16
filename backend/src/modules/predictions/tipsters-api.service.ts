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

const SORT_COLUMNS: Record<string, string> = {
  roi: 'roi',
  win_rate: 'winRate',
  total_profit: 'totalProfit',
  total_predictions: 'totalPredictions',
};

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
  ) {}

  async getTipsters(options: {
    limit: number;
    sortBy: string;
    order: 'asc' | 'desc';
    isAi?: boolean;
    userId?: number;
    search?: string;
  }) {
    const qb = this.tipsterRepo
      .createQueryBuilder('t')
      .where('t.isActive = :active', { active: true })
      .select([
        't.id',
        't.username',
        't.displayName',
        't.avatarUrl',
        't.bio',
        't.isAi',
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
      .take(options.limit);

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
    return tipsters.map((t) => ({
      id: t.id,
      username: t.username,
      display_name: t.displayName,
      avatar_url: t.avatarUrl,
      bio: t.bio,
      is_ai: t.isAi,
      total_predictions: t.totalPredictions,
      total_wins: t.totalWins,
      total_losses: t.totalLosses,
      win_rate: Number(t.winRate),
      roi: Number(t.roi),
      current_streak: t.currentStreak,
      best_streak: t.bestStreak,
      total_profit: Number(t.totalProfit),
      avg_odds: Number(t.avgOdds),
      leaderboard_rank: t.leaderboardRank,
      is_following: followingSet.has(t.id),
    }));
  }

  async getTipsterProfile(username: string) {
    const tipster = await this.tipsterRepo.findOne({
      where: { username },
    });
    if (!tipster) return null;

    const marketplaceCoupons = await this.getMarketplaceCouponsForTipster(username);

    const performance = await this.tipsterRepo.query(
      `SELECT * FROM tipster_performance_log
       WHERE tipster_id = $1
       ORDER BY snapshot_date DESC
       LIMIT 30`,
      [tipster.id],
    );

    return {
      tipster: {
        id: tipster.id,
        username: tipster.username,
        display_name: tipster.displayName,
        avatar_url: tipster.avatarUrl,
        bio: tipster.bio,
        is_ai: tipster.isAi,
        tipster_type: tipster.tipsterType,
        personality_profile: tipster.personalityProfile,
        total_predictions: tipster.totalPredictions,
        total_wins: tipster.totalWins,
        total_losses: tipster.totalLosses,
        win_rate: Number(tipster.winRate),
        roi: Number(tipster.roi),
        current_streak: tipster.currentStreak,
        best_streak: tipster.bestStreak,
        total_profit: Number(tipster.totalProfit),
        avg_odds: Number(tipster.avgOdds),
        leaderboard_rank: tipster.leaderboardRank,
        last_prediction_date: tipster.lastPredictionDate,
        join_date: tipster.joinDate,
        is_active: tipster.isActive,
      },
      marketplace_coupons: marketplaceCoupons,
      performance_history: performance,
    };
  }

  /** Marketplace coupons for this tipster only. Deduplicated, same format as marketplace. */
  async getMarketplaceCouponsForTipster(username: string) {
    const tipster = await this.tipsterRepo.findOne({ where: { username } });
    if (!tipster?.userId) return [];

    const rows = await this.marketplaceRepo.find({
      where: { status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount'],
    });
    const accIds = rows.map((r) => r.accumulatorId);
    if (accIds.length === 0) return [];

    const tickets = await this.ticketRepo.find({
      where: {
        id: In(accIds),
        userId: tipster.userId,
        status: 'active',
        result: 'pending',
        isMarketplace: true,
      },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const validTickets = tickets.filter((t) => {
      if (!t.picks?.length) return false;
      const hasStarted = t.picks.some((p) => p.matchDate && new Date(p.matchDate) <= now);
      return !hasStarted;
    });

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
            winRate: Number(tipster.winRate),
            totalPicks: tipster.totalPredictions,
            wonPicks: tipster.totalWins,
            lostPicks: tipster.totalLosses,
            rank: tipster.leaderboardRank ?? 0,
          }
        : null,
    }));
  }

  async getLeaderboard(options: {
    period: 'all_time' | 'monthly' | 'weekly';
    limit: number;
  }) {
    if (options.period === 'all_time') {
      const tipsters = await this.tipsterRepo.find({
        where: { isActive: true },
        order: { roi: 'DESC' },
        take: options.limit,
      });
      return tipsters.map((t) => ({
        id: t.id,
        username: t.username,
        display_name: t.displayName,
        avatar_url: t.avatarUrl,
        roi: Number(t.roi),
        win_rate: Number(t.winRate),
        total_predictions: t.totalPredictions,
        total_wins: t.totalWins,
        total_losses: t.totalLosses,
        total_profit: Number(t.totalProfit),
        leaderboard_rank: t.leaderboardRank,
      }));
    }

    const dateFilter =
      options.period === 'monthly'
        ? "p.prediction_date >= DATE_TRUNC('month', CURRENT_DATE)"
        : "p.prediction_date >= DATE_TRUNC('week', CURRENT_DATE)";

    const rows = await this.tipsterRepo.query(
      `SELECT 
        t.id, t.username, t.display_name, t.avatar_url,
        COUNT(p.id)::int as monthly_predictions,
        SUM(CASE WHEN p.status = 'won' THEN 1 ELSE 0 END)::int as monthly_wins,
        COALESCE(SUM(p.actual_result), 0)::float as monthly_profit
      FROM tipsters t
      LEFT JOIN predictions p ON t.id = p.tipster_id AND ${dateFilter}
      WHERE t.is_active = true
      GROUP BY t.id, t.username, t.display_name, t.avatar_url
      ORDER BY monthly_profit DESC NULLS LAST
      LIMIT $1`,
      [options.limit],
    );

    return rows.map((r: any, i: number) => ({
      id: r.id,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      monthly_predictions: r.monthly_predictions ?? 0,
      monthly_wins: r.monthly_wins ?? 0,
      monthly_profit: parseFloat(r.monthly_profit ?? 0),
      rank: i + 1,
    }));
  }
}
