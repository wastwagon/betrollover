import { Injectable, BadRequestException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, Between } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { UserWallet } from '../wallet/entities/user-wallet.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { PickMarketplace } from '../accumulators/entities/pick-marketplace.entity';
import { EscrowFund } from '../accumulators/entities/escrow-fund.entity';
import { TipsterRequest } from '../users/entities/tipster-request.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { UserPurchasedPick } from '../accumulators/entities/user-purchased-pick.entity';
import { DepositRequest } from '../wallet/entities/deposit-request.entity';
import { WithdrawalRequest } from '../wallet/entities/withdrawal-request.entity';
import { PayoutMethod } from '../wallet/entities/payout-method.entity';
import { SettlementService } from '../accumulators/settlement.service';
import { OddsApiSettlementService } from '../odds-api/odds-api-settlement.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContentService } from '../content/content.service';
import { EmailService } from '../email/email.service';
import { WalletService } from '../wallet/wallet.service';
import { SmtpSettings } from '../email/entities/smtp-settings.entity';
import { ApiSettings } from './entities/api-settings.entity';
import { getSportApiBaseUrl } from '../../config/sports.config';
import { PaystackSettings } from '../wallet/entities/paystack-settings.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { Prediction } from '../predictions/entities/prediction.entity';
import { PredictionFixture } from '../predictions/entities/prediction-fixture.entity';
import { TipstersApiService } from '../predictions/tipsters-api.service';
import { ResultTrackerService } from '../predictions/result-tracker.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(TipsterRequest)
    private tipsterRequestRepo: Repository<TipsterRequest>,
    @InjectRepository(SmtpSettings)
    private smtpRepo: Repository<SmtpSettings>,
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    @InjectRepository(PaystackSettings)
    private paystackSettingsRepo: Repository<PaystackSettings>,
    @InjectRepository(UserWallet)
    private walletsRepo: Repository<UserWallet>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(AccumulatorTicket)
    private ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(PickMarketplace)
    private marketplaceRepo: Repository<PickMarketplace>,
    @InjectRepository(EscrowFund)
    private escrowRepo: Repository<EscrowFund>,
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(UserPurchasedPick)
    private purchasedRepo: Repository<UserPurchasedPick>,
    @InjectRepository(DepositRequest)
    private depositRepo: Repository<DepositRequest>,
    @InjectRepository(WithdrawalRequest)
    private withdrawalRepo: Repository<WithdrawalRequest>,
    @InjectRepository(PayoutMethod)
    private payoutMethodRepo: Repository<PayoutMethod>,
    @InjectRepository(SportEvent)
    private sportEventRepo: Repository<SportEvent>,
    private settlementService: SettlementService,
    private oddsApiSettlementService: OddsApiSettlementService,
    private notificationsService: NotificationsService,
    private contentService: ContentService,
    private emailService: EmailService,
    private walletService: WalletService,
    private authService: AuthService,
    private dataSource: DataSource,
    @InjectRepository(Prediction)
    private predictionRepo: Repository<Prediction>,
    @InjectRepository(PredictionFixture)
    private predictionFixtureRepo: Repository<PredictionFixture>,
    private tipstersApiService: TipstersApiService,
    private resultTrackerService: ResultTrackerService,
  ) { }

  async getStats() {
    // All users (except admin) are tipsters - merged model
    const [totalTipsters, totalWallets, totalBalance] = await Promise.all([
      this.usersRepo.count({ where: [{ role: UserRole.USER }, { role: UserRole.TIPSTER }] }),
      this.walletsRepo.count(),
      this.walletsRepo
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.balance), 0)', 'total')
        .getRawOne()
        .then((r) => Number(r?.total ?? 0)),
    ]);

    const [totalPicks, pendingPicks, approvedPicks, activeMarketplace] = await Promise.all([
      this.ticketRepo.count(),
      this.ticketRepo.count({ where: { status: 'pending_approval' } }),
      this.ticketRepo.count({ where: { status: 'active' } }),
      this.marketplaceRepo.count({ where: { status: 'active' } }),
    ]);

    const [totalPurchases, totalDeposits, totalWithdrawals, pendingDeposits, pendingWithdrawals] = await Promise.all([
      this.purchasedRepo.count(),
      this.depositRepo.count(),
      this.withdrawalRepo.count(),
      this.depositRepo.count({ where: { status: 'pending' } }),
      this.withdrawalRepo.count({ where: { status: 'pending' } }),
    ]);

    const escrowHeld = await this.escrowRepo
      .createQueryBuilder('e')
      .where('e.status = :status', { status: 'held' })
      .select('COALESCE(SUM(e.amount), 0)', 'total')
      .getRawOne()
      .then((r) => Number(r?.total ?? 0));

    const totalRevenue = await this.purchasedRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.purchase_price), 0)', 'total')
      .getRawOne()
      .then((r) => Number(r?.total ?? 0));

    return {
      users: { total: totalTipsters, tipsters: totalTipsters },
      wallets: { count: totalWallets, totalBalance },
      picks: { total: totalPicks, pending: pendingPicks, approved: approvedPicks, activeMarketplace },
      escrow: { held: escrowHeld },
      purchases: { total: totalPurchases, revenue: totalRevenue },
      deposits: { total: totalDeposits, pending: pendingDeposits },
      withdrawals: { total: totalWithdrawals, pending: pendingWithdrawals },
    };
  }

  async getUsers(params: { role?: string; status?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(10, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.usersRepo.createQueryBuilder('u')
      .select(['u.id', 'u.username', 'u.email', 'u.displayName', 'u.avatar', 'u.role', 'u.status', 'u.createdAt'])
      .orderBy('u.createdAt', 'DESC');

    if (params.role) qb.andWhere('u.role = :role', { role: params.role });
    if (params.status) qb.andWhere('u.status = :status', { status: params.status });
    if (params.search) {
      qb.andWhere('(u.email ILIKE :q OR u.username ILIKE :q OR u.display_name ILIKE :q)', {
        q: `%${params.search}%`,
      });
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Attach tipster performance stats (ROI, win rate, commission paid) for tipster/admin rows
    const enriched = await Promise.all(
      items.map(async (u) => {
        if (u.role !== 'tipster' && u.role !== 'admin') return u;
        try {
          const [statsRaw, commRaw] = await Promise.all([
            this.dataSource.query(
              `SELECT
                 COUNT(*) FILTER (WHERE result='won')  AS won,
                 COUNT(*) FILTER (WHERE result='lost') AS lost,
                 COUNT(*) FILTER (WHERE result IN ('won','lost')) AS settled,
                 COALESCE(SUM(CASE WHEN result='won' THEN total_odds ELSE 0 END),0) AS sum_odds_won
               FROM accumulator_tickets WHERE user_id=$1 AND status='active'`,
              [u.id],
            ),
            this.dataSource.query(
              `SELECT COALESCE(SUM(amount),0) AS total FROM wallet_transactions
               WHERE user_id=$1 AND type='commission' AND status='completed'`,
              [u.id],
            ),
          ]);
          const s = statsRaw[0] ?? {};
          const won = Number(s.won ?? 0);
          const lost = Number(s.lost ?? 0);
          const settled = Number(s.settled ?? 0);
          const winRate = settled > 0 ? (won / settled) * 100 : null;
          const roi = settled > 0
            ? ((Number(s.sum_odds_won ?? 0) - settled) / settled) * 100
            : null;
          return {
            ...u,
            wonPicks: won,
            lostPicks: lost,
            winRate: winRate !== null ? Number(winRate.toFixed(1)) : null,
            roi: roi !== null ? Number(roi.toFixed(2)) : null,
            totalCommissionPaid: Number(commRaw[0]?.total ?? 0),
          };
        } catch {
          return u;
        }
      }),
    );

    return { items: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateUser(id: number, data: { role?: string; status?: string; avatar?: string | null }) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) return null;
    if (data.role) user.role = data.role as UserRole;
    if (data.status) user.status = data.status as UserStatus;
    if (data.avatar !== undefined) {
      user.avatar = data.avatar || null;
      await this.syncAvatarToTipster(id, user.avatar);
    }
    await this.usersRepo.save(user);
    return user;
  }

  private async syncAvatarToTipster(userId: number, avatarUrl: string | null): Promise<void> {
    const tipster = await this.dataSource.getRepository(Tipster).findOne({ where: { userId } });
    if (tipster) {
      tipster.avatarUrl = avatarUrl;
      await this.dataSource.getRepository(Tipster).save(tipster);
    }
  }

  async getEscrow() {
    return this.escrowRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getWallets() {
    return this.walletsRepo.find({
      relations: ['user'],
      select: { user: { id: true, email: true, displayName: true } },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getWalletTransactions(params: { userId?: number; type?: string; limit?: number }) {
    const limit = Math.min(100, params.limit ?? 50);
    const qb = this.txRepo.createQueryBuilder('t')
      .orderBy('t.createdAt', 'DESC')
      .take(limit);
    if (params.userId) qb.andWhere('t.userId = :userId', { userId: params.userId });
    if (params.type) qb.andWhere('t.type = :type', { type: params.type });
    return qb.getMany();
  }

  async getSettings() {
    // Check both database and environment variable for backward compatibility
    let apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
    const envApiKey = process.env.API_SPORTS_KEY;

    // If no DB record exists but env var is set, create one
    if (!apiSettings && envApiKey) {
      apiSettings = this.apiSettingsRepo.create({
        id: 1,
        apiSportsKey: envApiKey,
        isActive: true,
        minimumROI: 20.0,
      });
      await this.apiSettingsRepo.save(apiSettings);
    }

    // Use DB value if available, otherwise fall back to env
    const apiKey = apiSettings?.apiSportsKey || envApiKey || '';

    return {
      apiSportsConfigured: !!(apiKey && apiKey.trim().length > 0),
      apiSportsKey: apiSettings?.apiSportsKey || null,
      dailyRequestsUsed: apiSettings?.dailyRequestsUsed || 0,
      dailyRequestsLimit: apiSettings?.dailyRequestsLimit || 0,
      lastTestDate: apiSettings?.lastTestDate || null,
      isActive: apiSettings?.isActive || false,
      minimumROI: Number(apiSettings?.minimumROI ?? 20.0),
      platformCommissionRate: Number(apiSettings?.platformCommissionRate ?? 10.0),
      currency: 'GHS',
      country: 'Ghana',
      appName: 'BetRollover',
    };
  }

  async updateMinimumROI(minimumROI: number): Promise<ApiSettings> {
    if (minimumROI < 0 || minimumROI > 1000) {
      throw new BadRequestException('Minimum ROI must be between 0 and 1000');
    }
    let apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
    if (!apiSettings) {
      apiSettings = this.apiSettingsRepo.create({ id: 1 });
    }
    apiSettings.minimumROI = minimumROI;
    return this.apiSettingsRepo.save(apiSettings);
  }

  async updateCommissionRate(platformCommissionRate: number): Promise<{ platformCommissionRate: number }> {
    if (platformCommissionRate < 0 || platformCommissionRate > 50) {
      throw new BadRequestException('Commission rate must be between 0 and 50');
    }
    let apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
    if (!apiSettings) {
      apiSettings = this.apiSettingsRepo.create({ id: 1 });
    }
    apiSettings.platformCommissionRate = platformCommissionRate;
    await this.apiSettingsRepo.save(apiSettings);
    return { platformCommissionRate };
  }

  /** Get total platform commission revenue (all time and by period) */
  async getCommissionRevenue(): Promise<{
    allTime: number;
    last30d: number;
    last7d: number;
    recentTransactions: Array<{ id: number; amount: number; reference: string | null; description: string | null; createdAt: Date; userId: number }>;
  }> {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d7  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

    const [allTime, last30d, last7d, recentTransactions] = await Promise.all([
      this.txRepo.createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'total')
        .where("t.type = 'commission' AND t.status = 'completed'")
        .getRawOne<{ total: string }>(),
      this.txRepo.createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'total')
        .where("t.type = 'commission' AND t.status = 'completed' AND t.created_at >= :d", { d: d30 })
        .getRawOne<{ total: string }>(),
      this.txRepo.createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'total')
        .where("t.type = 'commission' AND t.status = 'completed' AND t.created_at >= :d", { d: d7 })
        .getRawOne<{ total: string }>(),
      this.txRepo.find({
        where: { type: 'commission', status: 'completed' },
        order: { createdAt: 'DESC' },
        take: 50,
        select: ['id', 'amount', 'reference', 'description', 'createdAt', 'userId'],
      }),
    ]);

    return {
      allTime:  Number(allTime?.total  ?? 0),
      last30d:  Number(last30d?.total  ?? 0),
      last7d:   Number(last7d?.total   ?? 0),
      recentTransactions,
    };
  }

  async updateApiSportsKey(key: string): Promise<ApiSettings> {
    let apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });

    if (!apiSettings) {
      apiSettings = this.apiSettingsRepo.create({ id: 1 });
    }

    apiSettings.apiSportsKey = key.trim();
    apiSettings.isActive = !!key.trim();

    return await this.apiSettingsRepo.save(apiSettings);
  }

  async testApiSportsConnection(key?: string): Promise<{ success: boolean; message: string; usage?: { used: number; limit: number } }> {
    const apiKey = key || (await this.apiSettingsRepo.findOne({ where: { id: 1 } }))?.apiSportsKey || process.env.API_SPORTS_KEY || '';

    if (!apiKey) {
      return { success: false, message: 'API key not configured' };
    }

    try {
      // Make a simple API call to test the connection
      const res = await fetch(`${getSportApiBaseUrl('football')}/status`, {
        headers: { 'x-apisports-key': apiKey },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.errors?.[0]?.message || `API returned status ${res.status}`
        };
      }

      const data = await res.json();

      // Check for rate limit headers
      const rateLimitRemaining = res.headers.get('x-ratelimit-requests-remaining');
      const rateLimitLimit = res.headers.get('x-ratelimit-requests-limit');

      // Also check response body for limit info (API-Sports includes it in response)
      let used = 0;
      let limit = 0;

      if (data?.response?.requests) {
        limit = parseInt(String(data.response.requests.limit_day || '0'), 10);
        used = parseInt(String(data.response.requests.current || '0'), 10);
      } else if (rateLimitRemaining !== null && rateLimitLimit !== null) {
        // Fallback to headers if available
        limit = parseInt(String(rateLimitLimit), 10) || 0;
        const remaining = parseInt(String(rateLimitRemaining), 10) || 0;
        used = limit - remaining;
      }

      // Update usage in database
      const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
      if (apiSettings) {
        apiSettings.lastTestDate = new Date();
        if (limit > 0) {
          apiSettings.dailyRequestsUsed = used;
          apiSettings.dailyRequestsLimit = limit;
        }
        await this.apiSettingsRepo.save(apiSettings);
      }

      return {
        success: true,
        message: 'Connection successful',
        usage: limit > 0 ? {
          used,
          limit,
        } : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to API-Sports'
      };
    }
  }

  async getApiSportsUsage(): Promise<{ used: number; limit: number; remaining: number } | null> {
    const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });

    if (!apiSettings || !apiSettings.apiSportsKey) {
      return null;
    }

    return {
      used: apiSettings.dailyRequestsUsed || 0,
      limit: apiSettings.dailyRequestsLimit || 0,
      remaining: (apiSettings.dailyRequestsLimit || 0) - (apiSettings.dailyRequestsUsed || 0),
    };
  }

  async getPendingPicks() {
    return this.ticketRepo.find({
      where: { status: 'pending_approval' },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Legacy: Picks are auto-approved when tipsters create them. Use only for manual override. */
  async approvePick(id: number) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) return null;
    ticket.status = 'active';
    await this.ticketRepo.save(ticket);
    return ticket;
  }

  /** Legacy: Use only for manual removal of a pick. */
  async rejectPick(id: number) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) return null;
    ticket.status = 'cancelled';
    await this.ticketRepo.save(ticket);
    return ticket;
  }

  async getMarketplace() {
    const listings = await this.marketplaceRepo.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' },
    });
    const accIds = listings.map((l) => l.accumulatorId);
    if (accIds.length === 0) return [];
    return this.ticketRepo.find({
      where: { id: In(accIds) },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Get today's predictions with marketplace price (admin only) */
  async getTodaysPredictionsWithPrices() {
    const { Prediction } = await import('../predictions/entities/prediction.entity');
    const { PredictionFixture } = await import('../predictions/entities/prediction-fixture.entity');
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(today + 'T00:00:00.000Z');
    const endOfDay = new Date(today + 'T23:59:59.999Z');
    const predictions = await this.dataSource.getRepository(Prediction).find({
      where: {
        predictionDate: Between(startOfDay, endOfDay),
        status: 'pending',
      },
      relations: ['tipster'],
      order: { combinedOdds: 'ASC' },
    });
    const predIds = predictions.map((p) => p.id);
    const listings = predIds.length
      ? await this.marketplaceRepo.find({ where: { predictionId: In(predIds) } })
      : [];
    const priceMap = new Map(listings.map((l) => [l.predictionId, Number(l.price)]));
    const fixtureRepo = this.dataSource.getRepository(PredictionFixture);
    const enriched = await Promise.all(
      predictions.map(async (p) => {
        const tipster = p.tipster as { username: string; displayName: string; avatarUrl: string | null; roi: number; winRate: number };
        const fixtures = await fixtureRepo.find({
          where: { predictionId: p.id },
          order: { legNumber: 'ASC' },
        });
        return {
          id: p.id,
          prediction_title: p.predictionTitle,
          combined_odds: Number(p.combinedOdds),
          stake_units: Number(p.stakeUnits),
          confidence_level: p.confidenceLevel,
          status: p.status,
          prediction_date: p.predictionDate,
          posted_at: p.postedAt,
          username: tipster?.username ?? '',
          display_name: tipster?.displayName ?? '',
          avatar_url: tipster?.avatarUrl ?? null,
          roi: Number(tipster?.roi ?? 0),
          win_rate: Number(tipster?.winRate ?? 0),
          marketplace_price: priceMap.get(p.id) ?? 0,
          fixtures: fixtures.map((f) => ({
            id: f.id,
            fixture_id: f.fixtureId,
            match_date: f.matchDate,
            league_name: f.leagueName,
            home_team: f.homeTeam,
            away_team: f.awayTeam,
            selected_outcome: f.selectedOutcome,
            selection_odds: Number(f.selectionOdds),
            result_status: f.resultStatus,
            leg_number: f.legNumber,
          })),
        };
      }),
    );
    return { date: today, predictions: enriched };
  }

  /** Set sale price for an AI prediction coupon on the marketplace */
  async setPredictionMarketplacePrice(predictionId: number, price: number) {
    if (price < 0) throw new BadRequestException('Price cannot be negative');
    const listing = await this.marketplaceRepo.findOne({
      where: { predictionId },
    });
    if (!listing) throw new BadRequestException('Prediction not listed on marketplace');
    listing.price = price;
    await this.marketplaceRepo.save(listing);
    return { success: true, predictionId, price };
  }

  /**
   * Run full settlement: first sync Odds API results (marks sport_events FT),
   * then settle picks on finished fixtures/events.
   * Fixes: Odds API sports (tennis, basketball, etc.) were not settling because
   * manual "Run Settlement" only ran SettlementService without syncing results first.
   */
  async runSettlement() {
    const resultsSync = await this.oddsApiSettlementService.syncResults();
    const settlement = await this.settlementService.runSettlement();
    return {
      ...settlement,
      oddsApiEventsMarkedFt: resultsSync.updated,
    };
  }

  /**
   * Manually mark a sport event as finished and settle picks on it.
   * Use when the Odds API doesn't return results (e.g. match >3 days old; API limit is daysFrom=3).
   */
  async manuallySettleSportEvent(eventId: number, homeScore: number, awayScore: number) {
    const event = await this.sportEventRepo.findOne({
      where: { id: eventId },
      select: ['id', 'sport', 'homeTeam', 'awayTeam', 'status'],
    });
    if (!event) throw new NotFoundException('Sport event not found');
    if (event.status === 'FT') {
      return { message: 'Event already settled', picksUpdated: 0, ticketsSettled: 0 };
    }
    await this.sportEventRepo.update(
      { id: eventId },
      { status: 'FT', homeScore, awayScore, syncedAt: new Date() },
    );
    const settlement = await this.settlementService.runSettlement();
    return { message: 'Event marked FT and settlement run', ...settlement };
  }

  async getTipsterRequests() {
    return this.tipsterRequestRepo.find({
      where: { status: 'pending' },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Legacy: Tipsters are auto-approved. Use only for manual override. */
  async approveTipsterRequest(userId: number, adminId: number) {
    const req = await this.tipsterRequestRepo.findOne({ where: { userId, status: 'pending' } });
    if (!req) return null;
    req.status = 'approved';
    req.reviewedBy = adminId;
    req.reviewedAt = new Date();
    await this.tipsterRequestRepo.save(req);
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user) {
      user.role = UserRole.TIPSTER;
      await this.usersRepo.save(user);
    }
    await this.notificationsService.create({
      userId,
      type: 'tipster_approved',
      title: 'Tipster Approved',
      message: 'Your tipster request has been approved. You can now create and sell picks!',
      link: '/create-pick',
      icon: 'check',
      sendEmail: true,
    }).catch(() => { });
    return { ok: true };
  }

  async getContentPages() {
    return this.contentService.getAll();
  }

  async updateContentPage(slug: string, data: { title?: string; content?: string; metaDescription?: string }) {
    return this.contentService.update(slug, data);
  }

  async getSmtpSettings() {
    let s = await this.smtpRepo.findOne({ where: { id: 1 } });
    if (!s) {
      s = this.smtpRepo.create({
        host: 'smtp.sendgrid.net',
        port: 465,
        username: 'apikey',
        encryption: 'SSL',
        fromEmail: 'noreply@betrollover.com',
        fromName: 'BetRollover',
      });
      await this.smtpRepo.save(s);
    }
    return {
      host: s.host,
      port: s.port,
      username: s.username,
      password: s.password ? '********' : '',
      encryption: s.encryption,
      fromEmail: s.fromEmail,
      fromName: s.fromName,
    };
  }

  async updateSmtpSettings(data: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    encryption?: string;
    fromEmail?: string;
    fromName?: string;
  }) {
    let s = await this.smtpRepo.findOne({ where: { id: 1 } });
    if (!s) {
      s = this.smtpRepo.create({
        host: 'smtp.sendgrid.net',
        port: 465,
        username: 'apikey',
        encryption: 'SSL',
        fromEmail: 'noreply@betrollover.com',
        fromName: 'BetRollover',
      });
      await this.smtpRepo.save(s);
    }
    if (data.host !== undefined) s.host = data.host;
    if (data.port !== undefined) s.port = data.port;
    if (data.username !== undefined) s.username = data.username;
    if (data.password !== undefined && data.password !== '' && data.password !== '********') s.password = data.password;
    if (data.encryption !== undefined) s.encryption = data.encryption;
    if (data.fromEmail !== undefined) s.fromEmail = data.fromEmail;
    if (data.fromName !== undefined) s.fromName = data.fromName;
    await this.smtpRepo.save(s);
    return this.getSmtpSettings();
  }

  async getPaystackSettings() {
    let s = await this.paystackSettingsRepo.findOne({ where: { id: 1 } });
    if (!s) {
      s = this.paystackSettingsRepo.create({ mode: 'live' });
      await this.paystackSettingsRepo.save(s);
    }
    return {
      secretKey: s.secretKey ? '********' : '',
      publicKey: s.publicKey ? '********' : '',
      mode: s.mode || 'live',
      configured: !!(s.secretKey?.trim() && s.secretKey.startsWith('sk_')),
    };
  }

  async updatePaystackSettings(data: {
    secretKey?: string;
    publicKey?: string;
    mode?: string;
  }) {
    let s = await this.paystackSettingsRepo.findOne({ where: { id: 1 } });
    if (!s) {
      s = this.paystackSettingsRepo.create({ mode: 'live' });
      await this.paystackSettingsRepo.save(s);
    }
    if (data.secretKey !== undefined && data.secretKey !== '' && data.secretKey !== '********') {
      s.secretKey = data.secretKey.trim();
    }
    if (data.publicKey !== undefined && data.publicKey !== '' && data.publicKey !== '********') {
      s.publicKey = data.publicKey.trim();
    }
    if (data.mode !== undefined) s.mode = data.mode;
    await this.paystackSettingsRepo.save(s);
    return this.getPaystackSettings();
  }

  async sendTestEmail(to: string) {
    return this.emailService.send({
      to,
      subject: 'BetRollover - Test Email',
      text: 'This is a test email from BetRollover. Your SMTP configuration is working correctly.',
    });
  }

  /** Legacy: Use only for manual revoke of tipster status. */
  async rejectTipsterRequest(userId: number, adminId: number) {
    const req = await this.tipsterRequestRepo.findOne({ where: { userId, status: 'pending' } });
    if (!req) return null;
    req.status = 'rejected';
    req.reviewedBy = adminId;
    req.reviewedAt = new Date();
    await this.tipsterRequestRepo.save(req);
    await this.notificationsService.create({
      userId,
      type: 'tipster_rejected',
      title: 'Tipster Request Rejected',
      message: 'Your tipster request was not approved. Contact support for more info.',
      link: '/dashboard',
      icon: 'x',
      sendEmail: true,
    }).catch(() => { });
    return { ok: true };
  }

  // Notifications Management
  async getAllNotifications(params: { userId?: number; limit?: number; page?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, params.limit ?? 50);
    const skip = (page - 1) * limit;
    const qb = this.notificationRepo.createQueryBuilder('n').orderBy('n.createdAt', 'DESC');
    if (params.userId) qb.andWhere('n.userId = :userId', { userId: params.userId });
    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deleteNotification(id: number) {
    await this.notificationRepo.delete(id);
    return { ok: true };
  }

  // Purchases Management
  async getAllPurchases(params: { userId?: number; accumulatorId?: number; limit?: number; page?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, params.limit ?? 50);
    const skip = (page - 1) * limit;
    const qb = this.purchasedRepo.createQueryBuilder('p').orderBy('p.purchasedAt', 'DESC');
    if (params.userId) qb.andWhere('p.userId = :userId', { userId: params.userId });
    if (params.accumulatorId) qb.andWhere('p.accumulatorId = :accumulatorId', { accumulatorId: params.accumulatorId });
    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Deposits Management
  async getAllDeposits(params: { userId?: number; status?: string; limit?: number; page?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, params.limit ?? 50);
    const skip = (page - 1) * limit;
    const qb = this.depositRepo.createQueryBuilder('d').orderBy('d.createdAt', 'DESC');
    if (params.userId) qb.andWhere('d.userId = :userId', { userId: params.userId });
    if (params.status) qb.andWhere('d.status = :status', { status: params.status });
    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateDepositStatus(id: number, status: string) {
    const deposit = await this.depositRepo.findOne({ where: { id } });
    if (!deposit) return null;
    deposit.status = status;
    await this.depositRepo.save(deposit);
    if (status === 'completed') {
      await this.walletService.credit(deposit.userId, Number(deposit.amount), 'deposit', deposit.reference, 'Deposit completed');
    }
    return deposit;
  }

  // Withdrawals Management
  async getAllWithdrawals(params: { userId?: number; status?: string; limit?: number; page?: number }) {
    const pageNum = Math.max(1, params.page ?? 1);
    const limitNum = Math.min(100, params.limit ?? 50);
    const skip = (pageNum - 1) * limitNum;
    const qb = this.withdrawalRepo.createQueryBuilder('w').orderBy('w.createdAt', 'DESC');
    if (params.userId) qb.andWhere('w.userId = :userId', { userId: params.userId });
    if (params.status) qb.andWhere('w.status = :status', { status: params.status });
    const [withdrawals, total] = await qb.skip(skip).take(limitNum).getManyAndCount();

    // Load payout methods and users for display (admin manual fulfill)
    const payoutIds = [...new Set(withdrawals.map((w) => w.payoutMethodId))];
    const userIds = [...new Set(withdrawals.map((w) => w.userId))];
    const [payouts, users] = await Promise.all([
      payoutIds.length ? this.payoutMethodRepo.find({ where: { id: In(payoutIds) } }) : [],
      userIds.length ? this.usersRepo.find({ where: { id: In(userIds) } }) : [],
    ]);
    const payoutMap = new Map(payouts.map((p) => [p.id, p]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = withdrawals.map((w) => {
      const payout = payoutMap.get(w.payoutMethodId);
      const u = userMap.get(w.userId);
      return {
        ...w,
        user: u ? { id: u.id, displayName: u.displayName, email: u.email } : null,
        payoutMethod: payout
          ? {
            type: payout.type,
            displayName: payout.displayName,
            accountMasked: payout.accountMasked,
            country: payout.country,
            currency: payout.currency,
            manualDetails: payout.manualDetails,
            provider: payout.provider,
            bankCode: payout.bankCode,
          }
          : null,
      };
    });

    return { items, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  async updateWithdrawalStatus(id: number, status: string, failureReason?: string) {
    const withdrawal = await this.withdrawalRepo.findOne({ where: { id } });
    if (!withdrawal) return null;
    const payout = await this.payoutMethodRepo.findOne({ where: { id: withdrawal.payoutMethodId } });
    withdrawal.status = status;
    if (failureReason) withdrawal.failureReason = failureReason;
    await this.withdrawalRepo.save(withdrawal);
    if (status === 'failed' || status === 'cancelled') {
      await this.walletService.credit(withdrawal.userId, Number(withdrawal.amount), 'refund', withdrawal.reference || undefined, 'Withdrawal refunded');
      await this.notificationsService.create({
        userId: withdrawal.userId,
        type: 'withdrawal_failed',
        title: 'Withdrawal Rejected',
        message: `Your withdrawal of ${withdrawal.currency || 'GHS'} ${Number(withdrawal.amount).toFixed(2)} was not completed. A refund has been credited.${failureReason ? ` Reason: ${failureReason}` : ''}`,
        link: '/wallet',
        icon: 'alert',
        sendEmail: true,
        metadata: { amount: Number(withdrawal.amount).toFixed(2), reason: failureReason ?? '' },
      }).catch(() => {});
    } else if (status === 'completed') {
      await this.notificationsService.create({
        userId: withdrawal.userId,
        type: 'withdrawal_done',
        title: 'Withdrawal Completed',
        message: `Your withdrawal of ${withdrawal.currency || 'GHS'} ${Number(withdrawal.amount).toFixed(2)} has been processed and sent to ${payout?.displayName || 'your payout method'}.`,
        link: '/wallet',
        icon: 'wallet',
        sendEmail: true,
        metadata: { amount: Number(withdrawal.amount).toFixed(2) },
      }).catch(() => {});
    }
    return withdrawal;
  }

  // Payout Methods Management
  async getAllPayoutMethods(params: { userId?: number; limit?: number }) {
    const limit = Math.min(100, params.limit ?? 50);
    const qb = this.payoutMethodRepo.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');
    if (params.userId) qb.andWhere('p.userId = :userId', { userId: params.userId });
    return qb.take(limit).getMany();
  }

  // Pick Management
  async updatePickStatus(id: number, status: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) return null;
    ticket.status = status;
    await this.ticketRepo.save(ticket);
    return ticket;
  }

  /**
   * Admin-only: Complete coupon deletion with escrow refund, AI prediction cleanup,
   * and tipster stats recalculation. Safe for live system.
   */
  async deletePick(id: number): Promise<{ ok: boolean; refundedCount?: number; tipsterStatsRecalculated?: boolean }> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      select: ['id', 'userId', 'title', 'result'],
    });
    if (!ticket) throw new NotFoundException('Coupon not found');

    const accumulatorId = id;
    const sellerId = ticket.userId;

    // 1. Refund any held escrow (buyers who purchased before settlement)
    const heldFunds = await this.escrowRepo.find({
      where: { pickId: accumulatorId, status: 'held' },
    });

    const processedUsers = new Set<number>();
    for (const f of heldFunds) {
      if (!processedUsers.has(f.userId)) {
        const gross = Number(f.amount);
        await this.walletService.credit(
          f.userId,
          gross,
          'refund',
          `pick-${accumulatorId}-admin-delete`,
          `Refund: coupon deleted by admin ("${ticket.title}")`,
        );
        await this.notificationsService.create({
          userId: f.userId,
          type: 'settlement',
          title: 'Coupon Refunded',
          message: `A coupon you purchased ("${ticket.title}") was removed by admin. GHS ${gross.toFixed(2)} has been refunded to your wallet.`,
          link: '/my-purchases',
          icon: 'refund',
          sendEmail: true,
          metadata: { pickTitle: ticket.title, amount: gross.toFixed(2) },
        }).catch(() => {});
        processedUsers.add(f.userId);
      }
      f.status = 'refunded';
      await this.escrowRepo.save(f);
    }

    // 2. Delete AI prediction + fixtures (if linked)
    const listing = await this.marketplaceRepo.findOne({
      where: { accumulatorId },
      select: ['predictionId'],
    });
    if (listing?.predictionId) {
      await this.predictionFixtureRepo.delete({ predictionId: listing.predictionId });
      await this.predictionRepo.delete(listing.predictionId);
      this.logger.log(`Deleted AI prediction ${listing.predictionId} for coupon ${accumulatorId}`);
    }

    // 3. Delete coupon (CASCADE removes picks, marketplace, purchases, escrow, reactions, etc.)
    await this.ticketRepo.delete(accumulatorId);

    // 4. Recalculate tipster stats from remaining tickets
    const tipsterStatsRecalculated = await this.tipstersApiService.recalculateAndPersistTipsterStats(sellerId);

    // 5. Update leaderboard rankings
    await this.resultTrackerService.updateLeaderboardNow().catch((err) => {
      this.logger.warn(`Leaderboard update after coupon delete failed: ${err?.message}`);
    });

    this.logger.log(`Admin deleted coupon ${accumulatorId} (tipster ${sellerId}). Refunded: ${processedUsers.size}`);

    return {
      ok: true,
      refundedCount: processedUsers.size,
      tipsterStatsRecalculated,
    };
  }

  // Marketplace Management
  async updateMarketplaceListing(accumulatorId: number, data: { price?: number; status?: string; maxPurchases?: number }) {
    const listing = await this.marketplaceRepo.findOne({ where: { accumulatorId } });
    if (!listing) return null;
    if (data.price !== undefined) listing.price = data.price;
    if (data.status !== undefined) listing.status = data.status;
    if (data.maxPurchases !== undefined) listing.maxPurchases = data.maxPurchases;
    await this.marketplaceRepo.save(listing);
    return listing;
  }

  async removeMarketplaceListing(accumulatorId: number) {
    const listing = await this.marketplaceRepo.findOne({ where: { accumulatorId } });
    if (!listing) return null;
    listing.status = 'removed';
    await this.marketplaceRepo.save(listing);
    return listing;
  }

  // Escrow Management
  async updateEscrowStatus(id: number, status: string) {
    const escrow = await this.escrowRepo.findOne({ where: { id } });
    if (!escrow) return null;
    escrow.status = status;
    await this.escrowRepo.save(escrow);
    return escrow;
  }

  // Wallet Management
  async adjustWalletBalance(userId: number, amount: number, reason: string) {
    const wallet = await this.walletsRepo.findOne({ where: { userId } });
    if (!wallet) throw new BadRequestException('Wallet not found');
    const currentBalance = Number(wallet.balance);
    wallet.balance = Number((currentBalance + amount).toFixed(2));
    await this.walletsRepo.save(wallet);
    await this.txRepo.save({
      userId,
      type: amount > 0 ? 'commission' : 'payout',
      amount,
      currency: 'GHS',
      status: 'completed',
      description: reason,
    });
    return wallet;
  }

  async freezeWallet(userId: number, freeze: boolean) {
    const wallet = await this.walletsRepo.findOne({ where: { userId } });
    if (!wallet) throw new BadRequestException('Wallet not found');
    wallet.status = freeze ? 'frozen' : 'active';
    await this.walletsRepo.save(wallet);
    return wallet;
  }

  /** Admin impersonation - allows admin to login as any user. JWT payload matches auth login (sub, email) so token is valid for JwtStrategy. */
  async impersonateUser(userId: number, adminId: number) {
    const logger = new Logger(AdminService.name);
    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      // Use AuthService so token matches login flow exactly (same JWT config, verifiable by JwtStrategy)
      const token = this.authService.createTokenForUser(user);

      // Log the impersonation action after success; never let audit failure affect the response
      try {
        await this.dataSource.query(
          `INSERT INTO admin_actions (action_type, entity_type, entity_id, admin_user, notes) 
           VALUES ($1, $2, $3, $4, $5)`,
          ['impersonate', 'user', userId, String(adminId), `Impersonated user ${user.email || user.username}`]
        );
      } catch {
        // admin_actions table may not exist yet
      }

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
      };
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      logger.error(`Impersonation failed for user ${userId}: ${err?.message || err}`);
      throw new InternalServerErrorException('Impersonation failed. Please try again or check server logs.');
    }
  }
}
