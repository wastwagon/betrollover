import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager, IsNull } from 'typeorm';
import { AccumulatorTicket } from './entities/accumulator-ticket.entity';
import { AccumulatorBookingCodeCopy } from './entities/accumulator-booking-code-copy.entity';
import { AccumulatorPick } from './entities/accumulator-pick.entity';
import { PickMarketplace } from './entities/pick-marketplace.entity';
import { PickReaction } from './entities/pick-reaction.entity';
import { PickComment } from './entities/pick-comment.entity';
import { filterPickCommentContent } from './pick-comment-filter.util';
import { sanitizeText } from '../../common/sanitize.util';
import { EscrowFund } from './entities/escrow-fund.entity';
import { UserPurchasedPick } from './entities/user-purchased-pick.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { FootballService } from '../football/football.service';
import { TipsterService } from '../tipster/tipster.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { TipstersApiService } from '../predictions/tipsters-api.service';
import { ReferralsService } from '../referrals/referrals.service';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { clampPlatformCommissionPercent } from '../../common/platform-commission';
import { couponUserFacingRef } from '../../common/coupon-public-label';
import { isAllowedAfricanBookmakerKey } from '@betrollover/shared-types';

/** Sports that use sport_events table (eventId) rather than fixtures (fixtureId) */
const SPORT_EVENT_SPORTS = new Set(['basketball', 'rugby', 'mma', 'volleyball', 'hockey', 'american_football', 'tennis']);

const SPORT_DISPLAY_NAMES: Record<string, string> = {
  basketball: 'Basketball',
  rugby: 'Rugby',
  mma: 'MMA',
  volleyball: 'Volleyball',
  hockey: 'Hockey',
  american_football: 'American Football',
  tennis: 'Tennis',
  football: 'Football',
  multi: 'Multi-Sport',
};

export interface CreateAccumulatorDto {
  title: string;
  description?: string;
  price: number;
  isMarketplace: boolean;
  /**
   * Overall coupon sport: 'football' | 'basketball' | 'rugby' | … | 'multi' (mixed).
   * Used only for display; each selection carries its own `sport` for routing.
   */
  sport?: string;
  /** Placement: 'marketplace' | 'subscription' (default: marketplace). 'both' is rejected. */
  placement?: string;
  /** If placement includes subscription: package IDs to add coupon to */
  subscriptionPackageIds?: number[];
  /** Allowlisted bookmaker key; must be set together with bookingCode when either is provided */
  bookmakerKey?: string;
  bookingCode?: string;
  selections: {
    fixtureId?: number;
    /** For non-football sports: sport event ID from sport_events */
    eventId?: number;
    /** Per-selection sport — used to route to the correct table (fixture vs sport_event) */
    sport?: string;
    matchDescription: string;
    prediction: string;
    odds: number;
    matchDate?: string;
  }[];
}

type PickCommentTreeNode = {
  id: number;
  body: string;
  createdAt: Date;
  parentId: number | null;
  isOwn: boolean;
  user: { id: number; displayName: string; avatarUrl: string | null };
  replies: PickCommentTreeNode[];
};

@Injectable()
export class AccumulatorsService {
  private readonly logger = new Logger(AccumulatorsService.name);

  constructor(
    @InjectRepository(AccumulatorTicket)
    private ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(AccumulatorBookingCodeCopy)
    private bookingCodeCopyRepo: Repository<AccumulatorBookingCodeCopy>,
    @InjectRepository(AccumulatorPick)
    private pickRepo: Repository<AccumulatorPick>,
    @InjectRepository(PickMarketplace)
    private marketplaceRepo: Repository<PickMarketplace>,
    @InjectRepository(PickReaction)
    private reactionRepo: Repository<PickReaction>,
    @InjectRepository(PickComment)
    private commentRepo: Repository<PickComment>,
    @InjectRepository(EscrowFund)
    private escrowRepo: Repository<EscrowFund>,
    @InjectRepository(UserPurchasedPick)
    private purchasedRepo: Repository<UserPurchasedPick>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(SportEvent)
    private sportEventRepo: Repository<SportEvent>,
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(WalletTransaction)
    private walletTxRepo: Repository<WalletTransaction>,
    private walletService: WalletService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private footballService: FootballService,
    private tipsterService: TipsterService,
    private subscriptionsService: SubscriptionsService,
    private referralsService: ReferralsService,
    private dataSource: DataSource,
    @Inject(forwardRef(() => TipstersApiService))
    private tipstersApiService: TipstersApiService,
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
      throw new BadRequestException(`You already have a pick with the title "${dto.title}". Please use a different title.`);
    }

    const policy = await this.loadSellingPolicy();
    if (policy.maxCouponsPerDay > 0 && !(await this.isExemptFromDailyCouponLimit(userId))) {
      const todayCount = await this.countCouponsCreatedUtcToday(userId);
      if (todayCount >= policy.maxCouponsPerDay) {
        throw new BadRequestException(
          `Daily pick limit reached (${policy.maxCouponsPerDay} per UTC day). You can create more after midnight UTC.`,
        );
      }
    }

    if (dto.title.length > 255) {
      throw new BadRequestException('Title must be 255 characters or less');
    }
    if (dto.selections.length === 0) {
      throw new BadRequestException('At least one selection is required');
    }
    if (dto.selections.length > 20) {
      throw new BadRequestException('Maximum 20 selections allowed per pick');
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
      // Use per-selection sport for routing validation, fall back to pick sport
      const selSport = (selection.sport || dto.sport || 'football').toLowerCase();
      if (dto.isMarketplace) {
        if (SPORT_EVENT_SPORTS.has(selSport)) {
          if (!selection.eventId || selection.eventId < 1) {
            throw new BadRequestException(`Event ID is required for ${selSport} selections when listing on marketplace (needed for settlement)`);
          }
        } else if (!selection.fixtureId || selection.fixtureId < 1) {
          throw new BadRequestException('Fixture ID is required for football selections when listing on marketplace (needed for settlement)');
        }
      }
    }

    let bookmakerKey: string | null = null;
    let bookingCode: string | null = null;
    const dtoBookie = (dto.bookmakerKey || '').trim().toLowerCase();
    const dtoCode = (dto.bookingCode || '').trim();
    if (dtoBookie || dtoCode) {
      if (!dtoBookie || !dtoCode) {
        throw new BadRequestException(
          'Bookmaker and booking code must both be filled in together, or leave both empty.',
        );
      }
      if (!isAllowedAfricanBookmakerKey(dtoBookie)) {
        throw new BadRequestException('Unsupported bookmaker.');
      }
      if (dtoCode.length > 128) {
        throw new BadRequestException('Booking code must be 128 characters or less.');
      }
      if (!/^[\sA-Za-z0-9\-_]+$/.test(dtoCode)) {
        throw new BadRequestException(
          'Booking code may only contain letters, numbers, spaces, hyphens, and underscores.',
        );
      }
      bookmakerKey = dtoBookie;
      bookingCode = dtoCode;
    }

    // Default price to 0 (free) if not provided or invalid
    const price = dto.price && dto.price > 0 ? dto.price : 0;
    const rawPlacement = (dto.placement || 'marketplace').toLowerCase().trim();
    if (rawPlacement === 'both') {
      throw new BadRequestException('Choose either marketplace or subscription — not both.');
    }
    const placementNorm: 'marketplace' | 'subscription' =
      rawPlacement === 'subscription' ? 'subscription' : 'marketplace';

    if (placementNorm === 'subscription') {
      if (dto.isMarketplace) {
        throw new BadRequestException('Subscription-only picks cannot be listed on the marketplace.');
      }
      if (!(dto.subscriptionPackageIds?.length)) {
        throw new BadRequestException('Select your VIP package for subscription-only picks.');
      }
    } else {
      if (!dto.isMarketplace) {
        throw new BadRequestException('Marketplace placement requires listing on the marketplace.');
      }
      if ((dto.subscriptionPackageIds?.length ?? 0) > 0) {
        throw new BadRequestException('Marketplace picks cannot be linked to a subscription package.');
      }
    }

    // ROI + win rate: any paid pick (marketplace or subscription-only). Aligns with VIP package rules.
    if (price > 0) {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const stats = await this.tipsterService.getStats(userId, user.role);
      const roiOk = stats.roi >= policy.minimumROI;
      const wrOk = stats.winRate >= policy.minimumWinRate;
      if (!roiOk || !wrOk) {
        const parts: string[] = [];
        if (!roiOk) {
          parts.push(`ROI ${stats.roi.toFixed(2)}% (minimum ${policy.minimumROI}%)`);
        }
        if (!wrOk) {
          parts.push(`win rate ${stats.winRate}% (minimum ${policy.minimumWinRate}%)`);
        }
        throw new BadRequestException(
          `Paid picks require both minimum ROI and win rate (marketplace or VIP subscribers). Current: ${parts.join('; ')}. Use price 0 (free) until your settled results meet every requirement.`,
        );
      }
    }

    // Determine overall sport display: 'Multi-Sport' if picks span more than one sport
    const selectionSports = new Set(
      dto.selections.map((s) => (s.sport || dto.sport || 'football').toLowerCase()),
    );
    const isMixedSport = selectionSports.size > 1 || (dto.sport === 'multi');
    const couponSport = isMixedSport
      ? 'multi'
      : selectionSports.values().next().value ?? (dto.sport || 'football').toLowerCase();
    const sportDisplay = isMixedSport
      ? 'Multi-Sport'
      : (SPORT_DISPLAY_NAMES[couponSport] ?? 'Football');

    const totalOdds = dto.selections.reduce((a, s) => a * s.odds, 1);
    // Auto-approve ALL picks (both free and paid) — they become immediately available on marketplace
    const ticket = this.ticketRepo.create({
      userId,
      title: dto.title,
      description: dto.description || 'N/A',
      sport: sportDisplay,
      totalPicks: dto.selections.length,
      totalOdds: Math.round(totalOdds * 1000) / 1000,
      price: price,
      status: 'active',
      result: 'pending',
      isMarketplace: dto.isMarketplace,
      bookmakerKey,
      bookingCode,
    });
    await this.ticketRepo.save(ticket);

    // Store picks: each selection routes to fixtures or sport_events based on its own sport
    for (const s of dto.selections) {
      let fixtureId: number | null = null;
      let eventId: number | null = null;
      // Use per-selection sport, fall back to coupon-level sport
      const pickSport = (s.sport || couponSport || 'football').toLowerCase();

      if (SPORT_EVENT_SPORTS.has(pickSport) && s.eventId && typeof s.eventId === 'number') {
        const event = await this.sportEventRepo.findOne({
          where: { id: s.eventId, sport: pickSport },
          select: ['id'],
        });
        if (event) eventId = event.id;
      }

      // Football: fixture ID provided - lookup by apiId first (external), then by id (internal)
      if (pickSport === 'football' && s.fixtureId && typeof s.fixtureId === 'number') {
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
        eventId,
        sport: pickSport,
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
        placement: 'marketplace',
        subscriptionPackageId: null,
      });
      await this.notificationsService.create({
        userId,
        type: 'pick_published',
        title: 'Pick Published',
        message:
          price > 0
            ? `Your pick is now live on the marketplace at GHS ${price.toFixed(2)}.`
            : `Your free pick is now live on the marketplace.`,
        link: '/marketplace',
        icon: 'check',
        sendEmail: true,
        metadata: { pickId: String(ticket.id), pickTitle: dto.title || '' },
      }).catch(() => { });

      const creator = await this.usersRepo.findOne({ where: { id: userId }, select: ['displayName', 'username'] });
      const creatorName = creator?.displayName || creator?.username || 'Tipster';
      this.emailService.sendAdminNotification({
        type: 'new_coupon_posted',
        metadata: {
          couponId: ticket.id,
          creatorName,
          price,
          isFree: price === 0,
        },
      }).catch(() => { });

      const tipster = await this.tipsterRepo.findOne({ where: { userId }, select: ['id', 'displayName'] });
      if (tipster) {
        await this.notificationsService.notifyFollowersOfNewCoupon({
          tipsterId: tipster.id,
          tipsterUserId: userId,
          tipsterDisplayName: tipster.displayName || creatorName,
          couponTitle: dto.title,
          price,
          accumulatorId: ticket.id,
          couponCard:
            price === 0
              ? {
                  totalOdds: Number(ticket.totalOdds),
                  isSubscription: false,
                  legs: dto.selections.map((s) => ({
                    matchDescription: s.matchDescription,
                    prediction: s.prediction,
                    odds: Number(s.odds),
                    matchDate: s.matchDate || null,
                  })),
                }
              : undefined,
        });
      }
    } else if (placementNorm === 'subscription' && (dto.subscriptionPackageIds?.length ?? 0) > 0) {
      // Subscription-only: add coupon to packages (no marketplace listing)
      await this.subscriptionsService.addCouponToPackages(ticket.id, dto.subscriptionPackageIds!, userId);
      const creator = await this.usersRepo.findOne({ where: { id: userId }, select: ['displayName', 'username'] });
      const creatorName = creator?.displayName || creator?.username || 'Tipster';
      const tipster = await this.tipsterRepo.findOne({ where: { userId }, select: ['id', 'displayName'] });
      if (tipster) {
        const subscriberUserIds = await this.subscriptionsService.getActiveSubscriberUserIdsForPackages(
          dto.subscriptionPackageIds!,
        );
        await this.notificationsService.notifyUsersOfSubscriptionCoupon({
          recipientUserIds: subscriberUserIds,
          tipsterUserId: userId,
          tipsterDisplayName: tipster.displayName || creatorName,
          couponTitle: dto.title,
          accumulatorId: ticket.id,
          couponCard: {
            totalOdds: Number(ticket.totalOdds),
            legs: dto.selections.map((s) => ({
              matchDescription: s.matchDescription,
              prediction: s.prediction,
              odds: Number(s.odds),
              matchDate: s.matchDate || null,
            })),
          },
        });
      }
    }

    return this.getById(ticket.id, userId);
  }

  /**
   * Strip pick details for paid marketplace coupons when still pending and viewer is not seller and has not purchased.
   * Once settled (won/lost/void), full picks are public for transparency. Seller / purchasers always see full picks.
   * Internal callers use viewer undefined or forceFullPicks.
   */
  /** Hide share codes for the same viewers who do not see paid legs (prevents free riding). */
  private stripBookingCodeFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const next = { ...payload };
    delete next.bookmakerKey;
    delete next.bookingCode;
    delete next.bookingCodeCopyCount;
    return next;
  }

  /**
   * Whether the viewer may see full pick legs and booking code (matches applyCouponPickVisibility rules).
   */
  private async couponPicksRevealState(
    ticket: AccumulatorTicket,
    listingRow: PickMarketplace | null,
    viewerUserId: number | null | undefined,
    opts?: { forceFullPicks?: boolean; viewerIsAdmin?: boolean },
  ): Promise<{ revealed: boolean; accessViaSubscription?: boolean }> {
    if (opts?.forceFullPicks || opts?.viewerIsAdmin) {
      return { revealed: true };
    }
    const effectivePrice =
      listingRow && listingRow.status === 'active'
        ? Number(listingRow.price)
        : Number(ticket.price ?? 0);
    if (effectivePrice <= 0) {
      return { revealed: true };
    }
    const settled = ['won', 'lost', 'void'].includes((ticket.result || 'pending').toLowerCase());
    if (settled) {
      return { revealed: true };
    }
    if (viewerUserId == null) {
      return { revealed: false };
    }
    if (ticket.userId === viewerUserId) {
      return { revealed: true };
    }
    const hasSubscriptionAccess = await this.subscriptionsService.hasActiveSubscriptionToTipster(
      viewerUserId,
      ticket.userId,
    );
    if (hasSubscriptionAccess) {
      return { revealed: true, accessViaSubscription: true };
    }
    const purchased = await this.purchasedRepo.findOne({
      where: { userId: viewerUserId, accumulatorId: ticket.id },
    });
    if (purchased) {
      return { revealed: true };
    }
    return { revealed: false };
  }

  private async getBookingCodeCopyCountsByAccumulatorIds(ids: number[]): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.bookingCodeCopyRepo
      .createQueryBuilder('c')
      .select('c.accumulatorId', 'aid')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.accumulatorId IN (:...ids)', { ids })
      .groupBy('c.accumulatorId')
      .getRawMany<{ aid: number; cnt: string }>();
    const m = new Map<number, number>();
    for (const r of rows) {
      m.set(Number(r.aid), Number(r.cnt));
    }
    return m;
  }

  /** Attach copy counts for payloads that expose a booking code (full visibility). */
  private async mergeBookingCodeCopyCountsIntoPayloads(items: Record<string, unknown>[]): Promise<void> {
    const ids = items
      .filter((p) => {
        if (!p.bookmakerKey || !p.bookingCode) return false;
        if (p.picksRevealed === false) return false;
        return true;
      })
      .map((p) => Number((p as { id: number }).id))
      .filter((id) => id > 0);
    if (ids.length === 0) return;
    const counts = await this.getBookingCodeCopyCountsByAccumulatorIds(ids);
    for (const p of items) {
      if (p.bookmakerKey && p.bookingCode && p.picksRevealed !== false) {
        const id = Number((p as { id: number }).id);
        p.bookingCodeCopyCount = counts.get(id) ?? 0;
      }
    }
  }

  /** Owner / internal lists without picksRevealed: attach counts when a booking code exists. */
  private async mergeBookingCodeCopyCountsForTicketsPlain(
    items: Array<Record<string, unknown> & { id: number; bookmakerKey?: string | null; bookingCode?: string | null }>,
  ): Promise<void> {
    const ids = items
      .filter((t) => t.bookmakerKey && t.bookingCode)
      .map((t) => t.id)
      .filter((id) => id > 0);
    if (ids.length === 0) return;
    const counts = await this.getBookingCodeCopyCountsByAccumulatorIds(ids);
    for (const t of items) {
      if (t.bookmakerKey && t.bookingCode) {
        t.bookingCodeCopyCount = counts.get(t.id) ?? 0;
      }
    }
  }

  async recordBookingCodeCopy(userId: number, accumulatorId: number): Promise<{ recorded: boolean; count: number }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: accumulatorId } });
    if (!ticket) throw new NotFoundException('Pick not found');
    if (!ticket.bookmakerKey?.trim() || !ticket.bookingCode?.trim()) {
      throw new BadRequestException('This pick has no booking code to copy.');
    }
    const row = await this.marketplaceRepo.findOne({
      where: { accumulatorId },
      select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount', 'status'],
    });
    const state = await this.couponPicksRevealState(ticket, row, userId, {});
    if (!state.revealed) {
      throw new ForbiddenException('You cannot record a copy for a pick you cannot view.');
    }

    let recorded = false;
    try {
      await this.bookingCodeCopyRepo.save(
        this.bookingCodeCopyRepo.create({ accumulatorId, userId }),
      );
      recorded = true;
    } catch (e: any) {
      if (e?.code !== '23505') throw e;
    }
    const count = await this.bookingCodeCopyRepo.count({ where: { accumulatorId } });
    return { recorded, count };
  }

  /**
   * Total unique copiers + display names of copiers who have a tipster profile (for tooltip).
   */
  async getBookingCodeCopiers(
    accumulatorId: number,
    viewerUserId: number | null | undefined,
    viewerIsAdmin?: boolean,
  ): Promise<{ count: number; tipsterNames: string[] }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: accumulatorId } });
    if (!ticket) throw new NotFoundException('Pick not found');
    if (!ticket.bookmakerKey?.trim() || !ticket.bookingCode?.trim()) {
      throw new NotFoundException('No booking code on this pick');
    }
    const row = await this.marketplaceRepo.findOne({
      where: { accumulatorId },
      select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount', 'status'],
    });
    const state = await this.couponPicksRevealState(ticket, row, viewerUserId ?? null, {
      viewerIsAdmin: viewerIsAdmin === true,
    });
    if (!state.revealed) {
      throw new ForbiddenException('Booking code is not visible for this pick.');
    }

    const count = await this.bookingCodeCopyRepo.count({ where: { accumulatorId } });

    const nameRows = await this.bookingCodeCopyRepo
      .createQueryBuilder('c')
      .innerJoin(User, 'u', 'u.id = c.userId')
      .innerJoin(Tipster, 'ts', 'ts.userId = u.id')
      .where('c.accumulatorId = :aid', { aid: accumulatorId })
      .select('COALESCE(u.displayName, u.username)', 'name')
      .getRawMany<{ name: string }>();
    const tipsterNames = [...new Set(nameRows.map((r) => r.name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );

    return {
      count,
      tipsterNames,
    };
  }

  private buildRedactedPicksForCoupon(picks: Array<{ id?: number }>): Array<Record<string, unknown>> {
    const list = picks || [];
    return list.map((p, i) => ({
      id: p.id,
      redacted: true,
      matchDescription: `Selection ${i + 1}`,
      prediction: '—',
      odds: null,
      matchDate: null,
      result: 'pending',
      status: 'pending',
      homeScore: null,
      awayScore: null,
      fixtureStatus: null,
      homeTeamName: null,
      awayTeamName: null,
      homeTeamLogo: null,
      awayTeamLogo: null,
    }));
  }

  private async applyCouponPickVisibility(
    payload: Record<string, unknown>,
    ticket: AccumulatorTicket,
    listingRow: PickMarketplace | null,
    viewerUserId?: number | null,
    opts?: { forceFullPicks?: boolean; viewerIsAdmin?: boolean },
  ): Promise<Record<string, unknown>> {
    const state = await this.couponPicksRevealState(ticket, listingRow, viewerUserId, opts);
    if (!state.revealed) {
      return {
        ...this.stripBookingCodeFromPayload(payload),
        picksRevealed: false,
        picks: this.buildRedactedPicksForCoupon((payload.picks as Array<{ id?: number }>) || []),
      };
    }
    return {
      ...payload,
      picksRevealed: true,
      ...(state.accessViaSubscription ? { accessViaSubscription: true as const } : {}),
    };
  }

  /**
   * Same per-viewer rules as marketplace (free / settled / owner / active subscription / purchase / redacted).
   * Used by the followed-tipster dashboard feed so VIP subscribers are not shown locked cards.
   */
  async applyViewerPickVisibilityForTicket(
    ticket: AccumulatorTicket,
    listingRow: PickMarketplace | null,
    viewerUserId: number,
    picksPayload: unknown[],
  ): Promise<{ picks: unknown[]; picksRevealed: boolean; accessViaSubscription?: boolean }> {
    const applied = await this.applyCouponPickVisibility(
      { picks: picksPayload } as Record<string, unknown>,
      ticket,
      listingRow,
      viewerUserId,
    );
    return {
      picks: (applied.picks as unknown[]) ?? picksPayload,
      picksRevealed: applied.picksRevealed === true,
      ...(applied.accessViaSubscription === true ? { accessViaSubscription: true as const } : {}),
    };
  }

  async enrichPicksWithFixtureScores<T extends { picks?: Array<{ fixtureId?: number | null; eventId?: number | null }> }>(tickets: T[]): Promise<T[]> {
    const fixtureIds = [...new Set(tickets.flatMap((t) => (t.picks || []).map((p) => p.fixtureId).filter(Boolean) as number[]))];
    const eventIds = [...new Set(tickets.flatMap((t) => (t.picks || []).map((p) => p.eventId).filter(Boolean) as number[]))];
    const fixtures = fixtureIds.length > 0
      ? await this.fixtureRepo.find({
          where: { id: In(fixtureIds) },
          relations: ['league'],
          select: {
            id: true,
            leagueId: true,
            homeScore: true,
            awayScore: true,
            status: true,
            statusElapsed: true,
            homeTeamLogo: true,
            awayTeamLogo: true,
            homeTeamName: true,
            awayTeamName: true,
            homeCountryCode: true,
            awayCountryCode: true,
            leagueName: true,
            league: { id: true, apiId: true, name: true, country: true, season: true },
          },
        })
      : [];
    const sportEvents = eventIds.length > 0
      ? await this.sportEventRepo.find({ where: { id: In(eventIds) }, select: ['id', 'homeScore', 'awayScore', 'status', 'homeTeamLogo', 'awayTeamLogo', 'homeTeam', 'awayTeam', 'homeCountryCode', 'awayCountryCode'] })
      : [];
    const fixtureMap = new Map(fixtures.map((f) => [f.id, f]));
    const eventMap = new Map(sportEvents.map((e) => [e.id, e]));
    return tickets.map((t) => ({
      ...t,
      picks: (t.picks || []).map((p: any) => {
        const fix = p.fixtureId ? fixtureMap.get(p.fixtureId) : null;
        const evt = p.eventId ? eventMap.get(p.eventId) : null;
        const src = fix || evt;
        const fixAny = src as any;
        const league = fix?.league;
        return {
          ...p,
          homeScore: src?.homeScore ?? null,
          awayScore: src?.awayScore ?? null,
          fixtureStatus: src?.status ?? null,
          fixtureStatusElapsed: fix?.statusElapsed ?? null,
          status: p.result || 'pending',
          homeTeamLogo: fixAny?.homeTeamLogo ?? null,
          awayTeamLogo: fixAny?.awayTeamLogo ?? null,
          homeTeamName: fixAny?.homeTeamName ?? fixAny?.homeTeam ?? null,
          awayTeamName: fixAny?.awayTeamName ?? fixAny?.awayTeam ?? null,
          homeCountryCode: fixAny?.homeCountryCode ?? null,
          awayCountryCode: fixAny?.awayCountryCode ?? null,
          leagueApiId: league?.apiId ?? null,
          leagueSeason: league?.season ?? null,
          leagueCountry: league?.country ?? null,
          leagueLabel: fixAny?.leagueName ?? league?.name ?? null,
        };
      }),
    })) as T[];
  }

  async getById(
    id: number,
    viewerUserId?: number | null,
    opts?: { forceFullPicks?: boolean; viewerIsAdmin?: boolean },
  ) {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['picks'],
    });
    if (!ticket) return null;
    const [enriched] = await this.enrichPicksWithFixtureScores([ticket]);

    // Include tipster metadata and marketplace row so the detail page has full context
    const row = await this.marketplaceRepo.findOne({
      where: { accumulatorId: id },
      select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount', 'status'],
    });
    const [withTipster] = await this.enrichWithTipsterMetadata(
      [enriched],
      row ? [row] : [],
      viewerUserId ?? undefined,
    );
    const base = (withTipster ?? enriched) as Record<string, unknown>;
    const out = await this.applyCouponPickVisibility(base, ticket, row, viewerUserId ?? undefined, opts);
    await this.mergeBookingCodeCopyCountsIntoPayloads([out]);
    return out;
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
    const rows = await this.marketplaceRepo.find({
      where: { accumulatorId: In(accIds) },
      select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount', 'status'],
    });
    const withTipster = await this.enrichWithTipsterMetadata(enrichedTickets, rows, userId);
    const ticketMap = new Map(withTipster.map((t) => [t.id, t]));
    const out = purchased.map((p) => ({
      ...p,
      pick: ticketMap.get(p.accumulatorId),
    }));
    const pickPayloads = out
      .map((o) => o.pick)
      .filter((x): x is NonNullable<typeof x> => !!x) as Record<string, unknown>[];
    await this.mergeBookingCodeCopyCountsForTicketsPlain(
      pickPayloads as Array<Record<string, unknown> & { id: number; bookmakerKey?: string | null; bookingCode?: string | null }>,
    );
    return out;
  }

  async getMyAccumulators(userId: number, sport?: string) {
    const SPORT_DISPLAY_MAP: Record<string, string> = {
      football:          'Football',
      basketball:        'Basketball',
      rugby:             'Rugby',
      mma:               'MMA',
      volleyball:        'Volleyball',
      hockey:            'Hockey',
      american_football: 'American Football',
      tennis:            'Tennis',
      multi:             'Multi-Sport',
      'multi-sport':     'Multi-Sport',
    };
    const where: any = { userId };
    if (sport) {
      const s = sport.toLowerCase();
      where.sport = SPORT_DISPLAY_MAP[s] ?? sport;
    }
    const tickets = await this.ticketRepo.find({
      where,
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });
    const enriched = await this.enrichPicksWithFixtureScores(tickets);
    const withSocial = await this.mergeSocialCountsOntoRecords(enriched, userId);
    await this.mergeBookingCodeCopyCountsForTicketsPlain(
      withSocial as unknown as Array<Record<string, unknown> & { id: number; bookmakerKey?: string | null; bookingCode?: string | null }>,
    );
    return withSocial;
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
    await this.mergeBookingCodeCopyCountsForTicketsPlain(
      paginated as Array<Record<string, unknown> & { id: number; bookmakerKey?: string | null; bookingCode?: string | null }>,
    );
    return {
      items: paginated,
      total: items.length,
      hasMore: offset + paginated.length < items.length,
    };
  }

  /**
   * Resolve user IDs for marketplace tipster filter: exact username (case-insensitive) or partial username / display name.
   * Returns null when query is empty (caller should not filter). Returns [] when no users match (caller should return no tickets).
   */
  private async resolveUserIdsByTipsterSearch(q: string): Promise<number[] | null> {
    const raw = q.trim().slice(0, 80);
    if (!raw) return null;
    const escaped = raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    const likePat = `%${escaped}%`;
    const rows = await this.usersRepo
      .createQueryBuilder('u')
      .select(['u.id'])
      .where('LOWER(TRIM(u.username)) = LOWER(TRIM(:exact))', { exact: raw })
      .orWhere(`u.username ILIKE :like ESCAPE '\\'`, { like: likePat })
      .orWhere(`COALESCE(u.displayName, '') ILIKE :like ESCAPE '\\'`, { like: likePat })
      .getMany();
    return [...new Set(rows.map((u) => u.id))];
  }

  private applyTipsterFilterToTicketWhere(ticketWhere: Record<string, unknown>, ids: number[] | null): void {
    if (ids === null) return;
    if (ids.length === 0) {
      ticketWhere.userId = -1;
      return;
    }
    if (ids.length === 1) {
      ticketWhere.userId = ids[0];
    } else {
      ticketWhere.userId = In(ids);
    }
  }

  async getMarketplace(
    userId: number,
    includeAllListings = false,
    options?: {
      limit?: number;
      offset?: number;
      sport?: string;
      tipsterUsername?: string;
      tipsterSearch?: string;
      showPending?: boolean;
      showNotStated?: boolean;
      showSettled?: boolean;
      priceFilter?: 'all' | 'free' | 'paid' | 'sold';
      /** Admins see all pick legs on marketplace cards without purchasing. */
      viewerIsAdmin?: boolean;
    },
  ) {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);
    const adminFilterMode = options?.showPending !== undefined || options?.showNotStated !== undefined || options?.showSettled !== undefined;
    const pickVisOpts = { viewerIsAdmin: options?.viewerIsAdmin === true };
    const now = new Date();

    // Optimized path for normal user marketplace view (pending + not started only).
    // Keeps admin/diagnostic behavior untouched below.
    if (!adminFilterMode && !includeAllListings) {
      const qb = this.ticketRepo
        .createQueryBuilder('t')
        .innerJoin(PickMarketplace, 'pm', "pm.accumulator_id = t.id AND pm.status = 'active'")
        .where("t.status = 'active'")
        .andWhere("t.result = 'pending'")
        .andWhere(
          `NOT EXISTS (
            SELECT 1
            FROM accumulator_picks ap
            WHERE ap.accumulator_id = t.id
              AND ap.match_date IS NOT NULL
              AND ap.match_date <= :now
          )`,
          { now },
        );

      if (options?.priceFilter === 'free') qb.andWhere('pm.price = 0');
      if (options?.priceFilter === 'paid') qb.andWhere('pm.price > 0');
      if (options?.priceFilter === 'sold') qb.andWhere('pm.purchase_count > 0');

      if (options?.tipsterUsername) {
        const tipsterUser = await this.usersRepo.findOne({
          where: { username: options.tipsterUsername },
          select: ['id'],
        });
        qb.andWhere('t.user_id = :uid', { uid: tipsterUser?.id ?? -1 });
      } else if (options?.tipsterSearch) {
        const ids = await this.resolveUserIdsByTipsterSearch(options.tipsterSearch);
        if (ids != null) {
          if (ids.length === 0) {
            return { items: [], total: 0, hasMore: false };
          }
          qb.andWhere('t.user_id IN (:...ids)', { ids });
        }
      }

      if (options?.sport) {
        const SPORT_DISPLAY_MAP: Record<string, string> = {
          football: 'Football',
          basketball: 'Basketball',
          rugby: 'Rugby',
          mma: 'MMA',
          volleyball: 'Volleyball',
          hockey: 'Hockey',
          american_football: 'American Football',
          tennis: 'Tennis',
          multi: 'Multi-Sport',
          'multi-sport': 'Multi-Sport',
        };
        const s = options.sport.toLowerCase();
        qb.andWhere('t.sport = :sport', { sport: SPORT_DISPLAY_MAP[s] ?? options.sport });
      }

      const totalRow = await qb.clone().select('COUNT(DISTINCT t.id)', 'cnt').getRawOne<{ cnt: string }>();
      const total = Number(totalRow?.cnt ?? 0);
      if (total === 0) return { items: [], total: 0, hasMore: false };

      const idRows = await qb
        .clone()
        .select('t.id', 'id')
        .orderBy('t.created_at', 'DESC')
        .offset(offset)
        .limit(limit)
        .getRawMany<{ id: number }>();
      const pageIds = idRows.map((r) => Number(r.id)).filter(Boolean);
      if (pageIds.length === 0) return { items: [], total, hasMore: false };

      const tickets = await this.ticketRepo.find({
        where: { id: In(pageIds) },
        relations: ['picks'],
      });
      const order = new Map(pageIds.map((id, i) => [id, i]));
      tickets.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

      const rows = await this.marketplaceRepo.find({
        where: { accumulatorId: In(pageIds), status: 'active' },
        select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount', 'status'],
      });

      const enrichedTickets = await this.enrichPicksWithFixtureScores(tickets);
      const itemsWithMeta = await this.enrichWithTipsterMetadata(enrichedTickets, rows, userId);
      const rowByAccId = new Map(rows.map((r) => [r.accumulatorId, r]));
      const ticketById = new Map(enrichedTickets.map((t) => [t.id, t]));
      const items = await Promise.all(
        itemsWithMeta.map((item) =>
          this.applyCouponPickVisibility(
            item as Record<string, unknown>,
            ticketById.get((item as { id: number }).id)!,
            rowByAccId.get((item as { id: number }).id) ?? null,
            userId,
            pickVisOpts,
          ),
        ),
      );
      await this.mergeBookingCodeCopyCountsIntoPayloads(items as Record<string, unknown>[]);
      return { items, total, hasMore: offset + items.length < total };
    }

    // Always exclude removed listings (status !== 'active'). Removed/deleted coupons not shown.
    const marketplaceWhere = { status: 'active' as const };
    const rows = await this.marketplaceRepo.find({
      where: marketplaceWhere,
      select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount', 'status'],
    });
    const rowsFiltered = rows.filter((r) => {
      if (options?.priceFilter === 'free') return Number(r.price) === 0;
      if (options?.priceFilter === 'paid') return Number(r.price) > 0;
      if (options?.priceFilter === 'sold') return Number(r.purchaseCount ?? 0) > 0;
      return true;
    });
    const accIds = rowsFiltered.map((r) => r.accumulatorId);
    if (accIds.length === 0) {
      this.logger.debug(`getMarketplace: no active pick_marketplace rows`);
      return { items: [], total: 0, hasMore: false };
    }

    const ticketWhere: any = { id: In(accIds) };
    if (!adminFilterMode && !includeAllListings) {
      ticketWhere.status = 'active';
      ticketWhere.result = 'pending';
    }
    if (options?.tipsterUsername) {
      const tipsterUser = await this.usersRepo.findOne({
        where: { username: options.tipsterUsername },
        select: ['id'],
      });
      ticketWhere.userId = tipsterUser?.id ?? -1;
    } else if (options?.tipsterSearch) {
      const ids = await this.resolveUserIdsByTipsterSearch(options.tipsterSearch);
      this.applyTipsterFilterToTicketWhere(ticketWhere, ids);
    }
    if (options?.sport) {
      const SPORT_DISPLAY_MAP: Record<string, string> = {
        football:          'Football',
        basketball:        'Basketball',
        rugby:             'Rugby',
        mma:               'MMA',
        volleyball:        'Volleyball',
        hockey:            'Hockey',
        american_football: 'American Football',
        tennis:            'Tennis',
        multi:             'Multi-Sport',
        'multi-sport':     'Multi-Sport',
      };
      const s = options.sport.toLowerCase();
      ticketWhere.sport = SPORT_DISPLAY_MAP[s] ?? options.sport;
    }
    const tickets = await this.ticketRepo.find({
      where: ticketWhere,
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });
    const enrichedTickets = await this.enrichPicksWithFixtureScores(tickets);
    let validTickets: typeof enrichedTickets;
    if (adminFilterMode) {
      const showPending = options!.showPending !== false;
      const showNotStated = options!.showNotStated !== false;
      const showSettled = options!.showSettled === true;
      validTickets = enrichedTickets.filter((ticket) => {
        if (!ticket.picks || ticket.picks.length === 0) return false;
        const hasStartedFixture = ticket.picks.some((pick: any) => {
          if (!pick.matchDate) return false;
          return new Date(pick.matchDate) <= now;
        });
        const result = (ticket.result || 'pending').toLowerCase();
        const isPending = result === 'pending' && !hasStartedFixture;
        const isNotStated = result === 'pending' && hasStartedFixture;
        const isSettled = ['won', 'lost', 'void'].includes(result);
        return (showPending && isPending) || (showNotStated && isNotStated) || (showSettled && isSettled);
      });
    } else {
      // Non-admin or legacy: filter out coupons where any fixture has already started (unless includeAllListings)
      validTickets = includeAllListings ? enrichedTickets : enrichedTickets.filter((ticket) => {
        if (!ticket.picks || ticket.picks.length === 0) return false;
        const hasStartedFixture = ticket.picks.some((pick: any) => {
          if (!pick.matchDate) return false;
          return new Date(pick.matchDate) <= now;
        });
        return !hasStartedFixture;
      });
    }

    const total = validTickets.length;
    if (enrichedTickets.length > 0 && validTickets.length === 0) {
      this.logger.debug(`getMarketplace: ${enrichedTickets.length} listings filtered out`);
    }
    const paginated = validTickets.slice(offset, offset + limit);
    const rowByAccId = new Map(rowsFiltered.map((r) => [r.accumulatorId, r]));
    const rowsForPaginated = paginated
      .map((t) => rowByAccId.get(t.id))
      .filter((r): r is PickMarketplace => !!r);
    const itemsWithMeta = await this.enrichWithTipsterMetadata(paginated, rowsForPaginated, userId);
    const ticketById = new Map(paginated.map((t) => [t.id, t]));
    const items = await Promise.all(
      itemsWithMeta.map((item) =>
        this.applyCouponPickVisibility(
          item as Record<string, unknown>,
          ticketById.get((item as { id: number }).id)!,
          rowByAccId.get((item as { id: number }).id) ?? null,
          userId,
          pickVisOpts,
        ),
      ),
    );
    await this.mergeBookingCodeCopyCountsIntoPayloads(items as Record<string, unknown>[]);
    return { items, total, hasMore: offset + items.length < total };
  }

  /**
   * Public marketplace list (no login). Optional filter: freeOnly returns only price=0 coupons.
   */
  async getMarketplacePublicList(options?: {
    limit?: number;
    offset?: number;
    sport?: string;
    freeOnly?: boolean;
    priceFilter?: 'free' | 'paid' | 'sold';
    tipsterSearch?: string;
    viewerUserId?: number;
  }) {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);

    const now = new Date();
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin(PickMarketplace, 'pm', "pm.accumulator_id = t.id AND pm.status = 'active'")
      .where("t.status = 'active'")
      .andWhere("t.result = 'pending'")
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM accumulator_picks ap
          WHERE ap.accumulator_id = t.id
            AND ap.match_date IS NOT NULL
            AND ap.match_date <= :now
        )`,
        { now },
      );

    if (options?.priceFilter === 'free' || options?.freeOnly) {
      qb.andWhere('pm.price = 0');
    }
    if (options?.priceFilter === 'paid') {
      qb.andWhere('pm.price > 0');
    }
    if (options?.priceFilter === 'sold') {
      qb.andWhere('pm.purchase_count > 0');
    }
    if (options?.sport) {
      const SPORT_DISPLAY_MAP: Record<string, string> = {
        football: 'Football',
        basketball: 'Basketball',
        rugby: 'Rugby',
        mma: 'MMA',
        volleyball: 'Volleyball',
        hockey: 'Hockey',
        american_football: 'American Football',
        tennis: 'Tennis',
        multi: 'Multi-Sport',
        'multi-sport': 'Multi-Sport',
      };
      const s = options.sport.toLowerCase();
      qb.andWhere('t.sport = :sport', { sport: SPORT_DISPLAY_MAP[s] ?? options.sport });
    }
    if (options?.tipsterSearch) {
      const ids = await this.resolveUserIdsByTipsterSearch(options.tipsterSearch);
      if (ids != null) {
        if (ids.length === 0) return { items: [], total: 0, hasMore: false };
        qb.andWhere('t.user_id IN (:...ids)', { ids });
      }
    }

    const totalRow = await qb.clone().select('COUNT(DISTINCT t.id)', 'cnt').getRawOne<{ cnt: string }>();
    const total = Number(totalRow?.cnt ?? 0);
    if (total === 0) return { items: [], total: 0, hasMore: false };

    const idRows = await qb
      .clone()
      .select('t.id', 'id')
      .orderBy('t.created_at', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany<{ id: number }>();
    const pageIds = idRows.map((r) => Number(r.id)).filter(Boolean);
    if (pageIds.length === 0) return { items: [], total, hasMore: false };

    const tickets = await this.ticketRepo.find({
      where: { id: In(pageIds) },
      relations: ['picks'],
    });
    const order = new Map(pageIds.map((id, i) => [id, i]));
    tickets.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    const enrichedTickets = await this.enrichPicksWithFixtureScores(tickets);

    const rowsForPaginated = await this.marketplaceRepo.find({
      where: { accumulatorId: In(pageIds), status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount', 'status'],
    });

    const itemsWithMeta = await this.enrichWithTipsterMetadata(
      enrichedTickets,
      rowsForPaginated,
      options?.viewerUserId,
    );
    const rowByAccId = new Map(rowsForPaginated.map((r) => [r.accumulatorId, r]));
    const ticketById = new Map(enrichedTickets.map((t) => [t.id, t]));
    const items = await Promise.all(
      itemsWithMeta.map((item) =>
        this.applyCouponPickVisibility(
          item as Record<string, unknown>,
          ticketById.get((item as { id: number }).id)!,
          rowByAccId.get((item as { id: number }).id) ?? null,
          options?.viewerUserId ?? null,
        ),
      ),
    );
    await this.mergeBookingCodeCopyCountsIntoPayloads(items as Record<string, unknown>[]);
    return { items, total, hasMore: offset + items.length < total };
  }

  /**
   * Public coupon by id (no login).
   * - Pending: only free (price 0) coupons with an active marketplace listing (unchanged).
   * - Settled (won/lost/void): any marketplace coupon so guests can see results and tipster quality (drives sign-ups).
   */
  async getByIdPublic(id: number, viewerUserId?: number) {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      select: ['id', 'isMarketplace', 'result', 'status', 'price'],
    });
    if (!ticket?.isMarketplace) return null;

    const row = await this.marketplaceRepo.findOne({
      where: { accumulatorId: id },
      select: ['accumulatorId', 'price', 'status'],
    });

    const settled = ['won', 'lost', 'void'].includes((ticket.result || 'pending').toLowerCase());
    if (settled) {
      return this.getById(id, viewerUserId);
    }

    if (!row || row.status !== 'active') return null;
    const listingPrice = Number(row.price);
    if (listingPrice !== 0) return null;

    return this.getById(id, viewerUserId);
  }

  /** Tipsters who have marketplace coupons (for admin filter dropdown) */
  async getMarketplaceTipsters(): Promise<{ username: string; displayName: string }[]> {
    const rows = await this.marketplaceRepo
      .createQueryBuilder('pm')
      .select('DISTINCT pm.seller_id', 'sellerId')
      .getRawMany();
    const sellerIds = rows.map((r: any) => r.sellerId).filter(Boolean);
    if (sellerIds.length === 0) return [];
    const users = await this.usersRepo.find({
      where: { id: In(sellerIds) },
      select: ['username', 'displayName'],
      order: { displayName: 'ASC' },
    });
    return users.map((u) => ({ username: u.username, displayName: u.displayName || u.username }));
  }

  /** Diagnostic: why marketplace might be empty (admin debugging) */
  async getMarketplaceDiagnostic() {
    const rows = await this.marketplaceRepo.find({
      where: { status: 'active' },
      select: ['accumulatorId', 'price', 'predictionId'],
    });
    const accIds = rows.map((r) => r.accumulatorId);
    if (accIds.length === 0) {
      return { activeListings: 0, reason: 'No active pick_marketplace rows' };
    }
    const tickets = await this.ticketRepo.find({
      where: { id: In(accIds) },
      relations: ['picks'],
      select: ['id', 'title', 'status', 'result', 'userId'],
    });
    const now = new Date();
    const pending = tickets.filter((t) => t.status === 'active' && t.result === 'pending');
    const won = tickets.filter((t) => t.result === 'won').length;
    const lost = tickets.filter((t) => t.result === 'lost').length;
    const byResult = { won, lost, pending: pending.length, cancelled: tickets.length - won - lost - pending.length };
    const afterMatchFilter = pending.filter((t) => {
      if (!t.picks?.length) return false;
      const started = t.picks.some((p: any) => p.matchDate && new Date(p.matchDate) <= now);
      return !started;
    });
    let reason = 'ok';
    if (byResult.won + byResult.lost === tickets.length) reason = 'All picks settled (matches finished)';
    else if (afterMatchFilter.length === 0 && pending.length > 0) reason = 'All pending picks have fixtures that already started';
    else if (pending.length === 0) reason = 'All picks settled or cancelled';
    return {
      activeListings: rows.length,
      ticketsTotal: tickets.length,
      byResult,
      purchasableAfterFilter: afterMatchFilter.length,
      reason,
    };
  }

  /** Reaction + comment counts for marketplace cards (reusable across modules). */
  async loadSocialCountsMap(
    accIds: number[],
    currentUserId?: number,
  ): Promise<Map<number, { reactionCount: number; hasReacted: boolean; commentCount: number }>> {
    const map = new Map<number, { reactionCount: number; hasReacted: boolean; commentCount: number }>();
    if (accIds.length === 0) return map;
    const reactionCountMap = new Map<number, number>();
    const commentCountMap = new Map<number, number>();
    let userReactedSet = new Set<number>();
    const counts = await this.reactionRepo
      .createQueryBuilder('r')
      .select('r.accumulatorId', 'aid')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.accumulatorId IN (:...ids)', { ids: accIds })
      .groupBy('r.accumulatorId')
      .getRawMany();
    counts.forEach((r: { aid: number; cnt: string }) =>
      reactionCountMap.set(Number(r.aid), parseInt(r.cnt, 10)),
    );
    if (currentUserId) {
      const reacted = await this.reactionRepo.find({
        where: { userId: currentUserId, accumulatorId: In(accIds) },
        select: ['accumulatorId'],
      });
      userReactedSet = new Set(reacted.map((r) => r.accumulatorId));
    }
    try {
      const commentCounts = await this.commentRepo
        .createQueryBuilder('c')
        .select('c.accumulatorId', 'aid')
        .addSelect('COUNT(*)', 'cnt')
        .where('c.accumulatorId IN (:...ids)', { ids: accIds })
        .andWhere('c.deletedAt IS NULL')
        .groupBy('c.accumulatorId')
        .getRawMany();
      commentCounts.forEach((r: { aid: number; cnt: string }) =>
        commentCountMap.set(Number(r.aid), parseInt(r.cnt, 10)),
      );
    } catch {
      /* pick_comments table may not exist in older envs */
    }
    for (const id of accIds) {
      map.set(id, {
        reactionCount: reactionCountMap.get(id) ?? 0,
        hasReacted: userReactedSet.has(id),
        commentCount: commentCountMap.get(id) ?? 0,
      });
    }
    return map;
  }

  async mergeSocialCountsOntoRecords<T extends { id: number }>(
    records: T[],
    viewerUserId?: number,
  ): Promise<Array<T & { reactionCount: number; hasReacted: boolean; commentCount: number }>> {
    const accIds = records.map((r) => r.id).filter((id) => id > 0);
    const socialMap = await this.loadSocialCountsMap(accIds, viewerUserId);
    return records.map((r) => {
      const social = socialMap.get(r.id) ?? { reactionCount: 0, hasReacted: false, commentCount: 0 };
      return { ...r, ...social };
    });
  }

  /** Unified method to add tipster rankings, stats, prices, and reactions to tickets */
  private async enrichWithTipsterMetadata(validTickets: AccumulatorTicket[], marketplaceRows: PickMarketplace[], currentUserId?: number) {
    // Get unique tipster IDs
    const tipsterIds = [...new Set(validTickets.map(t => t.userId))];

    // Calculate tipster stats using SQL aggregation (fixes N+1 query)
    const tipsterStatsMap = new Map<
      number,
      { winRate: number; roi: number; totalPicks: number; wonPicks: number; lostPicks: number }
    >();

    const rankByUserId =
      tipsterIds.length > 0 ? await this.tipstersApiService.getLeaderboardRankByUserIdMap() : new Map<number, number>();

    if (tipsterIds.length > 0) {
      const statsQuery = await this.ticketRepo
        .createQueryBuilder('ticket')
        .select('ticket.user_id', 'userId')
        .addSelect('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN ticket.result = :won THEN 1 ELSE 0 END)', 'won')
        .addSelect('SUM(CASE WHEN ticket.result = :lost THEN 1 ELSE 0 END)', 'lost')
        .addSelect('COALESCE(SUM(CASE WHEN ticket.result = :won2 THEN ticket.total_odds ELSE 0 END), 0)', 'totalOddsWon')
        .where('ticket.user_id IN (:...tipsterIds)', { tipsterIds })
        .setParameter('won', 'won')
        .setParameter('lost', 'lost')
        .setParameter('won2', 'won')
        .groupBy('ticket.user_id')
        .getRawMany();

      statsQuery.forEach((row: any) => {
        const userId = Number(row.userId);
        const total = Number(row.total) || 0;
        const won = Number(row.won) || 0;
        const lost = Number(row.lost) || 0;
        const settled = won + lost;
        const winRate = settled > 0 ? (won / settled) * 100 : 0;
        const totalOddsWon = Number(row.totalOddsWon) || 0;
        const roi = settled > 0 ? ((totalOddsWon - settled) / settled) * 100 : 0;
        tipsterStatsMap.set(userId, {
          winRate,
          roi,
          totalPicks: total,
          wonPicks: won,
          lostPicks: lost,
        });
      });
    }

    // Get tipster display names and avatars
    const tipsters = await this.usersRepo.find({
      where: { id: In(tipsterIds) },
      select: ['id', 'displayName', 'username', 'avatar'],
    });
    const tipsterMap = new Map(tipsters.map(t => [t.id, t]));

    const tipsterRowsForAi =
      tipsterIds.length > 0
        ? await this.tipsterRepo.find({
            where: { userId: In(tipsterIds) },
            select: ['userId', 'isAi'],
          })
        : [];
    const isAiByUserId = new Map<number, boolean>(
      tipsterRowsForAi.filter((row) => row.userId != null).map((row) => [row.userId!, !!row.isAi]),
    );

    // Create price & purchase count maps
    const priceMap = new Map(marketplaceRows.map(r => [r.accumulatorId, Number(r.price)]));
    const purchaseCountMap = new Map(marketplaceRows.map(r => [r.accumulatorId, r.purchaseCount || 0]));
    const viewCountMap = new Map(marketplaceRows.map(r => [r.accumulatorId, r.viewCount || 0]));

    // Review aggregates per coupon (avg rating + count)
    const reviewMap = new Map<number, { avg: number; count: number }>();
    const accIdsForReview = validTickets.map(t => t.id);
    if (accIdsForReview.length > 0) {
      try {
        const revRows: Array<{ coupon_id: number; avg: string; cnt: string }> = await this.dataSource.query(
          `SELECT coupon_id, AVG(rating)::numeric(3,1) AS avg, COUNT(*) AS cnt
           FROM coupon_reviews WHERE coupon_id = ANY($1) GROUP BY coupon_id`,
          [accIdsForReview],
        );
        revRows.forEach((r) => reviewMap.set(Number(r.coupon_id), { avg: Number(r.avg), count: Number(r.cnt) }));
      } catch { /* coupon_reviews table may not exist yet in older envs */ }
    }

    const accIds = validTickets.map((t) => t.id);
    const socialMap = await this.loadSocialCountsMap(accIds, currentUserId);

    // Enrich tickets with tipster data
    return validTickets.map(ticket => {
      const tipster = tipsterMap.get(ticket.userId);
      const stats = tipsterStatsMap.get(ticket.userId) || { winRate: 0, roi: 0, totalPicks: 0, wonPicks: 0, lostPicks: 0 };
      const globalRank = rankByUserId.get(ticket.userId) ?? null;

      return {
        ...ticket,
        price: priceMap.get(ticket.id) ?? ticket.price,
        purchaseCount: purchaseCountMap.get(ticket.id) ?? 0,
        viewCount: viewCountMap.get(ticket.id) ?? 0,
        reactionCount: socialMap.get(ticket.id)?.reactionCount ?? 0,
        hasReacted: socialMap.get(ticket.id)?.hasReacted ?? false,
        commentCount: socialMap.get(ticket.id)?.commentCount ?? 0,
        avgRating: reviewMap.get(ticket.id)?.avg ?? null,
        reviewCount: reviewMap.get(ticket.id)?.count ?? null,
        tipster: tipster ? {
          id: tipster.id,
          displayName: tipster.displayName,
          username: tipster.username,
          avatarUrl: tipster.avatar,
          isAi: isAiByUserId.get(ticket.userId) ?? false,
          winRate: Math.round(stats.winRate * 10) / 10,
          roi: Math.round(stats.roi * 10) / 10,
          totalPicks: stats.totalPicks,
          wonPicks: stats.wonPicks,
          lostPicks: stats.lostPicks,
          rank: globalRank,
        } : null,
      };
    });
  }

  /**
   * Free Tip of the Day — returns the best free coupon for today across all sports.
   * Priority: TheGambler first, then any other tipster with a free active marketplace pick.
   * Picks are valid only if all matches are still in the future.
   */
  async getFreeTipOfTheDay(viewerUserId?: number) {
    const now = new Date();

    // Helper: find the best free active pending tip for a given set of user IDs
    const findBestFreeTip = async (userIds: number[]) => {
      if (!userIds.length) return null;

      const tickets = await this.ticketRepo.find({
        where: {
          userId: In(userIds),
          status: 'active',
          result: 'pending',
          isMarketplace: true,
          price: 0,
        },
        relations: ['picks'],
        order: { createdAt: 'DESC' },
        take: 20,
      });
      if (!tickets.length) return null;

      const accIds = tickets.map((t) => t.id);
      const rows = await this.marketplaceRepo.find({
        where: { accumulatorId: In(accIds), status: 'active' },
        select: ['accumulatorId', 'price', 'purchaseCount', 'viewCount'],
      });

      const enriched = await this.enrichPicksWithFixtureScores(tickets);
      const valid = enriched.filter((t: any) => {
        if (!t.picks?.length) return false;
        // All matches must be in the future
        return !t.picks.some((p: any) => p.matchDate && new Date(p.matchDate) <= now);
      });
      const validWithListing = valid.filter((t) => rows.some((r) => r.accumulatorId === t.id));
      if (!validWithListing.length) return null;

      const ticket = validWithListing[0];
      const row = rows.find((r) => r.accumulatorId === ticket.id);
      const items = await this.enrichWithTipsterMetadata([ticket], row ? [row] : [], viewerUserId);
      const first = items[0] as { tipster?: { isAi?: boolean; roi?: number } } | undefined;
      if (!first) return null;
      return first;
    };

    // 1. Try TheGambler first (curated daily tip)
    const gambler = await this.usersRepo.findOne({
      where: { username: 'TheGambler', role: UserRole.TIPSTER },
      select: ['id'],
    });
    if (gambler) {
      const tip = await findBestFreeTip([gambler.id]);
      if (tip) {
        await this.mergeBookingCodeCopyCountsForTicketsPlain([tip as Record<string, unknown> & { id: number }]);
        return tip;
      }
    }

    // 2. Fall back to any tipster's free pick — pick highest purchase count for today (users and tipsters same privileges)
    const allTipsters = await this.usersRepo.find({
      where: [{ role: UserRole.TIPSTER }, { role: UserRole.USER }],
      select: ['id'],
      take: 100,
    });
    if (!allTipsters.length) return null;

    const tip = await findBestFreeTip(allTipsters.map((u) => u.id));
    if (tip) {
      await this.mergeBookingCodeCopyCountsForTicketsPlain([tip as Record<string, unknown> & { id: number }]);
    }
    return tip ?? null;
  }

  /** Popular upcoming events: fixtures with most picks in coupons that are on marketplace and not started. Only fixtures that have odds. Aligned with marketplace. */
  async getPopularEvents(limit = 6) {
    const now = new Date();
    // Only count picks from coupons that are (1) listed on marketplace and (2) have no fixture started yet
    const validMarketplaceSubQuery = `
      SELECT pm.accumulator_id FROM pick_marketplace pm
      WHERE pm.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM accumulator_picks ap2
        JOIN fixtures f2 ON f2.id = ap2.fixture_id
        WHERE ap2.accumulator_id = pm.accumulator_id AND f2.match_date <= :now
      )
    `;
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('ap.fixture_id', 'fixtureId')
      .addSelect('COUNT(DISTINCT ap.id)', 'tipCount')
      .addSelect('f.home_team_name', 'homeTeam')
      .addSelect('f.away_team_name', 'awayTeam')
      .addSelect('f.home_team_logo', 'homeTeamLogo')
      .addSelect('f.away_team_logo', 'awayTeamLogo')
      .addSelect('f.home_country_code', 'homeCountryCode')
      .addSelect('f.away_country_code', 'awayCountryCode')
      .addSelect('f.league_name', 'leagueName')
      .addSelect('f.match_date', 'matchDate')
      .from('accumulator_picks', 'ap')
      .innerJoin('fixtures', 'f', 'f.id = ap.fixture_id')
      .innerJoin('fixture_odds', 'fo', 'fo.fixture_id = f.id')
      .where('ap.fixture_id IS NOT NULL')
      .andWhere(`ap.accumulator_id IN (${validMarketplaceSubQuery})`)
      .setParameter('now', now)
      .andWhere('f.match_date > :now', { now })
      .andWhere('f.status IN (:...statuses)', { statuses: ['NS', 'TBD'] })
      .groupBy('ap.fixture_id')
      .addGroupBy('f.id')
      .addGroupBy('f.home_team_name')
      .addGroupBy('f.away_team_name')
      .addGroupBy('f.home_team_logo')
      .addGroupBy('f.away_team_logo')
      .addGroupBy('f.home_country_code')
      .addGroupBy('f.away_country_code')
      .addGroupBy('f.league_name')
      .addGroupBy('f.match_date')
      .addOrderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((r: any) => ({
      fixtureId: Number(r.fixtureId),
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      homeTeamLogo: r.homeTeamLogo ?? null,
      awayTeamLogo: r.awayTeamLogo ?? null,
      homeCountryCode: r.homeCountryCode ?? null,
      awayCountryCode: r.awayCountryCode ?? null,
      leagueName: r.leagueName,
      matchDate: r.matchDate,
      tipCount: parseInt(r.tipCount, 10) || 0,
    }));
  }

  /**
   * Count marketplace listings that are actually "live" (available to buy):
   * active listing + coupon active/pending + no fixture started. Matches getMarketplace filter.
   */
  async getLiveMarketplaceCount(): Promise<number> {
    const validSubQuery = `
      SELECT pm.accumulator_id FROM pick_marketplace pm
      INNER JOIN accumulator_tickets t ON t.id = pm.accumulator_id AND t.status = 'active' AND t.result = 'pending'
      WHERE pm.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM accumulator_picks ap
        JOIN fixtures f ON f.id = ap.fixture_id
        WHERE ap.accumulator_id = pm.accumulator_id AND f.match_date <= NOW()
      )
    `;
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(DISTINCT sq.accumulator_id)', 'cnt')
      .from(`(${validSubQuery})`, 'sq')
      .getRawOne<{ cnt: string }>();
    return parseInt(result?.cnt ?? '0', 10);
  }

  /**
   * Gross buyer stakes released from escrow on wins (before platform fee). Transparency only.
   */
  async getTotalGrossWinningEscrowReleased(): Promise<number> {
    const result = await this.escrowRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'total')
      .where("e.status = 'released'")
      .getRawOne<{ total: string }>();
    return Number(Number(result?.total ?? 0).toFixed(2));
  }

  /**
   * Net GHS credited to tipster wallets from pick settlements (type payout, after platform fee).
   * Matches settlement.service wallet credits — this is the real "paid out to tipsters" figure.
   */
  async getTotalNetTipsterPayouts(): Promise<number> {
    const result = await this.walletTxRepo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.amount), 0)', 'total')
      .where("w.type = 'payout'")
      .andWhere("w.status = 'completed'")
      .andWhere('w.amount > 0')
      .getRawOne<{ total: string }>();
    return Number(Number(result?.total ?? 0).toFixed(2));
  }

  /** Marketplace purchases only (coupon was listed on pick_marketplace). */
  async getMarketplacePurchaseCount(): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt
       FROM user_purchased_picks up
       INNER JOIN pick_marketplace pm ON pm.accumulator_id = up.accumulator_id`,
    );
    return Number(result[0]?.cnt ?? 0);
  }

  /** Settled marketplace coupons only (won + lost) for a public win rate that matches the marketplace. */
  async getMarketplaceSettledWinLoss(): Promise<{ won: number; lost: number }> {
    const rows = await this.dataSource.query(
      `SELECT
         (SELECT COUNT(DISTINCT t.id)::int FROM accumulator_tickets t
          INNER JOIN pick_marketplace pm ON pm.accumulator_id = t.id
          WHERE t.result = 'won') AS won,
         (SELECT COUNT(DISTINCT t.id)::int FROM accumulator_tickets t
          INNER JOIN pick_marketplace pm ON pm.accumulator_id = t.id
          WHERE t.result = 'lost') AS lost`,
    );
    const row = rows[0] ?? {};
    return { won: Number(row.won ?? 0), lost: Number(row.lost ?? 0) };
  }

  /** Public stats for homepage - no auth required */
  async getPublicStats() {
    const [
      apiSettingsRow,
      activeTipstersCount,
      liveMarketplaceCount,
      marketplacePurchaseCount,
      netTipsterPayouts,
      grossWinningEscrow,
      { won: wonMarketplace, lost: lostMarketplace },
    ] = await Promise.all([
      this.apiSettingsRepo.findOne({ where: { id: 1 } }),
      this.tipsterRepo.count({ where: { isActive: true } }),
      this.getLiveMarketplaceCount(),
      this.getMarketplacePurchaseCount(),
      this.getTotalNetTipsterPayouts(),
      this.getTotalGrossWinningEscrowReleased(),
      this.getMarketplaceSettledWinLoss(),
    ]);
    const settled = wonMarketplace + lostMarketplace;
    const winRate = settled > 0 ? Math.round((wonMarketplace / settled) * 100) : 0;
    const platformCommissionPercent = clampPlatformCommissionPercent(apiSettingsRow?.platformCommissionRate);
    return {
      verifiedTipsters: activeTipstersCount,
      /** Same scope as coupons archive “Total settled” (all-time): marketplace-listed, won + lost. */
      totalPicks: settled,
      activePicks: liveMarketplaceCount,
      successfulPurchases: marketplacePurchaseCount,
      winRate,
      /** Net to tipsters after platform commission (wallet payout credits). */
      totalPaidOut: netTipsterPayouts,
      /** Gross buyer stakes on winning settlements (not net tipster pay). */
      grossWinningStakesGhs: grossWinningEscrow,
      /** All counts above are marketplace-scoped where noted in metricNotes. */
      statsScope: 'marketplace' as const,
      platformCommissionPercent,
      metricNotes: {
        verifiedTipsters: 'tipsters.is_active = true (includes listed AI tipsters)',
        totalPicks: 'Marketplace picks settled won+lost (matches /accumulators/archive total)',
        activePicks: 'Live buyable listings (active + pending result + no started fixture)',
        successfulPurchases: 'user_purchased_picks joined to pick_marketplace',
        winRate: 'Marketplace-listed picks: won / (won + lost)',
        totalPaidOut: 'SUM(wallet_transactions.amount) type=payout, status=completed, amount>0',
        grossWinningStakesGhs: 'SUM(escrow_funds.amount) where status=released',
      },
    };
  }

  async getMarketplacePublic(limit = 4, viewerUserId?: number) {
    const rows = await this.marketplaceRepo.find({
      where: { status: 'active' },
      select: ['accumulatorId', 'price', 'purchaseCount'],
      order: { purchaseCount: 'DESC' },
      take: limit,
    });
    const accIds = rows.map((r) => r.accumulatorId);
    if (accIds.length === 0) return [];
    const tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.picks', 'picks')
      .where('t.id IN (:...accIds)', { accIds })
      .andWhere("t.status = 'active'")
      .andWhere("t.result = 'pending'")
      .getMany();

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

    const featured = await this.enrichWithTipsterMetadata(validTickets, rows, viewerUserId);
    await this.mergeBookingCodeCopyCountsForTicketsPlain(
      featured as Array<Record<string, unknown> & { id: number; bookmakerKey?: string | null; bookingCode?: string | null }>,
    );
    return featured;
  }

  /**
   * Optional archive date window (UTC calendar days, YYYY-MM-DD).
   * Filters by `updated_at` (typically settlement / last touch) on settled coupons.
   */
  private resolveArchiveDateRange(from?: string, to?: string): { fromUtc?: Date; toExclusiveUtc?: Date } {
    const f = from?.trim();
    const t = to?.trim();
    if (!f && !t) return {};
    const ymd = /^\d{4}-\d{2}-\d{2}$/;
    if (!f || !t || !ymd.test(f) || !ymd.test(t)) {
      throw new BadRequestException('Invalid from/to: use YYYY-MM-DD together, or omit both for all time.');
    }
    const [fy, fm, fd] = f.split('-').map((x) => parseInt(x, 10));
    const [ty, tm, td] = t.split('-').map((x) => parseInt(x, 10));
    const fromUtc = new Date(Date.UTC(fy, fm - 1, fd, 0, 0, 0, 0));
    const toExclusiveUtc = new Date(Date.UTC(ty, tm - 1, td + 1, 0, 0, 0, 0));
    if (toExclusiveUtc.getTime() < fromUtc.getTime()) {
      throw new BadRequestException('from must be on or before to.');
    }
    return { fromUtc, toExclusiveUtc };
  }

  /** Public archive: settled (won/lost) marketplace coupons, most recent first. Includes global counts (not page-limited). */
  async getMarketplaceArchive(options?: {
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
    viewerUserId?: number;
  }) {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
    const offset = Math.max(options?.offset ?? 0, 0);
    const { fromUtc, toExclusiveUtc } = this.resolveArchiveDateRange(options?.from, options?.to);

    const statsQb = this.ticketRepo
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'cnt')
      .addSelect(`COALESCE(SUM(CASE WHEN t.result = 'won' THEN 1 ELSE 0 END), 0)`, 'won')
      .addSelect(`COALESCE(SUM(CASE WHEN t.result = 'lost' THEN 1 ELSE 0 END), 0)`, 'lost')
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.result = 'won' THEN (t.totalOdds - 1) ELSE -1 END), 0)`,
        'profitUnits',
      )
      .addSelect('COALESCE(AVG(t.totalOdds), 0)', 'avgOdds')
      .where('t.result IN (:...r)', { r: ['won', 'lost'] })
      .andWhere('EXISTS (SELECT 1 FROM pick_marketplace pm WHERE pm.accumulator_id = t.id)');
    if (fromUtc) {
      statsQb.andWhere('t.updatedAt >= :fromUtc', { fromUtc });
    }
    if (toExclusiveUtc) {
      statsQb.andWhere('t.updatedAt < :toExclusiveUtc', { toExclusiveUtc });
    }

    const countRow = await statsQb.getRawOne<Record<string, string | number | null | undefined>>();

    const num = (v: unknown) => Number(v ?? 0);
    const total = num(countRow?.cnt);
    const wonTotal = num(countRow?.won);
    const lostTotal = num(countRow?.lost);
    const profitUnits = num(countRow?.profitunits ?? countRow?.profitUnits);
    const avgOddsRaw = num(countRow?.avgodds ?? countRow?.avgOdds);
    const settledForRoi = wonTotal + lostTotal;
    const combinedRoi = settledForRoi > 0 ? Math.round((profitUnits / settledForRoi) * 1000) / 10 : 0;
    const avgCouponOdds = Math.round(avgOddsRaw * 100) / 100;

    if (total === 0) {
      return {
        items: [],
        total: 0,
        wonTotal: 0,
        lostTotal: 0,
        combinedRoi: 0,
        netProfitUnits: 0,
        avgCouponOdds: 0,
        hasMore: false,
        from: options?.from?.trim() || null,
        to: options?.to?.trim() || null,
      };
    }

    const listQb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.picks', 'picks')
      .where('t.result IN (:...r)', { r: ['won', 'lost'] })
      .andWhere('EXISTS (SELECT 1 FROM pick_marketplace pm WHERE pm.accumulator_id = t.id)');
    if (fromUtc) {
      listQb.andWhere('t.updatedAt >= :fromUtc', { fromUtc });
    }
    if (toExclusiveUtc) {
      listQb.andWhere('t.updatedAt < :toExclusiveUtc', { toExclusiveUtc });
    }
    const tickets = await listQb.orderBy('t.updatedAt', 'DESC').skip(offset).take(limit).getMany();

    const pageIds = tickets.map((t) => t.id);
    const rows = pageIds.length
      ? await this.marketplaceRepo.find({
          where: { accumulatorId: In(pageIds) },
          select: ['accumulatorId', 'price', 'purchaseCount'],
        })
      : [];

    const enrichedTickets = await this.enrichPicksWithFixtureScores(tickets);
    const items = await this.enrichWithTipsterMetadata(enrichedTickets, rows, options?.viewerUserId);
    await this.mergeBookingCodeCopyCountsForTicketsPlain(
      items as Array<Record<string, unknown> & { id: number; bookmakerKey?: string | null; bookingCode?: string | null }>,
    );
    return {
      items,
      total,
      wonTotal,
      lostTotal,
      combinedRoi,
      netProfitUnits: Math.round(profitUnits * 100) / 100,
      avgCouponOdds,
      hasMore: offset + items.length < total,
      from: options?.from?.trim() || null,
      to: options?.to?.trim() || null,
    };
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
        if (
          price > 0 &&
          (await this.subscriptionsService.hasActiveSubscriptionToTipster(buyerId, ticket.userId))
        ) {
          throw new BadRequestException(
            'You already have active subscription access to this tipster. No purchase is needed.',
          );
        }
        if (price > 0) {
          await this.walletService.debit(
            buyerId,
            price,
            'purchase',
            `pick-${accumulatorId}`,
            `Purchase: ${couponUserFacingRef(accumulatorId, ticket.title)}`,
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

      // Credit referrer on buyer's first paid purchase (fire-and-forget, non-blocking)
      if (price > 0) {
        this.referralsService.creditOnFirstPurchase(buyerId).catch(() => {});
      }

      // In-app notification; receipt email is sendPurchaseConfirmation (premium template, always sent)
      this.notificationsService.create({
        userId: buyerId,
        type: 'purchase',
        title: 'Purchase Complete',
        message: `Your purchase is complete. Funds are held in escrow until the pick settles.`,
        link: `/my-purchases`,
        icon: 'cart',
        sendEmail: false,
        metadata: { pickId: String(accumulatorId), pickTitle: ticket.title || '' },
      }).catch(() => { });

      this.usersRepo
        .findOne({ where: { id: buyerId }, select: ['email'] })
        .then((buyer) => {
          if (buyer?.email) {
            this.emailService
              .sendPurchaseConfirmation(buyer.email, price, accumulatorId, ticket.title)
              .catch(() => {});
          }
        })
        .catch(() => {});

      const sellerId = ticket.userId;
      if (sellerId && sellerId !== buyerId) {
        this.notificationsService.create({
          userId: sellerId,
          type: 'coupon_sold',
          title: 'Pick Sold',
          message:
            price > 0
              ? `Someone purchased your pick for GHS ${price.toFixed(2)}. Funds will be released to your wallet when the pick settles.`
              : `Someone unlocked your free pick.`,
          link: '/my-picks',
          icon: 'cart',
          sendEmail: true,
          metadata: { pickId: String(accumulatorId), pickTitle: ticket.title || '' },
        }).catch(() => { });
      }

      return this.getById(accumulatorId, buyerId, { forceFullPicks: true });
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

  async getPickSocialSummary(
    accumulatorId: number,
    viewerUserId?: number,
  ): Promise<{ reactionCount: number; hasReacted: boolean; commentCount: number }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: accumulatorId } });
    if (!ticket) throw new NotFoundException('Pick not found');
    const map = await this.loadSocialCountsMap([accumulatorId], viewerUserId);
    return map.get(accumulatorId) ?? { reactionCount: 0, hasReacted: false, commentCount: 0 };
  }

  /** Batch social counts for up to 80 pick ids (marketplace grids). */
  async getPickSocialSummaryBatch(
    ids: number[],
    viewerUserId?: number,
  ): Promise<Record<string, { reactionCount: number; hasReacted: boolean; commentCount: number }>> {
    const unique = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))].slice(0, 80);
    const map = await this.loadSocialCountsMap(unique, viewerUserId);
    const out: Record<string, { reactionCount: number; hasReacted: boolean; commentCount: number }> = {};
    for (const id of unique) {
      out[String(id)] = map.get(id) ?? { reactionCount: 0, hasReacted: false, commentCount: 0 };
    }
    return out;
  }

  private mapPickCommentRow(
    r: {
      id: number;
      body: string;
      createdAt: Date;
      userId: number;
      displayName: string;
      avatarUrl: string | null;
      parentId?: number | null;
    },
    viewerUserId: number,
  ) {
    return {
      id: Number(r.id),
      body: r.body,
      createdAt: r.createdAt,
      parentId: r.parentId != null ? Number(r.parentId) : null,
      isOwn: Number(r.userId) === viewerUserId,
      user: {
        id: Number(r.userId),
        displayName: r.displayName || 'User',
        avatarUrl: r.avatarUrl ?? null,
      },
    };
  }

  private static readonly PICK_COMMENT_MAX_DEPTH = 4;
  private static readonly PICK_COMMENT_THREAD_NOTIFY_CAP = 25;

  private async getPickCommentDepth(comment: PickComment): Promise<number> {
    let depth = 1;
    let parentId = comment.parentId;
    while (parentId) {
      depth += 1;
      const parent = await this.commentRepo.findOne({
        where: { id: parentId, deletedAt: IsNull() },
        select: ['id', 'parentId'],
      });
      if (!parent) break;
      parentId = parent.parentId;
    }
    return depth;
  }

  private buildNestedPickCommentReplies(
    parentId: number,
    byParent: Map<
      number,
      Array<{
        id: number;
        body: string;
        createdAt: Date;
        userId: number;
        displayName: string;
        avatarUrl: string | null;
        parentId: number;
      }>
    >,
    viewerUserId: number,
  ): PickCommentTreeNode[] {
    return (byParent.get(parentId) ?? []).map((row) => {
      const id = Number(row.id);
      return {
        ...this.mapPickCommentRow({ ...row, parentId: Number(row.parentId) }, viewerUserId),
        replies: this.buildNestedPickCommentReplies(id, byParent, viewerUserId),
      };
    });
  }

  private async notifyPickCommentActivity(
    actorUserId: number,
    ticket: AccumulatorTicket,
    parent: PickComment | null,
  ): Promise<void> {
    const recipients = new Set<number>();
    if (ticket.userId !== actorUserId) recipients.add(ticket.userId);
    if (parent && parent.userId !== actorUserId) recipients.add(parent.userId);

    const participantRows = await this.commentRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.user_id', 'userId')
      .where('c.accumulator_id = :aid', { aid: ticket.id })
      .andWhere('c.deleted_at IS NULL')
      .andWhere('c.user_id != :actorId', { actorId: actorUserId })
      .limit(AccumulatorsService.PICK_COMMENT_THREAD_NOTIFY_CAP)
      .getRawMany<{ userId: number }>();
    const commentParticipantIds = new Set<number>();
    participantRows.forEach((r) => {
      if (r.userId) {
        const uid = Number(r.userId);
        commentParticipantIds.add(uid);
        recipients.add(uid);
      }
    });

    const reactorIds = new Set<number>();
    const reactorRows = await this.reactionRepo
      .createQueryBuilder('r')
      .select('DISTINCT r.user_id', 'userId')
      .where('r.accumulator_id = :aid', { aid: ticket.id })
      .andWhere('r.user_id != :actorId', { actorId: actorUserId })
      .limit(AccumulatorsService.PICK_COMMENT_THREAD_NOTIFY_CAP)
      .getRawMany<{ userId: number }>();
    reactorRows.forEach((r) => {
      if (r.userId) {
        const uid = Number(r.userId);
        reactorIds.add(uid);
        recipients.add(uid);
      }
    });

    if (recipients.size === 0) return;

    const actor = await this.usersRepo.findOne({
      where: { id: actorUserId },
      select: ['displayName', 'username'],
    });
    const actorName = actor?.displayName || actor?.username || 'Someone';
    const pickLabel = (ticket.title || 'your pick').slice(0, 72);
    const link = `/coupons/${ticket.id}`;

    for (const recipientId of recipients) {
      let type:
        | 'pick_comment'
        | 'pick_comment_reply'
        | 'pick_comment_thread'
        | 'pick_comment_reaction' = 'pick_comment_thread';
      let title = 'New comment on a thread you joined';
      let message = `${actorName} commented on "${pickLabel}"`;

      if (recipientId === ticket.userId) {
        type = 'pick_comment';
        title = 'New comment on your pick';
        message = `${actorName} commented on "${pickLabel}"`;
      } else if (parent && recipientId === parent.userId) {
        type = 'pick_comment_reply';
        title = 'New reply to your comment';
        message = `${actorName} replied on "${pickLabel}"`;
      } else if (reactorIds.has(recipientId) && !commentParticipantIds.has(recipientId)) {
        type = 'pick_comment_reaction';
        title = 'New comment on a pick you liked';
        message = `${actorName} commented on "${pickLabel}"`;
      }

      await this.notificationsService.create({
        userId: recipientId,
        type,
        title,
        message,
        link,
        icon: 'comment',
        sendEmail: true,
        metadata: { pickId: String(ticket.id), actorUserId: String(actorUserId) },
      });
    }
  }

  async getPickReactions(
    accumulatorId: number,
    limit = 20,
  ): Promise<{ total: number; users: Array<{ id: number; displayName: string; avatarUrl: string | null }> }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: accumulatorId } });
    if (!ticket) throw new NotFoundException('Pick not found');
    const total = await this.reactionRepo.count({ where: { accumulatorId } });
    const rows = await this.reactionRepo
      .createQueryBuilder('r')
      .innerJoin(User, 'u', 'u.id = r.userId')
      .where('r.accumulatorId = :aid', { aid: accumulatorId })
      .select('u.id', 'id')
      .addSelect('COALESCE(u.displayName, u.username)', 'displayName')
      .addSelect('u.avatar', 'avatarUrl')
      .orderBy('r.createdAt', 'DESC')
      .limit(Math.min(Math.max(limit, 1), 50))
      .getRawMany<{ id: number; displayName: string; avatarUrl: string | null }>();
    return {
      total,
      users: rows.map((r) => ({
        id: Number(r.id),
        displayName: r.displayName || 'User',
        avatarUrl: r.avatarUrl ?? null,
      })),
    };
  }

  async listPickComments(
    accumulatorId: number,
    viewerUserId: number,
    opts?: { limit?: number; beforeId?: number },
  ): Promise<{
    items: Array<{
      id: number;
      body: string;
      createdAt: Date;
      parentId: number | null;
      isOwn: boolean;
      user: { id: number; displayName: string; avatarUrl: string | null };
      replies: Array<{
        id: number;
        body: string;
        createdAt: Date;
        parentId: number | null;
        isOwn: boolean;
        user: { id: number; displayName: string; avatarUrl: string | null };
      }>;
    }>;
    total: number;
    hasMore: boolean;
  }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: accumulatorId } });
    if (!ticket) throw new NotFoundException('Pick not found');
    const limit = Math.min(Math.max(opts?.limit ?? 25, 1), 50);
    try {
      const qb = this.commentRepo
        .createQueryBuilder('c')
        .innerJoin(User, 'u', 'u.id = c.userId')
        .where('c.accumulator_id = :aid', { aid: accumulatorId })
        .andWhere('c.deleted_at IS NULL')
        .andWhere('c.parent_id IS NULL');
      if (opts?.beforeId) {
        qb.andWhere('c.id < :beforeId', { beforeId: opts.beforeId });
      }
      const total = await this.commentRepo.count({
        where: { accumulatorId, deletedAt: IsNull() },
      });
      const rows = await qb
        .select('c.id', 'id')
        .addSelect('c.body', 'body')
        .addSelect('c.created_at', 'createdAt')
        .addSelect('c.user_id', 'userId')
        .addSelect('COALESCE(u.display_name, u.username)', 'displayName')
        .addSelect('u.avatar', 'avatarUrl')
        .orderBy('c.created_at', 'DESC')
        .limit(limit + 1)
        .getRawMany<{
          id: number;
          body: string;
          createdAt: Date;
          userId: number;
          displayName: string;
          avatarUrl: string | null;
        }>();
      const hasMore = rows.length > limit;
      const slice = hasMore ? rows.slice(0, limit) : rows;
      const topIds = slice.map((r) => Number(r.id));
      const repliesByParent = new Map<
        number,
        Array<{
          id: number;
          body: string;
          createdAt: Date;
          userId: number;
          displayName: string;
          avatarUrl: string | null;
          parentId: number;
        }>
      >();
      if (topIds.length > 0) {
        const replyRows = await this.commentRepo
          .createQueryBuilder('c')
          .innerJoin(User, 'u', 'u.id = c.userId')
          .where('c.accumulator_id = :aid', { aid: accumulatorId })
          .andWhere('c.deleted_at IS NULL')
          .andWhere('c.parent_id IN (:...pids)', { pids: topIds })
          .select('c.id', 'id')
          .addSelect('c.body', 'body')
          .addSelect('c.created_at', 'createdAt')
          .addSelect('c.user_id', 'userId')
          .addSelect('c.parent_id', 'parentId')
          .addSelect('COALESCE(u.display_name, u.username)', 'displayName')
          .addSelect('u.avatar', 'avatarUrl')
          .orderBy('c.created_at', 'ASC')
          .getRawMany<{
            id: number;
            body: string;
            createdAt: Date;
            userId: number;
            parentId: number;
            displayName: string;
            avatarUrl: string | null;
          }>();
        for (const row of replyRows) {
          const pid = Number(row.parentId);
          const list = repliesByParent.get(pid) ?? [];
          list.push(row);
          repliesByParent.set(pid, list);
        }
      }
      return {
        items: slice.map((r) => {
          const id = Number(r.id);
          const replies = (repliesByParent.get(id) ?? []).map((reply) =>
            this.mapPickCommentRow({ ...reply, parentId: id }, viewerUserId),
          );
          return {
            ...this.mapPickCommentRow({ ...r, parentId: null }, viewerUserId),
            replies,
          };
        }),
        total,
        hasMore,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`listPickComments failed for accumulator ${accumulatorId}: ${message}`);
      if (/pick_comments|relation.*does not exist|column.*does not exist/i.test(message)) {
        throw new InternalServerErrorException(
          'Comments are not available yet. Run migrations 093_pick_comments and 094_pick_comments_snake_case_timestamps.',
        );
      }
      throw err;
    }
  }

  async createPickComment(
    userId: number,
    accumulatorId: number,
    body: string,
    parentId?: number,
  ): Promise<{
    id: number;
    body: string;
    createdAt: Date;
    parentId: number | null;
    isOwn: true;
    user: { id: number; displayName: string; avatarUrl: string | null };
  }> {
    const ticket = await this.ticketRepo.findOne({ where: { id: accumulatorId } });
    if (!ticket) throw new NotFoundException('Pick not found');
    const sanitized = sanitizeText(body, 500).trim();
    if (!sanitized) throw new BadRequestException('Comment cannot be empty');
    const filtered = filterPickCommentContent(sanitized);
    if (filtered.blocked) throw new BadRequestException(filtered.reason || 'Comment not allowed');

    let parentComment: PickComment | null = null;
    if (parentId != null && Number.isFinite(parentId)) {
      parentComment = await this.commentRepo.findOne({
        where: { id: parentId, accumulatorId, deletedAt: IsNull() },
      });
      if (!parentComment) throw new BadRequestException('Comment you are replying to was not found');
      if (parentComment.parentId != null) {
        throw new BadRequestException('Replies are only supported one level deep');
      }
    }

    const recentCount = await this.commentRepo
      .createQueryBuilder('c')
      .where('c.userId = :uid', { uid: userId })
      .andWhere('c.createdAt > NOW() - INTERVAL \'1 minute\'')
      .getCount();
    if (recentCount >= 8) {
      throw new BadRequestException('You are commenting too quickly. Please wait a moment.');
    }

    const saved = await this.commentRepo.save(
      this.commentRepo.create({
        userId,
        accumulatorId,
        body: sanitized,
        parentId: parentComment?.id ?? null,
      }),
    );
    const user = await this.usersRepo.findOne({ where: { id: userId }, select: ['id', 'displayName', 'username', 'avatar'] });

    void this.notifyPickCommentActivity(userId, ticket, parentComment).catch((err) => {
      this.logger.warn(`pick comment notification failed: ${err instanceof Error ? err.message : err}`);
    });

    return {
      id: saved.id,
      body: saved.body,
      createdAt: saved.createdAt,
      parentId: saved.parentId,
      isOwn: true,
      user: {
        id: userId,
        displayName: user?.displayName || user?.username || 'User',
        avatarUrl: user?.avatar ?? null,
      },
    };
  }

  async adminListPickComments(opts?: {
    limit?: number;
    offset?: number;
    accumulatorId?: number;
  }): Promise<{
    items: Array<{
      id: number;
      body: string;
      createdAt: Date;
      accumulatorId: number;
      parentId: number | null;
      pickTitle: string;
      user: { id: number; displayName: string; username: string };
    }>;
    total: number;
    hasMore: boolean;
  }> {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
    const offset = Math.max(opts?.offset ?? 0, 0);
    const qb = this.commentRepo
      .createQueryBuilder('c')
      .innerJoin(User, 'u', 'u.id = c.userId')
      .innerJoin(AccumulatorTicket, 't', 't.id = c.accumulatorId')
      .where('c.deleted_at IS NULL');
    if (opts?.accumulatorId) {
      qb.andWhere('c.accumulator_id = :aid', { aid: opts.accumulatorId });
    }
    const total = await qb.getCount();
    const rows = await qb
      .select('c.id', 'id')
      .addSelect('c.body', 'body')
      .addSelect('c.created_at', 'createdAt')
      .addSelect('c.accumulator_id', 'accumulatorId')
      .addSelect('t.title', 'pickTitle')
      .addSelect('c.user_id', 'userId')
      .addSelect('COALESCE(u.display_name, u.username)', 'displayName')
      .addSelect('u.username', 'username')
      .orderBy('c.created_at', 'DESC')
      .offset(offset)
      .limit(limit + 1)
      .getRawMany<{
        id: number;
        body: string;
        createdAt: Date;
        accumulatorId: number;
        parentId: number | null;
        pickTitle: string;
        userId: number;
        displayName: string;
        username: string;
      }>();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map((r) => ({
        id: Number(r.id),
        body: r.body,
        createdAt: r.createdAt,
        accumulatorId: Number(r.accumulatorId),
        parentId: r.parentId != null ? Number(r.parentId) : null,
        pickTitle: r.pickTitle || `Pick #${r.accumulatorId}`,
        user: {
          id: Number(r.userId),
          displayName: r.displayName || r.username || 'User',
          username: r.username || '',
        },
      })),
      total,
      hasMore,
    };
  }

  async deletePickComment(
    userId: number,
    accumulatorId: number,
    commentId: number,
    isAdmin: boolean,
  ): Promise<{ success: boolean }> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId, accumulatorId } });
    if (!comment || comment.deletedAt) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    const now = new Date();
    await this.dataSource.query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM pick_comments WHERE id = $1 AND accumulator_id = $2
         UNION ALL
         SELECT c.id FROM pick_comments c
         INNER JOIN subtree s ON c.parent_id = s.id
         WHERE c.accumulator_id = $2 AND c.deleted_at IS NULL
       )
       UPDATE pick_comments SET deleted_at = $3
       WHERE id IN (SELECT id FROM subtree) AND deleted_at IS NULL`,
      [commentId, accumulatorId, now],
    );
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

  private utcDayBounds(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private async loadSellingPolicy(): Promise<{
    minimumROI: number;
    minimumWinRate: number;
    maxCouponsPerDay: number;
  }> {
    let minimumROI = 20.0;
    let minimumWinRate = 45.0;
    let maxCouponsPerDay = 0;
    try {
      const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
      minimumROI = Number(apiSettings?.minimumROI ?? 20.0);
      minimumWinRate = Number(apiSettings?.minimumWinRate ?? 45.0);
      maxCouponsPerDay = Math.max(0, Math.floor(Number(apiSettings?.maxCouponsPerDay ?? 0)));
    } catch {
      this.logger.warn('Could not load api_settings for selling policy, using defaults');
    }
    return { minimumROI, minimumWinRate, maxCouponsPerDay };
  }

  private async countCouponsCreatedUtcToday(userId: number): Promise<number> {
    const { start, end } = this.utcDayBounds();
    return this.ticketRepo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .andWhere('t.createdAt >= :start', { start })
      .andWhere('t.createdAt < :end', { end })
      .getCount();
  }

  /** Admins and AI tipster accounts are exempt (automated sync can create many coupons). */
  private async isExemptFromDailyCouponLimit(userId: number): Promise<boolean> {
    const user = await this.usersRepo.findOne({ where: { id: userId }, select: ['id', 'role'] });
    if (user?.role === 'admin') return true;
    const tip = await this.tipsterRepo.findOne({ where: { userId }, select: ['id', 'isAi'] });
    return !!tip?.isAi;
  }

  /** How many coupons this user may still create before end of current UTC day (for UI). */
  async getDailyCouponQuota(userId: number): Promise<{
    maxPerDay: number;
    usedToday: number;
    remaining: number | null;
    exempt: boolean;
    resetsAtUtc: string;
  }> {
    const policy = await this.loadSellingPolicy();
    const exempt = await this.isExemptFromDailyCouponLimit(userId);
    const usedToday = await this.countCouponsCreatedUtcToday(userId);
    const { end } = this.utcDayBounds();
    const resetsAtUtc = end.toISOString();
    if (exempt || policy.maxCouponsPerDay <= 0) {
      return {
        maxPerDay: policy.maxCouponsPerDay,
        usedToday,
        remaining: null,
        exempt,
        resetsAtUtc,
      };
    }
    const remaining = Math.max(0, policy.maxCouponsPerDay - usedToday);
    return {
      maxPerDay: policy.maxCouponsPerDay,
      usedToday,
      remaining,
      exempt: false,
      resetsAtUtc,
    };
  }
}
