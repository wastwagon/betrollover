import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { AccumulatorTicket } from './entities/accumulator-ticket.entity';
import { AccumulatorPick } from './entities/accumulator-pick.entity';
import { PickMarketplace } from './entities/pick-marketplace.entity';
import { EscrowFund } from './entities/escrow-fund.entity';
import { UserPurchasedPick } from './entities/user-purchased-pick.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FootballService } from '../football/football.service';
import { TipsterService } from '../tipster/tipster.service';
import { ApiSettings } from '../admin/entities/api-settings.entity';

export interface CreateAccumulatorDto {
  title: string;
  description?: string;
  price: number;
  isMarketplace: boolean;
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
    private walletService: WalletService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private footballService: FootballService,
    private tipsterService: TipsterService,
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

    // If user wants to set a price > 0, check ROI requirement
    if (price > 0) {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      // Get minimum ROI from settings
      const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
      const minimumROI = Number(apiSettings?.minimumROI ?? 20.0);

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

      // If API fixture ID provided but not in DB, fetch and store it
      if (s.fixtureId && typeof s.fixtureId === 'number') {
        const existingFixture = await this.fixtureRepo.findOne({
          where: { apiId: s.fixtureId },
        });

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
      await this.marketplaceRepo.save({
        accumulatorId: ticket.id,
        sellerId: userId,
        price: dto.price,
        status: 'active',
        maxPurchases: dto.price === 0 ? 999999 : 999999,
      });
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

  async getMarketplace(userId: number, includeAllListings = false) {
    const rows = await this.marketplaceRepo.find({
      where: { status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount'],
    });
    const accIds = rows.map((r) => r.accumulatorId);
    if (accIds.length === 0) return [];

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
      // Check if all picks have matchDate and none have started
      if (!ticket.picks || ticket.picks.length === 0) return false;

      // If any pick has started (matchDate <= now), exclude this coupon
      const hasStartedFixture = ticket.picks.some(pick => {
        if (!pick.matchDate) return false; // If no matchDate, we can't determine - exclude for safety
        return new Date(pick.matchDate) <= now;
      });

      return !hasStartedFixture;
    });

    return this.enrichWithTipsterMetadata(validTickets, rows);
  }

  /** Unified method to add tipster rankings, stats, and prices to tickets */
  private async enrichWithTipsterMetadata(validTickets: AccumulatorTicket[], marketplaceRows: PickMarketplace[]) {
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

    // Enrich tickets with tipster data
    return validTickets.map(ticket => {
      const tipster = tipsterMap.get(ticket.userId);
      const stats = tipsterStatsMap.get(ticket.userId) || { winRate: 0, totalPicks: 0, wonPicks: 0, lostPicks: 0, rank: 0 };

      return {
        ...ticket,
        price: priceMap.get(ticket.id) ?? ticket.price,
        purchaseCount: purchaseCountMap.get(ticket.id) ?? 0,
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

    // Filter out coupons where any fixture has already started
    const now = new Date();
    const validTickets = enrichedTickets.filter(ticket => {
      if (!ticket.picks || ticket.picks.length === 0) return false;
      const hasStartedFixture = ticket.picks.some(pick => {
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
          link: '/marketplace',
          icon: 'cart',
          sendEmail: true,
          metadata: { pickTitle: ticket.title },
        }).catch(() => { });
      }

      return this.getById(accumulatorId);
    });
  }
}
