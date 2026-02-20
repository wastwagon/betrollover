import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { AccumulatorTicket } from './entities/accumulator-ticket.entity';
import { AccumulatorPick } from './entities/accumulator-pick.entity';
import { PickMarketplace } from './entities/pick-marketplace.entity';
import { PickReaction } from './entities/pick-reaction.entity';
import { EscrowFund } from './entities/escrow-fund.entity';
import { UserPurchasedPick } from './entities/user-purchased-pick.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FootballService } from '../football/football.service';
import { TipsterService } from '../tipster/tipster.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { TipsterFollow } from '../predictions/entities/tipster-follow.entity';

export interface CreateAccumulatorDto {
  title: string;
  description?: string;
  price: number;
  isMarketplace: boolean;
  /** Placement: 'marketplace' | 'subscription' | 'both' (default: marketplace) */
  placement?: string;
  /** If placement includes subscription: package IDs to add coupon to */
  subscriptionPackageIds?: number[];
  selections: {
    fixtureId?: number;
    matchDescription: string;
    prediction: string;
    odds: number;
    matchDate?: string;
  }[];
}

@Injectable()
export class AccumulatorsService {
  private readonly logger = new Logger(AccumulatorsService.name);

  constructor(
    @InjectRepository(AccumulatorTicket)
    private ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(AccumulatorPick)
    private pickRepo: Repository<AccumulatorPick>,
    @InjectRepository(PickMarketplace)
    private marketplaceRepo: Repository<PickMarketplace>,
    @InjectRepository(PickReaction)
    private reactionRepo: Repository<PickReaction>,
    @InjectRepository(EscrowFund)
    private escrowRepo: Repository<EscrowFund>,
    @InjectRepository(UserPurchasedPick)
    private purchasedRepo: Repository<UserPurchasedPick>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(TipsterFollow)
    private tipsterFollowRepo: Repository<TipsterFollow>,
    private walletService: WalletService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private footballService: FootballService,
    private tipsterService: TipsterService,
    private subscriptionsService: SubscriptionsService,
    private dataSource: DataSource,
  ) { }

  async create(userId: number, dto: CreateAccumulatorDto) {
    // Validate inputs
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('Title is required');
    }

    // Check for duplicate title for this user to prevent unique constraint violation
    const existingTitle = await this.ticketRepo.findOne({
      where: { userId, title: dto.title.trim() }
    });
    if (existingTitle) {
      throw new BadRequestException(`You already have a coupon with the title "${dto.title}". Please use a different title.`);
    }

    if (dto.title.length > 255) {
      throw new BadRequestException('Title must be 255 characters or less');
    }
    if (dto.selections.length === 0) {
      throw new BadRequestException('At least one selection is required');
    }
    if (dto.selections.length > 20) {
      throw new BadRequestException('Maximum 20 selections allowed per coupon');
    }

    // Validate price
    if (dto.price < 0) {
      throw new BadRequestException('Price cannot be negative');
    }
    if (dto.price > 10000) {
      throw new BadRequestException('Price cannot exceed GHS 10,000');
    }

    // Validate selections
    for (const selection of dto.selections) {
      if (!selection.matchDescription || selection.matchDescription.trim().length === 0) {
        throw new BadRequestException('Match description is required for all selections');
      }
      if (!selection.prediction || selection.prediction.trim().length === 0) {
        throw new BadRequestException('Prediction is required for all selections');
      }
      if (!selection.odds || selection.odds < 1.0) {
        throw new BadRequestException('Odds must be at least 1.0');
      }
      if (selection.odds > 1000) {
        throw new BadRequestException('Odds cannot exceed 1000');
      }
      if (dto.isMarketplace && (!selection.fixtureId || selection.fixtureId < 1)) {
        throw new BadRequestException('Fixture ID is required for all selections when listing on marketplace (needed for settlement)');
      }
    }

    // Default price to 0 (free) if not provided or invalid
    const price = dto.price && dto.price > 0 ? dto.price : 0;
    const placement = (dto.placement || 'marketplace') as string;

    // ROI check: only for paid picks sold on marketplace. Skip for subscription-only (access via subscription package).
    if (price > 0 && placement !== 'subscription') {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      // Get minimum ROI from settings (fallback to 20 if table/row missing)
      let minimumROI = 20.0;
      try {
        const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
        minimumROI = Number(apiSettings?.minimumROI ?? 20.0);
      } catch {
        this.logger.warn('Could not load minimumROI from api_settings, using default 20');
      }

      // Get user's stats and ROI
      const stats = await this.tipsterService.getStats(userId, user.role);

      if (stats.roi < minimumROI) {
        throw new BadRequestException(
          `You need a minimum ROI of ${minimumROI}% to sell paid coupons. Your current ROI is ${stats.roi.toFixed(2)}%. Continue creating free picks to improve your ROI.`
        );
      }
    }

    const totalOdds = dto.selections.reduce((a, s) => a * s.odds, 1);
    // Auto-approve ALL coupons (both free and paid) - they become immediately available on marketplace
    const ticket = this.ticketRepo.create({
      userId,
      title: dto.title,
      description: dto.description || 'N/A',
      totalPicks: dto.selections.length,
      totalOdds: Math.round(totalOdds * 1000) / 1000,
      price: price, // Use validated/defaulted price
      status: 'active', // All coupons are auto-approved
      result: 'pending',
      isMarketplace: dto.isMarketplace,
    });
    await this.ticketRepo.save(ticket);

    // Store fixtures on-demand (only if fixtureId provided)
    for (const s of dto.selections) {
      let fixtureId = s.fixtureId;

      // If fixture ID provided: lookup by apiId first (external), then by id (internal)
      if (s.fixtureId && typeof s.fixtureId === 'number') {
        let existingFixture = await this.fixtureRepo.findOne({
          where: { apiId: s.fixtureId },
        });
        if (!existingFixture) {
          existingFixture = await this.fixtureRepo.findOne({
            where: { id: s.fixtureId },
          });
        }

        if (!existingFixture) {
          // Fetch fixture from API and store it
          try {
            const apiFixtures = await this.footballService.getFixtures(
              s.matchDate ? new Date(s.matchDate).toISOString().split('T')[0] : undefined
            );
            const apiFixture = apiFixtures.find((f: any) => f.fixture.id === s.fixtureId);

            if (apiFixture) {
              const newFixture = this.fixtureRepo.create({
                apiId: apiFixture.fixture.id,
                homeTeamName: apiFixture.teams.home.name,
                awayTeamName: apiFixture.teams.away.name,
                leagueName: apiFixture.league.name,
                matchDate: new Date(apiFixture.fixture.date),
                status: apiFixture.fixture.status.short,
                homeScore: apiFixture.goals?.home ?? null,
                awayScore: apiFixture.goals?.away ?? null,
                syncedAt: new Date(),
              });
              const savedFixture = await this.fixtureRepo.save(newFixture);
              fixtureId = savedFixture.id;
            }
          } catch (error) {
            // If API fetch fails, continue without fixtureId (pick will still work)
            this.logger.warn(
              `Failed to fetch fixture ${s.fixtureId} from API, continuing without fixture reference`,
              error instanceof Error ? error.stack : String(error),
            );
          }
        } else {
          fixtureId = existingFixture.id;
        }
      }

      const pick = this.pickRepo.create({
        accumulatorId: ticket.id,
        fixtureId: fixtureId || null,
        matchDescription: s.matchDescription,
        prediction: s.prediction,
        odds: s.odds,
        matchDate: s.matchDate ? new Date(s.matchDate) : null,
      });
      await this.pickRepo.save(pick);
    }

    if (dto.isMarketplace) {
      const placement = (dto.placement || 'marketplace') as string;
      const subPackageIds = dto.subscriptionPackageIds ?? [];
      const firstPackageId = subPackageIds[0] ?? null;
      await this.marketplaceRepo.save({
        accumulatorId: ticket.id,
        sellerId: userId,
        price: dto.price,
        status: 'active',
        maxPurchases: dto.price === 0 ? 999999 : 999999,
        placement: ['marketplace', 'subscription', 'both'].includes(placement) ? placement : 'marketplace',
        subscriptionPackageId: firstPackageId,
      });
      if ((placement === 'subscription' || placement === 'both') && subPackageIds.length > 0) {
        await this.subscriptionsService.addCouponToPackages(ticket.id, subPackageIds);
      }
      await this.notificationsService.create({
        userId,
        type: 'pick_published',
        title: 'Pick Published',
        message: price > 0
          ? `Your pick "${ticket.title}" is now live on the marketplace at GHS ${price.toFixed(2)}.`
          : `Your free pick "${ticket.title}" is now live on the marketplace.`,
        link: '/marketplace',
        icon: 'check',
        sendEmail: true,
        metadata: { pickTitle: ticket.title },
      }).catch(() => { });

      const creator = await this.usersRepo.findOne({ where: { id: userId }, select: ['displayName', 'username'] });
      const creatorName = creator?.displayName || creator?.username || 'Tipster';
      this.emailService.sendAdminNotification({
        type: 'new_coupon_posted',
        metadata: {
          pickTitle: ticket.title,
          creatorName,
          price,
          isFree: price === 0,
        },
      }).catch(() => { });

      // Notify followers that this tipster posted a new pick (email)
      const tipster = await this.tipsterRepo.findOne({ where: { userId }, select: ['id', 'displayName'] });
      if (tipster) {
        const follows = await this.tipsterFollowRepo.find({
          where: { tipsterId: tipster.id },
          select: ['userId'],
        });
        const followerIds = follows.map((f) => f.userId).filter((id) => id !== userId);
        const tipsterName = tipster.displayName || creatorName;
        const pickLink = `/marketplace`;
        for (const followerId of followerIds) {
          this.notificationsService.create({
            userId: followerId,
            type: 'new_pick_from_followed',
            title: 'New Pick from Tipster You Follow',
            message: `${tipsterName} posted a new pick "${ticket.title}"${price > 0 ? ` at GHS ${price.toFixed(2)}` : ' (free)'}.`,
            link: pickLink,
            icon: 'bell',
            sendEmail: true,
            metadata: { tipsterName, pickTitle: ticket.title },
          }).catch(() => {});
        }
      }
    } else if (dto.placement === 'subscription' && (dto.subscriptionPackageIds?.length ?? 0) > 0) {
      // Subscription-only: add coupon to packages (no marketplace entry)
      await this.subscriptionsService.addCouponToPackages(ticket.id, dto.subscriptionPackageIds!);
    }

    return this.getById(ticket.id);
  }

  private async enrichPicksWithFixtureScores<T extends { picks?: Array<{ fixtureId?: number | null }> }>(tickets: T[]): Promise<T[]> {
    const fixtureIds = [...new Set(tickets.flatMap((t) => (t.picks || []).map((p) => p.fixtureId).filter(Boolean) as number[]))];
    if (fixtureIds.length === 0) return tickets;
    const fixtures = await this.fixtureRepo.find({ where: { id: In(fixtureIds) }, select: ['id', 'homeScore', 'awayScore', 'status'] });
    const fixtureMap = new Map(fixtures.map((f) => [f.id, f]));
    return tickets.map((t) => ({
      ...t,
      picks: (t.picks || []).map((p: any) => {
        const fix = p.fixtureId ? fixtureMap.get(p.fixtureId) : null;
        return {
          ...p,
          homeScore: fix?.homeScore ?? null,
          awayScore: fix?.awayScore ?? null,
          fixtureStatus: fix?.status ?? null,
          status: p.result || 'pending'
        };
      }),
    })) as T[];
  }

  async getById(id: number) {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['picks'],
    });
    if (!ticket) return null;
    const [enriched] = await this.enrichPicksWithFixtureScores([ticket]);
    return enriched;
  }

  async getMyAccumulators(userId: number) {
    const tickets = await this.ticketRepo.find({
      where: { userId },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });
    return this.enrichPicksWithFixtureScores(tickets);
  }

  async getPurchased(userId: number) {
    const purchased = await this.purchasedRepo.find({
      where: { userId },
      order: { purchasedAt: 'DESC' },
    });
    const accIds = purchased.map((p) => p.accumulatorId);
    if (accIds.length === 0) return [];
    const tickets = await this.ticketRepo.find({
      where: { id: In(accIds) },
      relations: ['picks'],
    });
    const enrichedTickets = await this.enrichPicksWithFixtureScores(tickets);
    const ticketMap = new Map(enrichedTickets.map((t) => [t.id, t]));
    return purchased.map((p) => ({
      ...p,
      pick: ticketMap.get(p.accumulatorId),
    }));
  }

  /** Subscription feed: coupons from tipsters the user is subscribed to */
  async getSubscriptionFeed(userId: number, options?: { limit?: number; offset?: number }) {
    const accIds = await this.subscriptionsService.getMySubscriptionCoupons(userId);
    if (accIds.length === 0) return { items: [], total: 0, hasMore: false };

    const tickets = await this.ticketRepo.find({
      where: { id: In(accIds), status: 'active' },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });
    const enrichedTickets = await this.enrichPicksWithFixtureScores(tickets);
    const rows = await this.marketplaceRepo.find({
      where: { accumulatorId: In(accIds), status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount'],
    });
    const items = await this.enrichWithTipsterMetadata(enrichedTickets, rows, userId);
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);
    const paginated = items.slice(offset, offset + limit);
    return {
      items: paginated,
      total: items.length,
      hasMore: offset + paginated.length < items.length,
    };
  }

  async getMarketplace(userId: number, includeAllListings = false, options?: { limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);

    const rows = await this.marketplaceRepo.find({
      where: { status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount'],
    });
    const accIds = rows.map((r) => r.accumulatorId);
    if (accIds.length === 0) {
      this.logger.debug(`getMarketplace: no active pick_marketplace rows`);
      return { items: [], total: 0, hasMore: false };
    }

    const ticketWhere: any = { id: In(accIds) };
    if (!includeAllListings) {
      ticketWhere.status = 'active';
      ticketWhere.result = 'pending';
    }
    const tickets = await this.ticketRepo.find({
      where: ticketWhere,
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });

    const enrichedTickets = await this.enrichPicksWithFixtureScores(tickets);

    // Filter out coupons where any fixture has already started (unless includeAllListings for admin)
    const now = new Date();
    const validTickets = includeAllListings ? enrichedTickets : enrichedTickets.filter(ticket => {
      if (!ticket.picks || ticket.picks.length === 0) return false;
      const hasStartedFixture = ticket.picks.some((pick: any) => {
        if (!pick.matchDate) return false;
        return new Date(pick.matchDate) <= now;
      });
      return !hasStartedFixture;
    });

    const total = validTickets.length;
    if (enrichedTickets.length > 0 && validTickets.length === 0) {
      this.logger.debug(`getMarketplace: ${enrichedTickets.length} coupons filtered out (fixtures started)`);
    }
    const paginated = validTickets.slice(offset, offset + limit);
    const items = await this.enrichWithTipsterMetadata(paginated, rows, userId);
    return { items, total, hasMore: offset + items.length < total };
  }

  /** Unified method to add tipster rankings, stats, prices, and reactions to tickets */
  private async enrichWithTipsterMetadata(validTickets: AccumulatorTicket[], marketplaceRows: PickMarketplace[], currentUserId?: number) {
    // Get unique tipster IDs
    const tipsterIds = [...new Set(validTickets.map(t => t.userId))];

    // Calculate tipster stats using SQL aggregation (fixes N+1 query)
    const tipsterStatsMap = new Map<number, { winRate: number; totalPicks: number; wonPicks: number; lostPicks: number; rank: number }>();

    if (tipsterIds.length > 0) {
      // Use raw query for efficient aggregation instead of fetching all records
      const statsQuery = await this.ticketRepo
        .createQueryBuilder('ticket')
        .select('ticket.user_id', 'userId')
        .addSelect('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN ticket.result = :won THEN 1 ELSE 0 END)', 'won')
        .addSelect('SUM(CASE WHEN ticket.result = :lost THEN 1 ELSE 0 END)', 'lost')
        .where('ticket.user_id IN (:...tipsterIds)', { tipsterIds })
        .setParameter('won', 'won')
        .setParameter('lost', 'lost')
        .groupBy('ticket.user_id')
        .getRawMany();

      // Calculate stats per tipster from aggregated results
      const statsByTipster = new Map<number, { total: number; won: number; lost: number }>();
      statsQuery.forEach((row: any) => {
        statsByTipster.set(Number(row.userId), {
          total: Number(row.total) || 0,
          won: Number(row.won) || 0,
          lost: Number(row.lost) || 0,
        });
      });

      // Calculate win rates and create ranking
      const tipsterRankings = Array.from(statsByTipster.entries())
        .map(([userId, stats]) => {
          const settled = stats.won + stats.lost;
          const winRate = settled > 0 ? (stats.won / settled) * 100 : 0;
          return { userId, winRate, totalPicks: stats.total, wonPicks: stats.won, lostPicks: stats.lost };
        })
        .sort((a, b) => {
          // Sort by win rate first, then by total picks
          if (Math.abs(a.winRate - b.winRate) > 0.1) {
            return b.winRate - a.winRate;
          }
          return b.totalPicks - a.totalPicks;
        });

      // Assign ranks
      tipsterRankings.forEach((tipster, index) => {
        tipsterStatsMap.set(tipster.userId, {
          ...tipster,
          rank: index + 1,
        });
      });
    }

    // Get tipster display names and avatars
    const tipsters = await this.usersRepo.find({
      where: { id: In(tipsterIds) },
      select: ['id', 'displayName', 'username', 'avatar'],
    });
    const tipsterMap = new Map(tipsters.map(t => [t.id, t]));

    // Create price & purchase count maps
    const priceMap = new Map(marketplaceRows.map(r => [r.accumulatorId, Number(r.price)]));
    const purchaseCountMap = new Map(marketplaceRows.map(r => [r.accumulatorId, r.purchaseCount || 0]));
    const viewCountMap = new Map(marketplaceRows.map(r => [r.accumulatorId, r.viewCount || 0]));

    // Reaction counts and user's reacted state
    const accIds = validTickets.map(t => t.id);
    const reactionCountMap = new Map<number, number>();
    let userReactedSet = new Set<number>();
    if (accIds.length > 0) {
      const counts = await this.reactionRepo.createQueryBuilder('r')
        .select('r.accumulatorId', 'aid')
        .addSelect('COUNT(*)', 'cnt')
        .where('r.accumulatorId IN (:...ids)', { ids: accIds })
        .groupBy('r.accumulatorId')
        .getRawMany();
      counts.forEach((r: { aid: number; cnt: string }) => reactionCountMap.set(Number(r.aid), parseInt(r.cnt, 10)));
      if (currentUserId) {
        const reacted = await this.reactionRepo.find({ where: { userId: currentUserId, accumulatorId: In(accIds) }, select: ['accumulatorId'] });
        userReactedSet = new Set(reacted.map(r => r.accumulatorId));
      }
    }

    // Enrich tickets with tipster data
    return validTickets.map(ticket => {
      const tipster = tipsterMap.get(ticket.userId);
      const stats = tipsterStatsMap.get(ticket.userId) || { winRate: 0, totalPicks: 0, wonPicks: 0, lostPicks: 0, rank: 0 };

      return {
        ...ticket,
        price: priceMap.get(ticket.id) ?? ticket.price,
        purchaseCount: purchaseCountMap.get(ticket.id) ?? 0,
        viewCount: viewCountMap.get(ticket.id) ?? 0,
        reactionCount: reactionCountMap.get(ticket.id) ?? 0,
        hasReacted: userReactedSet.has(ticket.id),
        tipster: tipster ? {
          id: tipster.id,
          displayName: tipster.displayName,
          username: tipster.username,
          avatarUrl: tipster.avatar,
          winRate: Math.round(stats.winRate * 10) / 10,
          totalPicks: stats.totalPicks,
          wonPicks: stats.wonPicks,
          lostPicks: stats.lostPicks,
          rank: stats.rank,
        } : null,
      };
    });
  }

  /** Free Tip of the Day: latest coupon from The Gambler (in marketplace). No auth. */
  async getFreeTipOfTheDay() {
    const gambler = await this.usersRepo.findOne({
      where: { username: 'TheGambler', role: UserRole.TIPSTER },
      select: ['id'],
    });
    if (!gambler) return null;

    const tickets = await this.ticketRepo.find({
      where: {
        userId: gambler.id,
        status: 'active',
        result: 'pending',
        isMarketplace: true,
      },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
      take: 5,
    });
    if (tickets.length === 0) return null;

    const accIds = tickets.map((t) => t.id);
    const rows = await this.marketplaceRepo.find({
      where: { accumulatorId: In(accIds), status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount'],
    });

    const enriched = await this.enrichPicksWithFixtureScores(tickets);
    const now = new Date();
    const valid = enriched.filter((t: any) => {
      if (!t.picks?.length) return false;
      return !t.picks.some((p: any) => p.matchDate && new Date(p.matchDate) <= now);
    });
    // Only return coupons that have an active marketplace listing
    const validWithListing = valid.filter((t) => rows.some((r) => r.accumulatorId === t.id));
    if (validWithListing.length === 0) return null;

    const ticket = validWithListing[0];
    const row = rows.find((r) => r.accumulatorId === ticket.id);
    const items = await this.enrichWithTipsterMetadata([ticket], row ? [row] : []);
    return items[0] ?? null;
  }

  /** Popular upcoming events: fixtures with most picks in active coupons. No auth. */
  async getPopularEvents(limit = 6) {
    const now = new Date();
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('ap.fixture_id', 'fixtureId')
      .addSelect('COUNT(*)', 'tipCount')
      .addSelect('f.home_team_name', 'homeTeam')
      .addSelect('f.away_team_name', 'awayTeam')
      .addSelect('f.league_name', 'leagueName')
      .addSelect('f.match_date', 'matchDate')
      .from('accumulator_picks', 'ap')
      .innerJoin('fixtures', 'f', 'f.id = ap.fixture_id')
      .where('ap.fixture_id IS NOT NULL')
      .andWhere('f.match_date > :now', { now })
      .andWhere('f.status IN (:...statuses)', { statuses: ['NS', 'TBD'] })
      .groupBy('ap.fixture_id')
      .addGroupBy('f.id')
      .addGroupBy('f.home_team_name')
      .addGroupBy('f.away_team_name')
      .addGroupBy('f.league_name')
      .addGroupBy('f.match_date')
      .addOrderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((r: any) => ({
      fixtureId: Number(r.fixtureId),
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      leagueName: r.leagueName,
      matchDate: r.matchDate,
      tipCount: parseInt(r.tipCount, 10) || 0,
    }));
  }

  /** Public stats for homepage - no auth required */
  async getPublicStats() {
    const [
      tipsterCount,
      totalPicks,
      activeMarketplace,
      purchaseCount,
      totalRevenue,
      wonPicks,
      lostPicks,
    ] = await Promise.all([
      this.usersRepo.count({ where: { role: UserRole.TIPSTER } }),
      this.ticketRepo.count(),
      this.marketplaceRepo.count({ where: { status: 'active' } }),
      this.purchasedRepo.count(),
      this.purchasedRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.purchase_price), 0)', 'total')
        .getRawOne()
        .then((r) => Number(r?.total ?? 0)),
      this.ticketRepo.count({ where: { result: 'won' } }),
      this.ticketRepo.count({ where: { result: 'lost' } }),
    ]);
    const settled = wonPicks + lostPicks;
    const winRate = settled > 0 ? Math.round((wonPicks / settled) * 100) : 0;
    return {
      verifiedTipsters: tipsterCount,
      totalPicks,
      activePicks: activeMarketplace,
      successfulPurchases: purchaseCount,
      winRate,
      totalPaidOut: Math.round(totalRevenue),
    };
  }

  async getMarketplacePublic(limit = 4) {
    const rows = await this.marketplaceRepo.find({
      where: { status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount'],
      order: { purchaseCount: 'DESC' },
      take: limit,
    });
    const accIds = rows.map((r) => r.accumulatorId);
    if (accIds.length === 0) return [];
    const tickets = await this.ticketRepo.find({
      where: {
        id: In(accIds),
        status: 'active',
        result: 'pending',
      },
      relations: ['picks'],
    });

    const enrichedTickets = await this.enrichPicksWithFixtureScores(tickets);

    const now = new Date();
    const validTickets = enrichedTickets.filter((ticket: any) => {
      if (!ticket.picks || ticket.picks.length === 0) return false;
      const hasStartedFixture = ticket.picks.some((pick: any) => {
        if (!pick.matchDate) return false;
        return new Date(pick.matchDate) <= now;
      });
      return !hasStartedFixture;
    });

    return this.enrichWithTipsterMetadata(validTickets, rows);
  }

  async purchase(buyerId: number, accumulatorId: number) {
    return this.dataSource.transaction(async (manager) => {
        const ticketRepo = manager.getRepository(AccumulatorTicket);
        const marketplaceRepo = manager.getRepository(PickMarketplace);
        const purchasedRepo = manager.getRepository(UserPurchasedPick);
        const escrowRepo = manager.getRepository(EscrowFund);

        const ticket = await ticketRepo.findOne({
          where: { id: accumulatorId },
          relations: ['picks'],
        });
        if (!ticket) throw new NotFoundException('Pick not found');
        if (ticket.status !== 'active') throw new BadRequestException('Pick is not available');
        if (ticket.result !== 'pending') throw new BadRequestException('Pick has already settled');

        const listing = await marketplaceRepo.findOne({
          where: { accumulatorId, status: 'active' },
        });
        if (!listing) throw new NotFoundException('Pick not listed on marketplace');

        const existing = await purchasedRepo.findOne({
          where: { userId: buyerId, accumulatorId },
        });
        if (existing) throw new BadRequestException('You have already purchased this pick');

        const price = Number(listing.price);
        if (price > 0) {
          await this.walletService.debit(
            buyerId,
            price,
            'purchase',
            `pick-${accumulatorId}`,
            `Purchase of pick: ${ticket.title}`,
            manager,
          );
          try {
            await escrowRepo.save({
              userId: buyerId,
              pickId: accumulatorId,
              amount: price,
              reference: `pick-${accumulatorId}`,
              status: 'held',
            });
          } catch (escrowErr: any) {
            if (escrowErr?.code === '23505') {
              this.logger.warn(`Duplicate escrow for user ${buyerId} pick ${accumulatorId} (race). Refunding debit.`);
              await this.walletService.credit(buyerId, price, 'refund', `pick-${accumulatorId}-refund`, 'Refund: duplicate purchase attempt', manager);
              throw new BadRequestException('You have already purchased this pick. Please refresh the page.');
            }
            throw escrowErr;
          }
        }

        try {
          await purchasedRepo.save({
            userId: buyerId,
            accumulatorId,
            purchasePrice: price,
          });
        } catch (purchErr: any) {
          if (purchErr?.code === '23505' && price > 0) {
            await this.walletService.credit(buyerId, price, 'refund', `pick-${accumulatorId}-refund`, 'Refund: duplicate purchase attempt', manager);
          }
          if (purchErr?.code === '23505') {
            throw new BadRequestException('You have already purchased this pick. Please refresh the page.');
          }
          throw purchErr;
        }

      listing.purchaseCount += 1;
      await marketplaceRepo.save(listing);

      // Outside of heavy DB work, trigger notifications
      this.notificationsService.create({
        userId: buyerId,
        type: 'purchase',
        title: 'Purchase Complete',
        message: `You purchased "${ticket.title}". Funds are held in escrow until the pick settles.`,
        link: `/my-purchases`,
        icon: 'cart',
        sendEmail: true,
        metadata: { pickTitle: ticket.title },
      }).catch(() => { });

      const sellerId = ticket.userId;
      if (sellerId && sellerId !== buyerId) {
        this.notificationsService.create({
          userId: sellerId,
          type: 'coupon_sold',
          title: 'Coupon Sold',
          message: price > 0
            ? `Someone purchased "${ticket.title}" for GHS ${price.toFixed(2)}. Funds will be released to your wallet when the pick settles.`
            : `Someone claimed your free pick "${ticket.title}".`,
          link: '/my-picks',
          icon: 'cart',
          sendEmail: true,
          metadata: { pickTitle: ticket.title },
        }).catch(() => { });
      }

      return this.getById(accumulatorId);
    });
  }

  async react(userId: number, accumulatorId: number): Promise<{ success: boolean }> {
    if (userId == null || accumulatorId == null) {
      throw new BadRequestException('User and accumulator required');
    }
    const ticket = await this.ticketRepo.findOne({ where: { id: accumulatorId } });
    if (!ticket) throw new NotFoundException('Pick not found');
    const existing = await this.reactionRepo.findOne({ where: { userId, accumulatorId } });
    if (existing) return { success: true };
    try {
      await this.reactionRepo.save({ userId, accumulatorId, type: 'like' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`react failed for accumulator ${accumulatorId}: ${message}${stack ? `\n${stack}` : ''}`);
      throw new InternalServerErrorException(
        'Reaction could not be saved. If this persists, ensure migration 041_pick_reactions_created_at has been run.',
      );
    }
    return { success: true };
  }

  async unreact(userId: number, accumulatorId: number): Promise<{ success: boolean }> {
    await this.reactionRepo.delete({ userId, accumulatorId });
    return { success: true };
  }

  async recordView(accumulatorId: number): Promise<{ success: boolean }> {
    const listing = await this.marketplaceRepo.findOne({ where: { accumulatorId } });
    if (listing) {
      listing.viewCount = (listing.viewCount || 0) + 1;
      await this.marketplaceRepo.save(listing);
    }
    return { success: true };
  }
}
