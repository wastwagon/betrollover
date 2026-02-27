import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { UserPurchasedPick } from '../accumulators/entities/user-purchased-pick.entity';
import { PickMarketplace } from '../accumulators/entities/pick-marketplace.entity';
import { PickReaction } from '../accumulators/entities/pick-reaction.entity';
import { VisitorSession } from './entities/visitor-session.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { DepositRequest } from '../wallet/entities/deposit-request.entity';
import { WithdrawalRequest } from '../wallet/entities/withdrawal-request.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { Prediction } from '../predictions/entities/prediction.entity';
import { AnalyticsDaily } from './entities/analytics-daily.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(AccumulatorTicket)
    private ticketsRepo: Repository<AccumulatorTicket>,
    @InjectRepository(UserPurchasedPick)
    private purchasesRepo: Repository<UserPurchasedPick>,
    @InjectRepository(PickMarketplace)
    private marketplaceRepo: Repository<PickMarketplace>,
    @InjectRepository(PickReaction)
    private reactionRepo: Repository<PickReaction>,
    @InjectRepository(VisitorSession)
    private visitorRepo: Repository<VisitorSession>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(DepositRequest)
    private depositsRepo: Repository<DepositRequest>,
    @InjectRepository(WithdrawalRequest)
    private withdrawalsRepo: Repository<WithdrawalRequest>,
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(Prediction)
    private predictionRepo: Repository<Prediction>,
    @InjectRepository(AnalyticsDaily)
    private analyticsDailyRepo: Repository<AnalyticsDaily>,
  ) {}

  /** Fire-and-forget: increment errors count for today. Call from exception filter on 5xx. */
  incrementErrorsToday(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.analyticsDailyRepo.manager
      .query(
        `INSERT INTO analytics_daily (date, errors_count) VALUES ($1, 1)
         ON CONFLICT (date) DO UPDATE SET errors_count = analytics_daily.errors_count + 1`,
        [today],
      )
      .catch(() => {});
  }

  // Time-based analytics
  async getTimeSeriesData(startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month' = 'day') {
    const format = interval === 'day' ? 'YYYY-MM-DD' : interval === 'week' ? 'YYYY-"W"WW' : 'YYYY-MM';
    
    const [users, picks, purchases, revenue, deposits, withdrawals] = await Promise.all([
      this.usersRepo
        .createQueryBuilder('u')
        .select(`TO_CHAR(u.createdAt, '${format}')`, 'date')
        .addSelect('COUNT(*)', 'count')
        .where('u.createdAt >= :startDate', { startDate })
        .andWhere('u.createdAt <= :endDate', { endDate })
        .andWhere('u.role != :role', { role: UserRole.ADMIN })
        .groupBy(`TO_CHAR(u.createdAt, '${format}')`)
        .orderBy('date', 'ASC')
        .getRawMany(),
      
      (async () => {
        const [ticketRows, predRows] = await Promise.all([
          this.ticketsRepo
            .createQueryBuilder('t')
            .select(`TO_CHAR(t.createdAt, '${format}')`, 'date')
            .addSelect('COUNT(*)', 'count')
            .where('t.createdAt >= :startDate', { startDate })
            .andWhere('t.createdAt <= :endDate', { endDate })
            .groupBy(`TO_CHAR(t.createdAt, '${format}')`)
            .orderBy('date', 'ASC')
            .getRawMany(),
          this.predictionRepo
            .createQueryBuilder('p')
            .select(`TO_CHAR(p.createdAt, '${format}')`, 'date')
            .addSelect('COUNT(*)', 'count')
            .where('p.createdAt >= :startDate', { startDate })
            .andWhere('p.createdAt <= :endDate', { endDate })
            .groupBy(`TO_CHAR(p.createdAt, '${format}')`)
            .orderBy('date', 'ASC')
            .getRawMany(),
        ]);
        const dateMap = new Map<string, number>();
        for (const r of ticketRows) dateMap.set(r.date, (dateMap.get(r.date) || 0) + parseInt(r.count, 10));
        for (const r of predRows) dateMap.set(r.date, (dateMap.get(r.date) || 0) + parseInt(r.count, 10));
        return Array.from(dateMap.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
      })(),
      
      this.purchasesRepo
        .createQueryBuilder('p')
        .select(`TO_CHAR(p.purchasedAt, '${format}')`, 'date')
        .addSelect('COUNT(*)', 'count')
        .where('p.purchasedAt >= :startDate', { startDate })
        .andWhere('p.purchasedAt <= :endDate', { endDate })
        .groupBy(`TO_CHAR(p.purchasedAt, '${format}')`)
        .orderBy('date', 'ASC')
        .getRawMany(),
      
      this.purchasesRepo
        .createQueryBuilder('p')
        .select(`TO_CHAR(p.purchasedAt, '${format}')`, 'date')
        .addSelect('SUM(p.purchasePrice)', 'revenue')
        .where('p.purchasedAt >= :startDate', { startDate })
        .andWhere('p.purchasedAt <= :endDate', { endDate })
        .groupBy(`TO_CHAR(p.purchasedAt, '${format}')`)
        .orderBy('date', 'ASC')
        .getRawMany(),
      
      this.depositsRepo
        .createQueryBuilder('d')
        .select(`TO_CHAR(d.createdAt, '${format}')`, 'date')
        .addSelect('SUM(d.amount)', 'amount')
        .addSelect('COUNT(*)', 'count')
        .where('d.createdAt >= :startDate', { startDate })
        .andWhere('d.createdAt <= :endDate', { endDate })
        .andWhere('d.status = :status', { status: 'completed' })
        .groupBy(`TO_CHAR(d.createdAt, '${format}')`)
        .orderBy('date', 'ASC')
        .getRawMany(),
      
      this.withdrawalsRepo
        .createQueryBuilder('w')
        .select(`TO_CHAR(w.createdAt, '${format}')`, 'date')
        .addSelect('SUM(w.amount)', 'amount')
        .addSelect('COUNT(*)', 'count')
        .where('w.createdAt >= :startDate', { startDate })
        .andWhere('w.createdAt <= :endDate', { endDate })
        .andWhere('w.status = :status', { status: 'completed' })
        .groupBy(`TO_CHAR(w.createdAt, '${format}')`)
        .orderBy('date', 'ASC')
        .getRawMany(),
    ]);

    return {
      users: users.map((r) => ({ date: r.date, value: parseInt(r.count, 10) })),
      picks: picks as { date: string; value: number }[],
      purchases: purchases.map((r) => ({ date: r.date, value: parseInt(r.count, 10) })),
      revenue: revenue.map((r) => ({ date: r.date, value: parseFloat(r.revenue || '0') })),
      deposits: deposits.map((r) => ({ date: r.date, amount: parseFloat(r.amount || '0'), count: parseInt(r.count, 10) })),
      withdrawals: withdrawals.map((r) => ({ date: r.date, amount: parseFloat(r.amount || '0'), count: parseInt(r.count, 10) })),
    };
  }

  /**
   * Conversion funnel - user-centric metrics with correct % from previous step.
   * Each step shows unique users; rates are conversion from previous step (capped at 100%).
   */
  async getConversionFunnel() {
    const [
      totalUsers,
      registeredCount,
      contentCreatorsCount,
      sellersCount,
      buyersCount,
      totalPicks,
      totalListings,
      totalPurchases,
      uniqueVisitorsFromTracking,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: [{ role: UserRole.USER }, { role: UserRole.TIPSTER }] }),
      this.ticketsRepo
        .createQueryBuilder('t')
        .select('COUNT(DISTINCT t.userId)', 'count')
        .getRawOne()
        .then((r) => parseInt(r?.count || '0', 10)),
      this.marketplaceRepo
        .createQueryBuilder('m')
        .select('COUNT(DISTINCT m.sellerId)', 'count')
        .where('m.status = :status', { status: 'active' })
        .getRawOne()
        .then((r) => parseInt(r?.count || '0', 10)),
      this.purchasesRepo
        .createQueryBuilder('p')
        .select('COUNT(DISTINCT p.userId)', 'count')
        .getRawOne()
        .then((r) => parseInt(r?.count || '0', 10)),
      this.ticketsRepo.count(),
      this.marketplaceRepo.count({ where: { status: 'active' } }),
      this.purchasesRepo.count(),
      this.visitorRepo
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.sessionId)', 'count')
        .getRawOne()
        .then((r) => parseInt(r?.count || '0', 10)),
    ]);

    // Use tracked visitors only - no fallback to total users (keeps analytics realistic)
    const visitors = uniqueVisitorsFromTracking;
    const registered = registeredCount;
    const creators = contentCreatorsCount;
    const sellers = sellersCount;
    const buyers = buyersCount;

    // Each rate = current/previous * 100, capped at 100
    const rate = (curr: number, prev: number) =>
      prev > 0 ? Math.min(100, (curr / prev) * 100) : 0;

    return {
      visitors,
      registered,
      contentCreators: creators,
      marketplaceSellers: sellers,
      buyers,
      totalPicks,
      totalListings,
      totalPurchases,
      conversionRates: {
        registration: rate(registered, visitors),
        contentCreator: rate(creators, registered),
        seller: rate(sellers, creators > 0 ? creators : registered),
        buyer: rate(buyers, registered),
      },
    };
  }

  // User behavior analytics
  async getUserBehaviorAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [
      activeUsers,
      newUsers,
      returningUsers,
      avgPicksPerUser,
      avgPurchasesPerUser,
      topUsers,
    ] = await Promise.all([
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.lastLogin >= :date', { date: thirtyDaysAgo })
        .andWhere('u.role != :role', { role: UserRole.ADMIN })
        .getCount(),
      
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :date', { date: thirtyDaysAgo })
        .andWhere('u.role != :role', { role: UserRole.ADMIN })
        .getCount(),
      
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.lastLogin >= :date', { date: thirtyDaysAgo })
        .andWhere('u.createdAt < :date', { date: thirtyDaysAgo })
        .andWhere('u.role != :role', { role: UserRole.ADMIN })
        .getCount(),
      
      (async () => {
        const userCount = await this.ticketsRepo
          .createQueryBuilder('t')
          .select('COUNT(DISTINCT t.userId)', 'userCount')
          .getRawOne()
          .then((r) => parseInt(r?.userCount || '0', 10));
        const totalPicks = await this.ticketsRepo.count();
        return userCount > 0 ? totalPicks / userCount : 0;
      })(),
      
      (async () => {
        const userCount = await this.purchasesRepo
          .createQueryBuilder('p')
          .select('COUNT(DISTINCT p.userId)', 'userCount')
          .getRawOne()
          .then((r) => parseInt(r?.userCount || '0', 10));
        const totalPurchases = await this.purchasesRepo.count();
        return userCount > 0 ? totalPurchases / userCount : 0;
      })(),
      
      this.purchasesRepo
        .createQueryBuilder('p')
        .select('p.userId', 'userId')
        .addSelect('COUNT(*)', 'purchaseCount')
        .addSelect('SUM(p.purchasePrice)', 'totalSpent')
        .groupBy('p.userId')
        .orderBy('COUNT(*)', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    return {
      activeUsers,
      newUsers,
      returningUsers,
      avgPicksPerUser,
      avgPurchasesPerUser,
      topUsers: topUsers.map((u) => ({
        userId: u.userId,
        purchaseCount: parseInt(u.purchaseCount ?? (u as Record<string, string>).purchasecount ?? '0', 10),
        totalSpent: parseFloat(u.totalSpent ?? (u as Record<string, string>).totalspent ?? '0'),
      })),
    };
  }

  // Revenue analytics
  async getRevenueAnalytics(startDate?: Date, endDate?: Date) {
    const buildBaseQuery = () => {
      const qb = this.purchasesRepo.createQueryBuilder('p');
      if (startDate && endDate) {
        qb.where('p.purchasedAt >= :startDate', { startDate });
        qb.andWhere('p.purchasedAt <= :endDate', { endDate });
      }
      return qb;
    };

    const [
      totalRevenue,
      avgOrderValue,
      topSellingPicks,
      revenueByTipster,
      revenueTrend,
    ] = await Promise.all([
      buildBaseQuery()
        .select('SUM(p.purchasePrice)', 'total')
        .getRawOne()
        .then((r) => parseFloat(r?.total || '0')),
      
      buildBaseQuery()
        .select('AVG(p.purchasePrice)', 'avg')
        .getRawOne()
        .then((r) => parseFloat(r?.avg || '0')),
      
      buildBaseQuery()
        .select('p.accumulatorId', 'pickId')
        .addSelect('COUNT(*)', 'sales')
        .addSelect('SUM(p.purchasePrice)', 'revenue')
        .groupBy('p.accumulatorId')
        .orderBy('COUNT(*)', 'DESC')
        .limit(10)
        .getRawMany(),
      
      buildBaseQuery()
        .innerJoin('accumulator_tickets', 't', 't.id = p.accumulatorId')
        .select('t.userId', 'tipsterId')
        .addSelect('SUM(p.purchasePrice)', 'revenue')
        .addSelect('COUNT(*)', 'sales')
        .groupBy('t.userId')
        .orderBy('SUM(p.purchasePrice)', 'DESC')
        .limit(10)
        .getRawMany(),
      
      buildBaseQuery()
        .select('TO_CHAR(p.purchasedAt, \'YYYY-MM-DD\')', 'date')
        .addSelect('SUM(p.purchasePrice)', 'revenue')
        .addSelect('COUNT(*)', 'count')
        .groupBy('TO_CHAR(p.purchasedAt, \'YYYY-MM-DD\')')
        .orderBy('date', 'ASC')
        .limit(30)
        .getRawMany(),
    ]);

    return {
      totalRevenue,
      avgOrderValue,
      topSellingPicks: topSellingPicks.map((p) => ({
        pickId: p.pickId,
        sales: parseInt(p.sales, 10),
        revenue: parseFloat(p.revenue || '0'),
      })),
      revenueByTipster: revenueByTipster.map((r) => ({
        tipsterId: r.tipsterId,
        revenue: parseFloat(r.revenue || '0'),
        sales: parseInt(r.sales, 10),
      })),
      revenueTrend: revenueTrend.map((r) => ({
        date: r.date,
        revenue: parseFloat(r.revenue || '0'),
        count: parseInt(r.count, 10),
      })),
    };
  }

  // Pick performance analytics - uses accumulator_tickets + predictions (AI picks)
  async getPickPerformanceAnalytics() {
    const [
      ticketTotal,
      ticketWon,
      ticketLost,
      ticketPending,
      ticketAvgOdds,
      ticketTop,
      predTotal,
      predWon,
      predLost,
      predPending,
      predAvgOdds,
      predTop,
    ] = await Promise.all([
      this.ticketsRepo.count(),
      this.ticketsRepo.count({ where: { result: 'won' } }),
      this.ticketsRepo.count({ where: { result: 'lost' } }),
      this.ticketsRepo.count({ where: { result: 'pending' } }),
      this.ticketsRepo.createQueryBuilder('t').select('AVG(t.totalOdds)', 'avg').getRawOne().then((r) => parseFloat(r?.avg || '0')),
      this.ticketsRepo
        .createQueryBuilder('t')
        .innerJoin('tipsters', 'ts', 'ts.user_id = t.user_id')
        .select('ts.id', 'tipsterId')
        .addSelect('COUNT(*)', 'totalPicks')
        .addSelect('SUM(CASE WHEN t.result = \'won\' THEN 1 ELSE 0 END)', 'wonPicks')
        .addSelect('SUM(CASE WHEN t.result = \'lost\' THEN 1 ELSE 0 END)', 'lostPicks')
        .groupBy('ts.id')
        .orderBy('SUM(CASE WHEN t.result = \'won\' THEN 1 ELSE 0 END)', 'DESC')
        .limit(10)
        .getRawMany(),
      this.predictionRepo.count(),
      this.predictionRepo.count({ where: { status: 'won' } }),
      this.predictionRepo.count({ where: { status: 'lost' } }),
      this.predictionRepo.count({ where: { status: 'pending' } }),
      this.predictionRepo.createQueryBuilder('p').select('AVG(p.combinedOdds)', 'avg').getRawOne().then((r) => parseFloat(r?.avg || '0')),
      this.predictionRepo
        .createQueryBuilder('p')
        .select('p.tipsterId', 'tipsterId')
        .addSelect('COUNT(*)', 'totalPicks')
        .addSelect('SUM(CASE WHEN p.status = \'won\' THEN 1 ELSE 0 END)', 'wonPicks')
        .addSelect('SUM(CASE WHEN p.status = \'lost\' THEN 1 ELSE 0 END)', 'lostPicks')
        .groupBy('p.tipsterId')
        .orderBy('SUM(CASE WHEN p.status = \'won\' THEN 1 ELSE 0 END)', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    const totalPicks = ticketTotal + predTotal;
    const wonPicks = ticketWon + predWon;
    const lostPicks = ticketLost + predLost;
    const pendingPicks = ticketPending + predPending;
    const totalSettled = wonPicks + lostPicks;
    const avgOdds =
      totalPicks > 0
        ? (ticketAvgOdds * ticketTotal + predAvgOdds * predTotal) / totalPicks
        : 0;

    const performerMap = new Map<number, { totalPicks: number; wonPicks: number; lostPicks: number }>();
    for (const p of ticketTop) {
      performerMap.set(p.tipsterId, {
        totalPicks: parseInt(p.totalPicks, 10),
        wonPicks: parseInt(p.wonPicks, 10),
        lostPicks: parseInt(p.lostPicks, 10),
      });
    }
    for (const p of predTop) {
      const curr = { totalPicks: parseInt(p.totalPicks, 10), wonPicks: parseInt(p.wonPicks, 10), lostPicks: parseInt(p.lostPicks, 10) };
      const existing = performerMap.get(p.tipsterId);
      if (existing) {
        existing.totalPicks += curr.totalPicks;
        existing.wonPicks += curr.wonPicks;
        existing.lostPicks += curr.lostPicks;
      } else {
        performerMap.set(p.tipsterId, curr);
      }
    }
    const topPerformers = Array.from(performerMap.entries())
      .map(([tipsterId, s]) => ({
        tipsterId,
        totalPicks: s.totalPicks,
        wonPicks: s.wonPicks,
        lostPicks: s.lostPicks,
        winRate: s.wonPicks + s.lostPicks > 0 ? (s.wonPicks / (s.wonPicks + s.lostPicks)) * 100 : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10);

    return {
      totalPicks,
      wonPicks,
      lostPicks,
      pendingPicks,
      avgOdds,
      winRate: totalSettled > 0 ? (wonPicks / totalSettled) * 100 : 0,
      topPerformers,
    };
  }

  // Engagement metrics
  async getEngagementMetrics() {
    const [
      totalNotifications,
      readNotifications,
      avgNotificationsPerUser,
      activeTipsters,
      avgPicksPerTipster,
      totalReactions,
      totalViews,
    ] = await Promise.all([
      this.notificationsRepo.count(),
      this.notificationsRepo.count({ where: { isRead: true } }),
      
      this.notificationsRepo
        .createQueryBuilder('n')
        .select('AVG(notif_count)', 'avg')
        .from((qb) => {
          return qb
            .select('user_id', 'user_id')
            .addSelect('COUNT(*)', 'notif_count')
            .from('notifications', 'n2')
            .groupBy('user_id');
        }, 'sub')
        .getRawOne()
        .then((r) => parseFloat(r?.avg || '0')),
      
      this.tipsterRepo.count({ where: { isActive: true } }),
      
      (async () => {
        const [ticketCount, predCount, tipsterCount] = await Promise.all([
          this.ticketsRepo.count(),
          this.predictionRepo.count(),
          this.tipsterRepo.count({ where: { isActive: true } }),
        ]);
        const totalPicks = ticketCount + predCount;
        return tipsterCount > 0 ? totalPicks / tipsterCount : 0;
      })(),
      this.reactionRepo.count(),
      this.marketplaceRepo
        .createQueryBuilder('m')
        .select('COALESCE(SUM(m.viewCount), 0)', 'total')
        .getRawOne()
        .then((r) => parseInt(r?.total || '0', 10)),
    ]);

    return {
      totalNotifications,
      readNotifications,
      unreadNotifications: totalNotifications - readNotifications,
      readRate: totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0,
      avgNotificationsPerUser,
      activeTipsters,
      avgPicksPerTipster,
      totalReactions,
      totalViews,
    };
  }

  // Real-time stats
  async getRealTimeStats() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      users24h,
      users7d,
      users30d,
      picksResult,
      purchases24h,
      purchases7d,
      purchases30d,
      revenue24h,
      revenue7d,
      revenue30d,
    ] = await Promise.all([
      this.usersRepo.count({ where: { createdAt: MoreThanOrEqual(last24Hours), role: UserRole.USER } }),
      this.usersRepo.count({ where: { createdAt: MoreThanOrEqual(last7Days), role: UserRole.USER } }),
      this.usersRepo.count({ where: { createdAt: MoreThanOrEqual(last30Days), role: UserRole.USER } }),
      (async () => {
        const [t24, t7, t30, p24, p7, p30] = await Promise.all([
          this.ticketsRepo.count({ where: { createdAt: MoreThanOrEqual(last24Hours) } }),
          this.ticketsRepo.count({ where: { createdAt: MoreThanOrEqual(last7Days) } }),
          this.ticketsRepo.count({ where: { createdAt: MoreThanOrEqual(last30Days) } }),
          this.predictionRepo.count({ where: { createdAt: MoreThanOrEqual(last24Hours) } }),
          this.predictionRepo.count({ where: { createdAt: MoreThanOrEqual(last7Days) } }),
          this.predictionRepo.count({ where: { createdAt: MoreThanOrEqual(last30Days) } }),
        ]);
        return { last24h: t24 + p24, last7d: t7 + p7, last30d: t30 + p30 };
      })(),
      
      this.purchasesRepo.count({ where: { purchasedAt: MoreThanOrEqual(last24Hours) } }),
      this.purchasesRepo.count({ where: { purchasedAt: MoreThanOrEqual(last7Days) } }),
      this.purchasesRepo.count({ where: { purchasedAt: MoreThanOrEqual(last30Days) } }),
      
      this.purchasesRepo
        .createQueryBuilder('p')
        .select('SUM(p.purchasePrice)', 'total')
        .where('p.purchasedAt >= :date', { date: last24Hours })
        .getRawOne()
        .then((r) => parseFloat(r?.total || '0')),
      
      this.purchasesRepo
        .createQueryBuilder('p')
        .select('SUM(p.purchasePrice)', 'total')
        .where('p.purchasedAt >= :date', { date: last7Days })
        .getRawOne()
        .then((r) => parseFloat(r?.total || '0')),
      
      this.purchasesRepo
        .createQueryBuilder('p')
        .select('SUM(p.purchasePrice)', 'total')
        .where('p.purchasedAt >= :date', { date: last30Days })
        .getRawOne()
        .then((r) => parseFloat(r?.total || '0')),
    ]);

    return {
      users: { last24h: users24h, last7d: users7d, last30d: users30d },
      picks: { last24h: picksResult.last24h, last7d: picksResult.last7d, last30d: picksResult.last30d },
      purchases: { last24h: purchases24h, last7d: purchases7d, last30d: purchases30d },
      revenue: { last24h: revenue24h, last7d: revenue7d, last30d: revenue30d },
    };
  }

  /**
   * User cohorts - signups by week
   */
  async getUserCohorts(days = 90) {
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.usersRepo
      .createQueryBuilder('u')
      .select(`TO_CHAR(u.createdAt, 'IYYY-"W"IW')`, 'week')
      .addSelect('COUNT(*)', 'count')
      .where('u.createdAt >= :start', { start })
      .andWhere('u.role != :role', { role: UserRole.ADMIN })
      .groupBy(`TO_CHAR(u.createdAt, 'IYYY-"W"IW')`)
      .orderBy('week', 'ASC')
      .getRawMany();
    return rows.map((r) => ({ week: r.week, signups: parseInt(r.count, 10) }));
  }

  /**
   * Retention - users active in period who were also active in previous period
   */
  async getRetentionMetrics() {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [activeLast7d, activeLast14d, activeBoth] = await Promise.all([
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.lastLogin >= :date', { date: last7d })
        .andWhere('u.role != :role', { role: UserRole.ADMIN })
        .getCount(),
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.lastLogin >= :date', { date: last14d })
        .andWhere('u.role != :role', { role: UserRole.ADMIN })
        .getCount(),
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.lastLogin >= :date', { date: last7d })
        .andWhere('u.createdAt < :date', { date: last7d })
        .andWhere('u.role != :role', { role: UserRole.ADMIN })
        .getCount(),
    ]);

    return {
      activeLast7d,
      activeLast14d,
      returningUsers: activeBoth,
      retentionRate: activeLast14d > 0 ? (activeLast7d / activeLast14d) * 100 : 0,
    };
  }

  /** Classify referrer into traffic source */
  private classifyTrafficSource(referrer: string | null): string {
    if (!referrer || referrer.trim() === '') return 'direct';
    const r = referrer.toLowerCase();
    // Internal / same-site
    if (r.includes('betrollover') || r.includes('localhost') || r.startsWith('/')) return 'direct';
    // Organic search
    const searchEngines = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex', 'ecosia'];
    if (searchEngines.some((e) => r.includes(e))) return 'organic';
    // Social
    const social = ['facebook', 'twitter', 'x.com', 'instagram', 'linkedin', 'telegram', 'tiktok', 'youtube', 'pinterest', 'whatsapp', 'reddit'];
    if (social.some((s) => r.includes(s))) return 'social';
    return 'referral';
  }

  /**
   * Comprehensive visitor analytics from self-hosted tracking (visitor_sessions).
   * No placeholders; returns real data or zeros.
   */
  async getVisitorStats(days = 7) {
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const todayStart = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');

    const [
      uniqueSessions,
      pageViews,
      byPage,
      totalVisitorsAllTime,
      todaySessions,
      todayPageViews,
      activeSessionsNow,
      dailyBreakdown,
      referrerRows,
      deviceBreakdown,
      byCountry,
      avgSessionDurationSec,
    ] = await Promise.all([
      this.visitorRepo
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.sessionId)', 'count')
        .where('v.createdAt >= :start', { start })
        .getRawOne()
        .then((r) => parseInt(r?.count || '0', 10)),
      this.visitorRepo.count({ where: { createdAt: MoreThanOrEqual(start) } }),
      this.visitorRepo
        .createQueryBuilder('v')
        .select('v.page', 'page')
        .addSelect('COUNT(*)', 'views')
        .where('v.createdAt >= :start', { start })
        .andWhere('v.page IS NOT NULL')
        .groupBy('v.page')
        .orderBy('COUNT(*)', 'DESC')
        .limit(25)
        .getRawMany(),
      this.visitorRepo
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.sessionId)', 'count')
        .getRawOne()
        .then((r) => parseInt(r?.count || '0', 10)),
      this.visitorRepo
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.sessionId)', 'count')
        .where('v.createdAt >= :todayStart', { todayStart })
        .getRawOne()
        .then((r) => parseInt(r?.count || '0', 10)),
      this.visitorRepo.count({ where: { createdAt: MoreThanOrEqual(todayStart) } }),
      this.visitorRepo
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.sessionId)', 'count')
        .where('v.createdAt >= :fiveMinAgo', { fiveMinAgo })
        .getRawOne()
        .then((r) => parseInt(r?.count || '0', 10)),
      this.visitorRepo.manager.query(
        `SELECT DATE(created_at) as date,
                COUNT(DISTINCT session_id)::int as "uniqueSessions",
                COUNT(*)::int as "pageViews"
         FROM visitor_sessions
         WHERE created_at >= $1
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [start],
      ) as Promise<{ date: string; uniqueSessions: number; pageViews: number }[]>,
      this.visitorRepo.manager.query(
        `SELECT referrer FROM (
           SELECT DISTINCT ON (session_id) session_id, referrer
           FROM visitor_sessions
           WHERE created_at >= $1
           ORDER BY session_id, created_at ASC
         ) sub`,
        [start],
      ) as Promise<{ referrer: string | null }[]>,
      this.visitorRepo.manager.query(
        `SELECT COALESCE(device_type, 'unknown') as device, COUNT(DISTINCT session_id)::int as count
         FROM visitor_sessions WHERE created_at >= $1 GROUP BY COALESCE(device_type, 'unknown')`,
        [start],
      ) as Promise<{ device: string; count: number }[]>,
      this.visitorRepo.manager.query(
        `SELECT COALESCE(country, 'unknown') as country, COUNT(DISTINCT session_id)::int as count
         FROM visitor_sessions WHERE created_at >= $1 GROUP BY COALESCE(country, 'unknown') ORDER BY count DESC LIMIT 15`,
        [start],
      ) as Promise<{ country: string; count: number }[]>,
      this.visitorRepo.manager
        .query(
          `SELECT AVG(duration_sec)::float as avg_sec FROM (
             SELECT EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as duration_sec
             FROM visitor_sessions WHERE created_at >= $1 GROUP BY session_id HAVING COUNT(*) > 1
           ) sub`,
          [start],
        )
        .then((r: { avg_sec: number }[]) => r?.[0]?.avg_sec ?? 0),
    ]);

    const sourceCounts: Record<string, number> = { direct: 0, organic: 0, social: 0, referral: 0 };
    for (const row of referrerRows || []) {
      const src = this.classifyTrafficSource(row?.referrer ?? null);
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }
    const totalForSources = Object.values(sourceCounts).reduce((a, b) => a + b, 0);
    const trafficSources = (['direct', 'organic', 'social', 'referral'] as const).map((source) => ({
      source,
      count: sourceCounts[source] || 0,
      percent: totalForSources > 0 ? Math.round(((sourceCounts[source] || 0) / totalForSources) * 1000) / 10 : 0,
    }));

    return {
      uniqueSessions,
      pageViews,
      topPages: (byPage || []).map((r: any) => ({ page: r.page || '/', views: parseInt(r.views, 10) })),
      dailyVisitors: (dailyBreakdown || []).map((r: any) => ({
        date: typeof r.date === 'string' ? r.date : r.date?.toISOString?.()?.slice(0, 10) ?? '',
        uniqueSessions: typeof r.uniqueSessions === 'number' ? r.uniqueSessions : parseInt(String(r?.uniqueSessions ?? 0), 10),
        pageViews: typeof r.pageViews === 'number' ? r.pageViews : parseInt(String(r?.pageViews ?? 0), 10),
      })),
      todayVisitors: todaySessions,
      todayPageViews,
      totalVisitors: totalVisitorsAllTime,
      activeSessionsNow,
      trafficSources,
      deviceBreakdown: (deviceBreakdown || []).map((r: any) => ({ device: r.device, count: Number(r.count) || 0 })),
      byCountry: (byCountry || []).map((r: any) => ({ country: r.country, count: Number(r.count) || 0 })),
      avgSessionDurationSec: typeof avgSessionDurationSec === 'number' ? avgSessionDurationSec : 0,
      conversionBySource: await this.getConversionBySource(start),
    };
  }

  /** Sessions with logged-in user, by traffic source (engagement attribution) */
  private async getConversionBySource(start: Date): Promise<{ source: string; sessions: number; percent: number }[]> {
    const rows = (await this.visitorRepo.manager.query(
      `SELECT referrer FROM (
         SELECT DISTINCT ON (session_id) session_id, referrer, user_id
         FROM visitor_sessions
         WHERE created_at >= $1 AND user_id IS NOT NULL
         ORDER BY session_id, created_at ASC
       ) sub`,
      [start],
    )) as { referrer: string | null }[];
    const counts: Record<string, number> = { direct: 0, organic: 0, social: 0, referral: 0 };
    for (const r of rows) {
      const src = this.classifyTrafficSource(r?.referrer ?? null);
      counts[src] = (counts[src] || 0) + 1;
    }
    const total = rows.length;
    return (['direct', 'organic', 'social', 'referral'] as const).map((source) => ({
      source,
      sessions: counts[source] || 0,
      percent: total > 0 ? Math.round(((counts[source] || 0) / total) * 1000) / 10 : 0,
    }));
  }

  /**
   * AI Dashboard metrics (system health, tipster performance, platform engagement)
   */
  async getAiDashboardMetrics() {
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(today + 'T00:00:00Z');
    const todayEnd = new Date(today + 'T23:59:59.999Z');

    const [
      predictionsGeneratedToday,
      tipsterStats,
      activeUsersToday,
      predictionsViewedToday,
      predictionsFollowedToday,
      newFollowersToday,
      errorsTodayRow,
    ] = await Promise.all([
      this.predictionRepo
        .createQueryBuilder('p')
        .where('p.predictionDate = :date', { date: today })
        .getCount(),
      this.tipsterRepo
        .createQueryBuilder('t')
        .select('AVG(t.roi)', 'avgRoi')
        .addSelect('MAX(t.roi)', 'bestRoi')
        .addSelect('MIN(t.roi)', 'worstRoi')
        .addSelect('COALESCE(SUM(t.totalProfit), 0)', 'totalProfit')
        .where('t.isActive = :active', { active: true })
        .getRawOne(),
      this.usersRepo.count({
        where: {
          role: UserRole.USER,
          lastLogin: Between(todayStart, todayEnd),
        },
      }),
      this.predictionRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.views), 0)', 'total')
        .where('p.predictionDate = :date', { date: today })
        .getRawOne()
        .then((r) => parseFloat(r?.total || '0')),
      this.predictionRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.followersWhoPlaced), 0)', 'total')
        .where('p.predictionDate = :date', { date: today })
        .getRawOne()
        .then((r) => parseFloat(r?.total || '0')),
      this.tipsterRepo.manager.query(
        `SELECT COUNT(*)::int as count FROM tipster_follows WHERE followed_at >= $1 AND followed_at <= $2`,
        [todayStart, todayEnd],
      ).then((r: { count?: string }[]) => parseInt(r?.[0]?.count || '0', 10)),
      this.analyticsDailyRepo.findOne({ where: { date: today }, select: ['errorsCount'] }),
    ]);

    const tipster = tipsterStats as any;
    const avgRoi = parseFloat(tipster?.avgroi || '0') || 0;
    const bestRoi = parseFloat(tipster?.bestroi || '0') || 0;
    const worstRoi = parseFloat(tipster?.worstroi || '0') || 0;
    const totalProfit = parseFloat(tipster?.totalprofit || '0') || 0;

    const errorsToday = errorsTodayRow?.errorsCount ?? 0;

    return {
      system_health: {
        predictions_generated_today: predictionsGeneratedToday,
        api_uptime: null as number | null, // Requires APM (e.g. Sentry, Datadog)
        average_response_time: null as number | null, // Requires APM
        errors_today: errorsToday,
      },
      tipster_performance: {
        avg_roi_all_tipsters: Math.round(avgRoi * 100) / 100,
        best_tipster_roi: Math.round(bestRoi * 100) / 100,
        worst_tipster_roi: Math.round(worstRoi * 100) / 100,
        total_profit_all_tipsters: Math.round(totalProfit * 100) / 100,
      },
      platform_engagement: {
        active_users_today: activeUsersToday,
        predictions_viewed_today: Math.round(predictionsViewedToday),
        predictions_followed_today: Math.round(predictionsFollowedToday),
        new_followers_today: newFollowersToday,
      },
    };
  }

  /**
   * Breakdown of pick counts, revenue, win rate and avg odds per sport.
   * Covers all settled + pending accumulator tickets.
   */
  async getSportBreakdown(): Promise<Array<{
    sport: string;
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    pendingPicks: number;
    winRate: number;
    revenue: number;
    avgOdds: number;
  }>> {
    const rows = await this.ticketsRepo
      .createQueryBuilder('t')
      .select('t.sport', 'sport')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.result = :won THEN 1 ELSE 0 END)', 'won')
      .addSelect('SUM(CASE WHEN t.result = :lost THEN 1 ELSE 0 END)', 'lost')
      .addSelect('SUM(CASE WHEN t.result = :pending THEN 1 ELSE 0 END)', 'pending')
      .addSelect('COALESCE(SUM(CASE WHEN t.price > 0 THEN t.price ELSE 0 END), 0)', 'revenue')
      .addSelect('COALESCE(AVG(t.totalOdds), 0)', 'avgOdds')
      .setParameter('won', 'won')
      .setParameter('lost', 'lost')
      .setParameter('pending', 'pending')
      .groupBy('t.sport')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return rows.map((r) => {
      const total = Number(r.total) || 0;
      const won = Number(r.won) || 0;
      const lost = Number(r.lost) || 0;
      const settled = won + lost;
      return {
        sport: r.sport || 'Football',
        totalPicks: total,
        wonPicks: won,
        lostPicks: lost,
        pendingPicks: Number(r.pending) || 0,
        winRate: settled > 0 ? Math.round((won / settled) * 1000) / 10 : 0,
        revenue: Math.round(Number(r.revenue) * 100) / 100,
        avgOdds: Math.round(Number(r.avgOdds) * 100) / 100,
      };
    });
  }

  /**
   * Daily revenue trend for the last N days, optionally broken down by sport.
   */
  async getRevenueTrend(days = 30): Promise<Array<{ date: string; revenue: number; purchases: number }>> {
    const startDate = new Date(Date.now() - days * 86_400_000);
    const rows = await this.purchasesRepo
      .createQueryBuilder('p')
      .innerJoin('p.pick', 'at')
      .select("TO_CHAR(p.purchasedAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COALESCE(SUM(at.price), 0)', 'revenue')
      .addSelect('COUNT(*)', 'purchases')
      .where('p.purchasedAt >= :startDate', { startDate })
      .andWhere('at.price > 0')
      .groupBy("TO_CHAR(p.purchasedAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      date: r.date,
      revenue: Math.round(Number(r.revenue) * 100) / 100,
      purchases: Number(r.purchases) || 0,
    }));
  }

  /**
   * Top tipsters by sport — win rate, ROI, total picks.
   * Returns up to `limit` tipsters per sport (all sports combined, client can filter).
   */
  async getTopTipstersBySport(limit = 5): Promise<Array<{
    sport: string;
    userId: number;
    displayName: string;
    username: string;
    totalPicks: number;
    wonPicks: number;
    winRate: number;
    roi: number;
  }>> {
    const rows = await this.ticketsRepo.query(
      `SELECT
        t.sport,
        u.id            AS "userId",
        COALESCE(ti.display_name, u.display_name, u.email) AS "displayName",
        COALESCE(ti.username, u.username, u.email)         AS "username",
        COUNT(*)::int                                      AS "totalPicks",
        SUM(CASE WHEN t.result = 'won' THEN 1 ELSE 0 END)::int AS "wonPicks",
        SUM(CASE WHEN t.result = 'lost' THEN 1 ELSE 0 END)::int AS "lostPicks",
        COALESCE(SUM(CASE WHEN t.result = 'won' THEN t.total_odds ELSE 0 END), 0) AS "totalOddsWon"
       FROM accumulator_tickets t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN tipsters ti ON ti.user_id = u.id
       WHERE t.result IN ('won', 'lost')
       GROUP BY t.sport, u.id, ti.display_name, u.display_name, u.email, ti.username, u.username
       ORDER BY t.sport, COUNT(*) DESC`,
    );

    // Keep top N per sport
    const bySport = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = bySport.get(r.sport) ?? [];
      if (arr.length < limit) {
        arr.push(r);
        bySport.set(r.sport, arr);
      }
    }

    const result: ReturnType<typeof this.getTopTipstersBySport> extends Promise<infer T> ? T : never = [];
    for (const [sport, entries] of bySport) {
      for (const r of entries) {
        const won = Number(r.wonPicks) || 0;
        const lost = Number(r.lostPicks) || 0;
        const settled = won + lost;
        const totalOddsWon = Number(r.totalOddsWon) || 0;
        const roi = settled > 0 ? ((totalOddsWon - settled) / settled) * 100 : 0;
        result.push({
          sport,
          userId: Number(r.userId),
          displayName: r.displayName || 'Unknown',
          username: r.username || 'unknown',
          totalPicks: Number(r.totalPicks),
          wonPicks: won,
          winRate: settled > 0 ? Math.round((won / settled) * 1000) / 10 : 0,
          roi: Math.round(roi * 10) / 10,
        });
      }
    }
    return result;
  }
}
