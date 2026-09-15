import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager, FindOptionsWhere } from 'typeorm';
import { chunkIds } from '../../common/sql-in-chunks';
import { AccumulatorTicket } from './entities/accumulator-ticket.entity';
import { AccumulatorPick } from './entities/accumulator-pick.entity';
import { EscrowFund } from './entities/escrow-fund.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramChannelService } from '../telegram/telegram-channel.service';
import { TelegramEligibilityService } from '../telegram/telegram-eligibility.service';
import { TelegramVipService } from '../telegram/telegram-vip.service';
import type { TelegramSlipLeg } from '../telegram/telegram-slip';
import {
  aggregateTicketResult,
  determinePickResult,
  isStalePendingPick,
  remainingAccumulatorOdds,
  ticketReadyToSettle,
  type AccumulatorOutcome,
} from './settlement-logic';
import { clampPlatformCommissionPercent, splitGrossForTipsterPayout } from '../../common/platform-commission';
import { couponUserFacingRef } from '../../common/coupon-public-label';
import { TipstersApiService } from '../predictions/tipsters-api.service';
import { ResultTrackerService } from '../predictions/result-tracker.service';
import { User } from '../users/entities/user.entity';

/** Market types and selection formats we support for settlement. See determinePickResult. */
export const SETTLEMENT_SUPPORTED_MARKETS = [
  'Match Winner (1X2): Home, Away, Draw (also Match Winner: Team/Player name)',
  'Double Chance: 1X, X2, 12 (slash or text format)',
  'Both Teams To Score: Yes, No',
  'Over/Under: Over/Under 1.5, 2.5, 3.5 (goals, points, etc.)',
  'Canonical outcome_key slugs: ht_home/ht_draw/ht_away, dnb_home/dnb_away, over15/under15/over35/under35, fh_over05…fh_under25, odd_goals/even_goals (when stored on pick)',
  'First Half Winner; First Half Over/Under 0.5, 1.5, 2.5 (needs HT score on fixture)',
  'Half-Time/Full-Time: Home/Home, 1/X, etc. (needs HT + FT scores)',
  'Asian Handicap: Home/Away ±N including quarter lines (push/half → void)',
  'European Handicap: Home/Draw/Away ±N (3-way)',
  'Handicap/Spread: Home -3.5, Away +2.5, Team Name ±N',
  'Odd/Even: Total goals/points odd or even (incl. Odd/Even: Odd/Even)',
  'Draw No Bet: Match winner, draw = void',
  'Corners: O/U, team O/U, 1X2, Asian Handicap, Odd/Even, ranges (needs fixture corners stats)',
  'Cards / Yellow Cards / Booking Points O/U (needs fixture card stats)',
  'Set Betting (tennis): 2-0, 2-1 (order-agnostic)',
  'Correct Score: 2-1, 1:1 (dash or colon)',
] as const;

/** Re-grade settled picks on fixtures/events from this window (admin reconcile). */
const RECONCILE_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

const FIXTURE_GRADE_SELECT: (keyof Fixture)[] = [
  'id',
  'status',
  'matchDate',
  'homeScore',
  'awayScore',
  'homeTeamName',
  'awayTeamName',
  'htHomeScore',
  'htAwayScore',
  'homeCorners',
  'awayCorners',
  'homeYellowCards',
  'awayYellowCards',
  'homeRedCards',
  'awayRedCards',
];

const EVENT_GRADE_SELECT: (keyof SportEvent)[] = [
  'id',
  'status',
  'homeScore',
  'awayScore',
  'homeTeam',
  'awayTeam',
];

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(AccumulatorTicket)
    private ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(AccumulatorPick)
    private pickRepo: Repository<AccumulatorPick>,
    @InjectRepository(EscrowFund)
    private escrowRepo: Repository<EscrowFund>,
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    @InjectRepository(SportEvent)
    private sportEventRepo: Repository<SportEvent>,
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private walletService: WalletService,
    private notificationsService: NotificationsService,
    private telegramChannelService: TelegramChannelService,
    private telegramEligibility: TelegramEligibilityService,
    private telegramVip: TelegramVipService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => TipstersApiService))
    private readonly tipstersApiService: TipstersApiService,
    @Inject(forwardRef(() => ResultTrackerService))
    private readonly resultTrackerService: ResultTrackerService,
  ) { }

  /** Argument to `determinePickResult`: canonical `outcomeKey` when set (AI marketplace sync), else `prediction` text. */
  private pickGradingInput(pick: AccumulatorPick): string {
    const key = pick.outcomeKey?.trim();
    return key || (pick.prediction || '').trim();
  }

  private async telegramLegsForPicks(picks: AccumulatorPick[]): Promise<TelegramSlipLeg[]> {
    const [fixtureMap, eventMap] = await Promise.all([
      this.loadFixturesForGrading(picks.map((p) => p.fixtureId)),
      this.loadEventsForGrading(picks.map((p) => p.eventId)),
    ]);
    return picks.map((p) => {
      const src =
        (p.fixtureId != null ? fixtureMap.get(p.fixtureId) : undefined) ||
        (p.eventId != null ? eventMap.get(p.eventId) : undefined);
      return {
        matchDescription: p.matchDescription,
        prediction: p.prediction,
        odds: Number(p.odds),
        matchDate: p.matchDate,
        result: p.result,
        homeScore: src?.homeScore ?? null,
        awayScore: src?.awayScore ?? null,
      };
    });
  }

  private fixtureMatchStats(fix: Fixture) {
    return {
      homeCorners: fix.homeCorners,
      awayCorners: fix.awayCorners,
      homeYellowCards: fix.homeYellowCards,
      awayYellowCards: fix.awayYellowCards,
      homeRedCards: fix.homeRedCards,
      awayRedCards: fix.awayRedCards,
    };
  }

  /** Persist ROI, win rate, avg odds, streaks from accumulator_tickets (single source of truth). */
  private async persistTipsterStatsForUserIds(userIds: Iterable<number>): Promise<void> {
    const unique = [...new Set([...userIds].filter((id) => id != null && id > 0))];
    for (const uid of unique) {
      try {
        await this.tipstersApiService.recalculateAndPersistTipsterStats(uid);
      } catch (e) {
        this.logger.warn(`recalculateAndPersistTipsterStats failed for user ${uid}: ${e}`);
      }
    }
  }

  /**
   * Check and settle accumulators (optimized for frequent calls)
   * Called after fixture updates for fast settlement
   */
  async checkAndSettleAccumulators(): Promise<{
    picksUpdated: number;
    ticketsSettled: number;
  }> {
    return this.runSettlement();
  }

  /**
   * Catch missed API status updates: scored matches that started >2h ago but are still not FT.
   * Do not load every FT fixture — that is tens of thousands of rows and blows Postgres `In()`.
   */
  private async promoteScoredPastFixturesToFt(twoHoursAgo: Date): Promise<void> {
    const scoredPastFixtures = await this.fixtureRepo
      .createQueryBuilder('f')
      .select(['f.id'])
      .where("f.status != 'FT'")
      .andWhere('f.matchDate < :cutoff', { cutoff: twoHoursAgo })
      .andWhere('f.homeScore IS NOT NULL')
      .andWhere('f.awayScore IS NOT NULL')
      .getMany();
    for (const f of scoredPastFixtures) {
      await this.fixtureRepo.update({ id: f.id }, { status: 'FT', statusElapsed: null });
    }
    if (scoredPastFixtures.length > 0) {
      this.logger.log(`Marked ${scoredPastFixtures.length} scored fixture(s) as FT`);
    }
  }

  private isFixtureReadyToGrade(fix: Fixture, twoHoursAgo: Date): boolean {
    if (fix.homeScore == null || fix.awayScore == null) return false;
    if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(fix.status)) return false;
    if (fix.status === 'FT') return true;
    return fix.matchDate != null && fix.matchDate < twoHoursAgo;
  }

  private isEventReadyToGrade(evt: SportEvent): boolean {
    return evt.status === 'FT' && evt.homeScore != null && evt.awayScore != null;
  }

  private async loadFixturesForGrading(
    ids: Iterable<number | null | undefined>,
  ): Promise<Map<number, Fixture>> {
    const fixtures: Fixture[] = [];
    for (const chunk of chunkIds(ids)) {
      fixtures.push(
        ...(await this.fixtureRepo.find({
          where: { id: In(chunk) },
          select: FIXTURE_GRADE_SELECT,
        })),
      );
    }
    return new Map(fixtures.map((f) => [f.id, f]));
  }

  private async loadEventsForGrading(
    ids: Iterable<number | null | undefined>,
  ): Promise<Map<number, SportEvent>> {
    const events: SportEvent[] = [];
    for (const chunk of chunkIds(ids)) {
      events.push(
        ...(await this.sportEventRepo.find({
          where: { id: In(chunk) },
          select: EVENT_GRADE_SELECT,
        })),
      );
    }
    return new Map(events.map((e) => [e.id, e]));
  }

  private async findPicksWhereIn(
    column: 'fixtureId' | 'eventId' | 'accumulatorId',
    ids: Iterable<number | null | undefined>,
    extra: FindOptionsWhere<AccumulatorPick> = {},
  ): Promise<AccumulatorPick[]> {
    const rows: AccumulatorPick[] = [];
    for (const chunk of chunkIds(ids)) {
      rows.push(
        ...(await this.pickRepo.find({
          where: { ...extra, [column]: In(chunk) },
        })),
      );
    }
    return rows;
  }

  /**
   * Re-grade picks already marked won/lost/void using current fixture/event scores; updates coupon outcome and
   * escrow when the result flips (e.g. wrong score while API quota was exhausted). Run after scores are correct.
   * Limited to fixtures/events with match date in the last 30 days so we never `In()` tens of thousands of ids.
   */
  async reconcileMisgradedSettlements(): Promise<{
    picksRegraded: number;
    ticketsOutcomeChanged: number;
    escrowTicketsAdjusted: number;
    errors: string[];
  }> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await this.promoteScoredPastFixturesToFt(twoHoursAgo);
    const since = new Date(Date.now() - RECONCILE_LOOKBACK_MS);

    const [fixturePicks, eventPicks] = await Promise.all([
      this.pickRepo
        .createQueryBuilder('p')
        .innerJoin(Fixture, 'f', 'f.id = p.fixtureId')
        .where('p.result IN (:...results)', { results: ['won', 'lost', 'void'] })
        .andWhere('f.matchDate >= :since', { since })
        .andWhere('f.homeScore IS NOT NULL')
        .andWhere('f.awayScore IS NOT NULL')
        .getMany(),
      this.pickRepo
        .createQueryBuilder('p')
        .innerJoin(SportEvent, 'e', 'e.id = p.eventId')
        .where('p.result IN (:...results)', { results: ['won', 'lost', 'void'] })
        .andWhere('e.eventDate >= :since', { since })
        .andWhere('e.homeScore IS NOT NULL')
        .andWhere('e.awayScore IS NOT NULL')
        .getMany(),
    ]);

    const [fixtureMap, eventMap] = await Promise.all([
      this.loadFixturesForGrading(fixturePicks.map((p) => p.fixtureId)),
      this.loadEventsForGrading(eventPicks.map((p) => p.eventId)),
    ]);

    type Computed = 'won' | 'lost' | 'void';
    const deltas: { pickId: number; accumulatorId: number; computed: Computed }[] = [];
    const seenPickIds = new Set<number>();

    for (const pick of fixturePicks) {
      if (seenPickIds.has(pick.id)) continue;
      const fix = fixtureMap.get(pick.fixtureId!);
      if (!fix || !this.isFixtureReadyToGrade(fix, twoHoursAgo)) continue;
      const computed = determinePickResult(
        this.pickGradingInput(pick),
        fix.homeScore!,
        fix.awayScore!,
        fix.homeTeamName,
        fix.awayTeamName,
        fix.htHomeScore,
        fix.htAwayScore,
        this.fixtureMatchStats(fix),
      );
      if (!computed || computed === pick.result) continue;
      seenPickIds.add(pick.id);
      deltas.push({ pickId: pick.id, accumulatorId: pick.accumulatorId, computed });
    }

    for (const pick of eventPicks) {
      if (seenPickIds.has(pick.id)) continue;
      const evt = eventMap.get(pick.eventId!);
      if (!evt || !this.isEventReadyToGrade(evt)) continue;
      const computed = determinePickResult(
        this.pickGradingInput(pick),
        evt.homeScore!,
        evt.awayScore!,
        evt.homeTeam,
        evt.awayTeam,
      );
      if (!computed || computed === pick.result) continue;
      seenPickIds.add(pick.id);
      deltas.push({ pickId: pick.id, accumulatorId: pick.accumulatorId, computed });
    }

    const ticketIds = [...new Set(deltas.map((d) => d.accumulatorId))];
    const errors: string[] = [];
    let picksRegraded = 0;
    let ticketsOutcomeChanged = 0;
    let escrowTicketsAdjusted = 0;

    for (const ticketId of ticketIds) {
      const ticketDeltas = deltas.filter((d) => d.accumulatorId === ticketId);
      try {
        const summary = await this.dataSource.transaction(async (manager) => {
          const pRepo = manager.getRepository(AccumulatorPick);
          const tRepo = manager.getRepository(AccumulatorTicket);

          for (const d of ticketDeltas) {
            await pRepo.update({ id: d.pickId }, { result: d.computed });
          }

          const ticket = await tRepo.findOne({ where: { id: ticketId } });
          if (!ticket) {
            return { picks: ticketDeltas.length, changed: false, escrow: false };
          }

          const picks = await pRepo.find({ where: { accumulatorId: ticketId } });
          if (!ticketReadyToSettle(picks)) {
            return { picks: ticketDeltas.length, changed: false, escrow: false };
          }

          const patch = this.ticketOutcomePatch(picks, ticket.totalOdds);
          if (patch.result === ticket.result && patch.totalOdds == null) {
            return { picks: ticketDeltas.length, changed: false, escrow: false };
          }

          const oldResult = ticket.result;
          let escrowAdjusted = false;
          if (
            patch.result !== oldResult &&
            ticket.isMarketplace &&
            Number(ticket.price) > 0 &&
            this.escrowWalletFlipNeeded(oldResult, patch.result)
          ) {
            const couponRef = couponUserFacingRef(ticketId, ticket.title);
            if (oldResult === 'won') {
              await this.escrowWonToLostOrVoid(manager, ticketId, ticket.userId, couponRef, patch.result === 'void');
              escrowAdjusted = true;
            } else if (patch.result === 'won') {
              await this.escrowLostOrVoidToWon(manager, ticketId, ticket.userId, couponRef);
              escrowAdjusted = true;
            }
          }

          await tRepo.update({ id: ticketId }, patch);
          return {
            picks: ticketDeltas.length,
            changed: true,
            escrow: escrowAdjusted,
            userId: ticket.userId,
          };
        });

        picksRegraded += summary.picks;
        if (summary.changed) ticketsOutcomeChanged += 1;
        if (summary.escrow) escrowTicketsAdjusted += 1;
        if (summary.changed && summary.userId != null) {
          await this.persistTipsterStatsForUserIds([summary.userId]);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Ticket ${ticketId}: ${msg}`);
        this.logger.warn(`Reconcile failed for ticket ${ticketId}: ${msg}`);
      }
    }

    if (picksRegraded > 0) {
      this.logger.log(
        `Reconcile: ${picksRegraded} pick(s) regraded, ${ticketsOutcomeChanged} pick(s) outcome updated, ${escrowTicketsAdjusted} escrow adjustment(s)`,
      );
    }

    const voidedLegFix = await this.reaggregateTicketsWithVoidedLegs();
    ticketsOutcomeChanged += voidedLegFix.ticketsChanged;
    escrowTicketsAdjusted += voidedLegFix.escrowTicketsAdjusted;
    for (const userId of voidedLegFix.userIds) {
      await this.persistTipsterStatsForUserIds([userId]);
    }

    return { picksRegraded, ticketsOutcomeChanged, escrowTicketsAdjusted, errors };
  }

  private ticketOutcomePatch(
    picks: AccumulatorPick[],
    currentOdds?: number | string | null,
  ): { result: AccumulatorOutcome; status: AccumulatorOutcome; totalOdds?: number } {
    const result = aggregateTicketResult(picks);
    const patch: { result: AccumulatorOutcome; status: AccumulatorOutcome; totalOdds?: number } = {
      result,
      status: result,
    };
    const reduced = remainingAccumulatorOdds(picks);
    if (reduced != null && (currentOdds == null || Number(currentOdds) !== reduced)) {
      patch.totalOdds = reduced;
    }
    return patch;
  }

  /**
   * Old rule voided the whole coupon whenever any leg voided. Re-open tickets that still have
   * a won/lost remaining leg (DNB draw + winning other side, postponed + settled rest).
   */
  private async reaggregateTicketsWithVoidedLegs(): Promise<{
    ticketsChanged: number;
    escrowTicketsAdjusted: number;
    userIds: number[];
  }> {
    const tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin('t.picks', 'p')
      .where('t.result = :voidResult', { voidResult: 'void' })
      .andWhere('p.result IN (:...active)', { active: ['won', 'lost'] })
      .select(['t.id', 't.userId', 't.isMarketplace', 't.price', 't.title', 't.totalOdds', 't.result'])
      .distinct(true)
      .getMany();

    let ticketsChanged = 0;
    let escrowTicketsAdjusted = 0;
    const userIds: number[] = [];

    for (const ticket of tickets) {
      try {
        const summary = await this.dataSource.transaction(async (manager) => {
          const pRepo = manager.getRepository(AccumulatorPick);
          const tRepo = manager.getRepository(AccumulatorTicket);
          const picks = await pRepo.find({ where: { accumulatorId: ticket.id } });
          if (!ticketReadyToSettle(picks)) {
            return { changed: false, escrow: false };
          }

          const patch = this.ticketOutcomePatch(picks, ticket.totalOdds);
          if (patch.result === ticket.result && patch.totalOdds == null) {
            return { changed: false, escrow: false };
          }

          let escrowAdjusted = false;
          if (
            patch.result !== ticket.result &&
            ticket.isMarketplace &&
            Number(ticket.price) > 0 &&
            this.escrowWalletFlipNeeded(ticket.result, patch.result)
          ) {
            const couponRef = couponUserFacingRef(ticket.id, ticket.title);
            if (ticket.result === 'won') {
              await this.escrowWonToLostOrVoid(
                manager,
                ticket.id,
                ticket.userId,
                couponRef,
                patch.result === 'void',
              );
              escrowAdjusted = true;
            } else if (patch.result === 'won') {
              await this.escrowLostOrVoidToWon(manager, ticket.id, ticket.userId, couponRef);
              escrowAdjusted = true;
            }
          }

          await tRepo.update({ id: ticket.id }, patch);
          return { changed: true, escrow: escrowAdjusted, userId: ticket.userId };
        });

        if (summary.changed) {
          ticketsChanged += 1;
          if (summary.userId != null) userIds.push(summary.userId);
        }
        if (summary.escrow) escrowTicketsAdjusted += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Void-leg reaggregate failed for ticket ${ticket.id}: ${msg}`);
      }
    }

    if (ticketsChanged > 0) {
      this.logger.log(
        `Reaggregated ${ticketsChanged} ticket(s) with voided legs (${escrowTicketsAdjusted} escrow adjustment(s))`,
      );
    }

    return { ticketsChanged, escrowTicketsAdjusted, userIds: [...new Set(userIds)] };
  }

  private escrowWalletFlipNeeded(oldResult: string, newResult: string): boolean {
    return (oldResult === 'won') !== (newResult === 'won');
  }

  private async escrowLostOrVoidToWon(
    manager: EntityManager,
    ticketId: number,
    sellerId: number,
    couponRef: string,
  ): Promise<void> {
    const eRepo = manager.getRepository(EscrowFund);
    const funds = await eRepo.find({ where: { pickId: ticketId, status: 'refunded' } });
    if (funds.length === 0) {
      const released = await eRepo.find({ where: { pickId: ticketId, status: 'released' } });
      if (released.length > 0) {
        throw new Error('Escrow already released for this pick; aborting win reconciliation');
      }
      return;
    }

    const apiRow = await manager.getRepository(ApiSettings).findOne({ where: { id: 1 } });
    const commissionRate = clampPlatformCommissionPercent(apiRow?.platformCommissionRate);
    const processedUsers = new Set<number>();

    for (const f of funds) {
      if (processedUsers.has(f.userId)) {
        this.logger.warn(`Duplicate escrow row for user ${f.userId} on pick ${ticketId}; skipping duplicate in reconcile`);
        continue;
      }
      const gross = Number(f.amount);
      await this.walletService.debit(
        f.userId,
        gross,
        'settle_adj',
        `reconcile-debit-refund-${ticketId}-u${f.userId}`,
        `Score correction: reclaim mistaken refund for ${couponRef}`,
        manager,
      );
      const commission = Number((gross * commissionRate / 100).toFixed(2));
      const netPayout = Number((gross - commission).toFixed(2));
      await this.walletService.credit(
        sellerId,
        netPayout,
        'payout',
        `reconcile-payout-${ticketId}-u${f.userId}`,
        `Score correction payout for ${couponRef}`,
        manager,
      );
      processedUsers.add(f.userId);
      f.status = 'released';
      await eRepo.save(f);
    }
  }

  private async escrowWonToLostOrVoid(
    manager: EntityManager,
    ticketId: number,
    sellerId: number,
    couponRef: string,
    isVoid: boolean,
  ): Promise<void> {
    const eRepo = manager.getRepository(EscrowFund);
    const funds = await eRepo.find({ where: { pickId: ticketId, status: 'released' } });
    if (funds.length === 0) {
      const refunded = await eRepo.find({ where: { pickId: ticketId, status: 'refunded' } });
      if (refunded.length > 0) {
        throw new Error('Escrow already refunded for this pick; aborting reversal');
      }
      return;
    }

    const apiRow = await manager.getRepository(ApiSettings).findOne({ where: { id: 1 } });
    const commissionRate = clampPlatformCommissionPercent(apiRow?.platformCommissionRate);
    const processedUsers = new Set<number>();

    for (const f of funds) {
      if (processedUsers.has(f.userId)) {
        this.logger.warn(`Duplicate escrow row for user ${f.userId} on pick ${ticketId}; skipping duplicate in reconcile`);
        continue;
      }
      const gross = Number(f.amount);
      const commission = Number((gross * commissionRate / 100).toFixed(2));
      const netPayout = Number((gross - commission).toFixed(2));
      await this.walletService.debit(
        sellerId,
        netPayout,
        'settle_adj',
        `reconcile-rev-payout-${ticketId}-u${f.userId}`,
        `Score correction: reverse payout for ${couponRef}`,
        manager,
      );
      await this.walletService.credit(
        f.userId,
        gross,
        'refund',
        `reconcile-recredit-buyer-${ticketId}-u${f.userId}`,
        isVoid
          ? `Score correction: refund for voided ${couponRef}`
          : `Score correction: refund for lost ${couponRef}`,
        manager,
      );
      processedUsers.add(f.userId);
      f.status = 'refunded';
      await eRepo.save(f);
    }
  }

  /**
   * Settle picks for finished fixtures. Call periodically (e.g. cron every 4h) or via POST /admin/settlement/run.
   *
   * Flow:
   * 1. Update scored non-FT fixtures (match_date > 2h ago) to status=FT
   * 2. Load pending picks, then only those fixtures/events (never `In()` all historical FT ids)
   * 3. For each pending pick on a finished fixture/event, determine won/lost via determinePickResult
   * 4. For tickets that are ready (all legs graded, or any leg already lost), set ticket result.
   *    Voided legs (DNB draw, postponed, AH push) are dropped; remaining legs settle at reduced odds.
   *    Pending legs older than 36h with no score are voided so one missing fixture cannot pin an acca.
   * 5. If marketplace coupon with price > 0: settle escrow (payout tipster or refund buyer)
   *
   * Supported markets: Match Winner, Double Chance, BTTS, O/U (full + first half), DNB, Odd/Even, Asian Handicap, Correct Score, etc.
   * Unmatched predictions log a warning so new market types can be added.
   */
  async runSettlement(): Promise<{
    picksUpdated: number;
    ticketsSettled: number;
  }> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await this.promoteScoredPastFixturesToFt(twoHoursAgo);

    const pendingPicks = await this.pickRepo.find({ where: { result: 'pending' } });
    const pendingFixturePicks = pendingPicks.filter((p) => p.fixtureId != null);
    const pendingEventPicks = pendingPicks.filter((p) => p.eventId != null);

    const [fixtureMap, eventMap] = await Promise.all([
      this.loadFixturesForGrading(pendingFixturePicks.map((p) => p.fixtureId)),
      this.loadEventsForGrading(pendingEventPicks.map((p) => p.eventId)),
    ]);

    this.logger.debug(
      `Settlement: ${pendingPicks.length} pending picks (${pendingFixturePicks.length} fixture, ${pendingEventPicks.length} event)`,
    );

    let picksUpdated = 0;
    const voidedPickIds = new Set<number>();

    // Auto-void picks on fixtures that are postponed/cancelled (no result, match date in past)
    const voidStatuses = ['PST', 'CANC', 'ABD', 'AWD', 'WO'];
    const voidFixtures = await this.fixtureRepo
      .createQueryBuilder('f')
      .select('f.id')
      .where('f.status IN (:...statuses)', { statuses: voidStatuses })
      .andWhere('f.match_date < :cutoff', { cutoff: twoHoursAgo })
      .getMany();
    const voidFixtureIds = voidFixtures.map((f) => f.id);
    if (voidFixtureIds.length > 0) {
      const voidPicks = await this.findPicksWhereIn('fixtureId', voidFixtureIds, { result: 'pending' });
      for (const pick of voidPicks) {
        pick.result = 'void';
        await this.pickRepo.save(pick);
        picksUpdated++;
        voidedPickIds.add(pick.id);
      }
      if (voidPicks.length > 0) {
        this.logger.log(`Voided ${voidPicks.length} pick(s) on postponed/cancelled fixtures`);
      }
    }

    const stalePending = pendingPicks.filter((p) => isStalePendingPick({ result: p.result, matchDate: p.matchDate }));
    if (stalePending.length > 0) {
      let staleVoided = 0;
      for (const pick of stalePending) {
        if (voidedPickIds.has(pick.id) || pick.result !== 'pending') continue;
        const fix = pick.fixtureId != null ? fixtureMap.get(pick.fixtureId) : undefined;
        if (fix && this.isFixtureReadyToGrade(fix, twoHoursAgo)) continue;
        pick.result = 'void';
        await this.pickRepo.save(pick);
        picksUpdated++;
        staleVoided++;
        voidedPickIds.add(pick.id);
      }
      if (staleVoided > 0) {
        this.logger.log(`Voided ${staleVoided} stale pending pick(s) (>36h after kick-off, ungradable)`);
      }
    }

    for (const pick of pendingFixturePicks) {
      if (voidedPickIds.has(pick.id)) continue;
      const fix = fixtureMap.get(pick.fixtureId!);
      if (!fix || !this.isFixtureReadyToGrade(fix, twoHoursAgo)) continue;

      const result = determinePickResult(
        this.pickGradingInput(pick),
        fix.homeScore!,
        fix.awayScore!,
        fix.homeTeamName,
        fix.awayTeamName,
        fix.htHomeScore,
        fix.htAwayScore,
        this.fixtureMatchStats(fix),
      );
      if (result) {
        pick.result = result;
        await this.pickRepo.save(pick);
        picksUpdated++;
      } else if (this.pickGradingInput(pick)) {
        this.logger.warn(
          `Unmatched prediction: "${pick.prediction}" (key=${pick.outcomeKey ?? '—'}). Supported: ${SETTLEMENT_SUPPORTED_MARKETS.join('; ')}`,
        );
      }
    }

    for (const pick of pendingEventPicks) {
      if (voidedPickIds.has(pick.id) || pick.result !== 'pending') continue;
      const evt = eventMap.get(pick.eventId!);
      if (!evt || !this.isEventReadyToGrade(evt)) continue;

      const result = determinePickResult(
        this.pickGradingInput(pick),
        evt.homeScore!,
        evt.awayScore!,
        evt.homeTeam,
        evt.awayTeam,
      );
      if (result) {
        pick.result = result;
        await this.pickRepo.save(pick);
        picksUpdated++;
      } else if (this.pickGradingInput(pick)) {
        this.logger.warn(
          `Unmatched prediction: "${pick.prediction}" (key=${pick.outcomeKey ?? '—'}). Supported: ${SETTLEMENT_SUPPORTED_MARKETS.join('; ')}`,
        );
      }
    }

    const allPendingTickets = await this.ticketRepo.find({
      where: { result: 'pending' },
      select: ['id', 'userId', 'isMarketplace', 'price', 'title', 'totalOdds'],
    });
    const pendingTicketPicks = await this.findPicksWhereIn(
      'accumulatorId',
      allPendingTickets.map((t) => t.id),
    );
    const picksByTicketId = new Map<number, AccumulatorPick[]>();
    for (const p of pendingTicketPicks) {
      const list = picksByTicketId.get(p.accumulatorId) ?? [];
      list.push(p);
      picksByTicketId.set(p.accumulatorId, list);
    }

    const houseVipUserId = await this.telegramVip.houseVipTipsterUserId();
    let ticketsSettled = 0;
    const statsSyncUserIds = new Set<number>();
    const wonMarketplacePosts: Array<{
      couponId: number;
      title: string;
      tipsterName: string | null;
      totalOdds: number | null;
      isFree: boolean;
      legs: TelegramSlipLeg[];
    }> = [];
    const wonVipPosts: Array<{
      couponId: number;
      title: string;
      totalOdds: number | null;
      legs: TelegramSlipLeg[];
    }> = [];
    for (const ticket of allPendingTickets) {
      const picks = picksByTicketId.get(ticket.id) ?? [];
      if (!ticketReadyToSettle(picks)) continue;

      const patch = this.ticketOutcomePatch(picks, ticket.totalOdds);
      ticket.result = patch.result;
      ticket.status = patch.status;
      if (patch.totalOdds != null) ticket.totalOdds = patch.totalOdds;
      await this.ticketRepo.save(ticket);
      ticketsSettled++;
      if (ticket.userId != null) statsSyncUserIds.add(ticket.userId);

      const priceNum = Number(ticket.price);
      if (ticket.isMarketplace && priceNum > 0) {
        await this.settleEscrow(ticket.id, ticket.userId, ticket.result, ticket.title);
      }
      if (ticket.result !== 'won') continue;
      const legs = await this.telegramLegsForPicks(picks);
      if (ticket.isMarketplace) {
        const isHouseVip = houseVipUserId != null && ticket.userId === houseVipUserId;
        if (!isHouseVip) {
          wonMarketplacePosts.push({
            couponId: ticket.id,
            title: ticket.title || 'Pick',
            tipsterName: null,
            totalOdds: ticket.totalOdds != null ? Number(ticket.totalOdds) : null,
            isFree: !(priceNum > 0),
            legs,
          });
        }
      }
      if (houseVipUserId != null && ticket.userId === houseVipUserId) {
        wonVipPosts.push({
          couponId: ticket.id,
          title: ticket.title || 'Pick',
          totalOdds: ticket.totalOdds != null ? Number(ticket.totalOdds) : null,
          legs,
        });
      }
    }

    for (const post of wonVipPosts) {
      this.telegramVip
        .postVipWin({
          ...post,
          tipsterName: 'VIP · Two-Fold',
        })
        .catch(() => {});
    }

    if (wonMarketplacePosts.length > 0) {
      const sellerIds = [
        ...new Set(
          allPendingTickets
            .filter((t) => wonMarketplacePosts.some((w) => w.couponId === t.id) && t.userId != null)
            .map((t) => t.userId as number),
        ),
      ];
      const sellers: User[] = [];
      for (const chunk of chunkIds(sellerIds)) {
        sellers.push(
          ...(await this.usersRepo.find({
            where: { id: In(chunk) },
            select: ['id', 'displayName', 'username'],
          })),
        );
      }
      const nameById = new Map(
        sellers.map((u) => [u.id, u.displayName || u.username || 'Tipster'] as const),
      );
      for (const post of wonMarketplacePosts) {
        const ticket = allPendingTickets.find((t) => t.id === post.couponId);
        const tipsterName = ticket?.userId != null ? nameById.get(ticket.userId) ?? null : null;
        const elig = await this.telegramEligibility.canPostForUserId(ticket?.userId);
        if (!elig.ok) continue;
        this.telegramChannelService
          .postWin({
            ...post,
            tipsterName,
          })
          .catch(() => {});
      }
    }

    const voidedLegFix = await this.reaggregateTicketsWithVoidedLegs();
    ticketsSettled += voidedLegFix.ticketsChanged;
    for (const userId of voidedLegFix.userIds) statsSyncUserIds.add(userId);

    if (statsSyncUserIds.size > 0) {
      await this.persistTipsterStatsForUserIds(statsSyncUserIds);
      this.resultTrackerService.scheduleLeaderboardRefresh('marketplace-settlement', { immediate: true });
    }

    if (picksUpdated > 0 || ticketsSettled > 0) {
      this.logger.log(`Settlement: ${picksUpdated} picks updated, ${ticketsSettled} tickets settled`);
    }

    return { picksUpdated, ticketsSettled };
  }

  private async settleEscrow(
    accumulatorId: number,
    sellerId: number,
    result: string,
    ticketTitle: string | null | undefined,
  ) {
    const couponRef = couponUserFacingRef(accumulatorId, ticketTitle);
    const pickTitleMeta = ticketTitle?.trim() || '';
    const funds = await this.escrowRepo.find({
      where: { pickId: accumulatorId, status: 'held' },
    });

    // Load platform commission rate (default 30% — must match Terms)
    const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
    const commissionRate = clampPlatformCommissionPercent(apiSettings?.platformCommissionRate);

    const processedUsers = new Set<number>();
    let totalCommission = 0;
    let totalNetPayout = 0;
    let buyerCount = 0;

    for (const f of funds) {
      if (!processedUsers.has(f.userId)) {
        const gross = Number(f.amount);
        if (result === 'won') {
          const { commission, netPayout } = splitGrossForTipsterPayout(gross, commissionRate);
          totalCommission += commission;
          totalNetPayout += netPayout;
          buyerCount++;

          // Credit tipster with net amount
          await this.walletService.credit(
            sellerId,
            netPayout,
            'payout',
            `pick-${accumulatorId}`,
            `Payout for ${couponRef} (gross GHS ${gross.toFixed(2)} − ${commissionRate}% platform fee)`,
          );

          // Record commission transaction for revenue analytics (does NOT change any wallet balance)
          if (commission > 0) {
            await this.walletService.recordTransaction(
              sellerId,
              commission,
              'commission',
              `commission-pick-${accumulatorId}`,
              `Platform commission (${commissionRate}%) on ${couponRef}`,
              { pickId: accumulatorId, grossAmount: gross, commissionRate, netPayout },
            );
          }

          await this.notificationsService.create({
            userId: f.userId,
            type: 'settlement',
            title: 'Pick Won!',
            message: `Your purchased pick ${couponRef} won! The tipster has been paid.`,
            link: `/my-purchases`,
            icon: 'trophy',
            sendEmail: true,
            metadata: { pickId: String(accumulatorId), variant: 'won', pickTitle: pickTitleMeta },
          }).catch(() => { });
        } else {
          // Lost or void: full refund to buyer (stake back)
          const isVoid = result === 'void';
          await this.walletService.credit(
            f.userId,
            gross,
            'refund',
            `pick-${accumulatorId}`,
            isVoid ? `Refund for voided ${couponRef}` : `Refund for ${couponRef}`,
          );
          await this.notificationsService.create({
            userId: f.userId,
            type: 'settlement',
            title: isVoid ? 'Pick Void — Refunded' : 'Pick Lost — Refunded',
            message: isVoid
              ? `Your purchased pick ${couponRef} was voided (e.g. postponed/cancelled). A full refund of GHS ${gross.toFixed(2)} has been credited to your wallet.`
              : `Your purchased pick ${couponRef} lost. A full refund of GHS ${gross.toFixed(2)} has been credited to your wallet.`,
            link: `/my-purchases`,
            icon: 'refund',
            sendEmail: true,
            metadata: {
              pickId: String(accumulatorId),
              variant: result,
              amount: gross.toFixed(2),
              pickTitle: pickTitleMeta,
            },
          }).catch(() => { });
        }
        processedUsers.add(f.userId);
      } else {
        this.logger.warn(`Duplicate escrow fund (id: ${f.id}) found for user ${f.userId} on pick ${accumulatorId}. Skipping payout/refund.`);
      }
      f.status = result === 'won' ? 'released' : 'refunded';
      await this.escrowRepo.save(f);
    }

    // Notify tipster with full breakdown
    const payoutMsg = result === 'won'
      ? totalNetPayout > 0
        ? `Your pick ${couponRef} won! GHS ${totalNetPayout.toFixed(2)} credited (${buyerCount} buyer${buyerCount !== 1 ? 's' : ''} · GHS ${totalCommission.toFixed(2)} platform fee deducted).`
        : `Your pick ${couponRef} won! Payout credited to your wallet.`
      : result === 'void'
        ? `Your pick ${couponRef} was voided. Full refunds have been sent to buyers.`
        : `Your pick ${couponRef} lost. Full refunds have been sent to buyers.`;

    await this.notificationsService.create({
      userId: sellerId,
      type: 'settlement',
      title: result === 'won' ? 'Payout Sent' : 'Pick Settled',
      message: payoutMsg,
      link: `/my-picks`,
      icon: result === 'won' ? 'trophy' : 'info',
      metadata: {
        pickId: String(accumulatorId),
        pickTitle: pickTitleMeta,
        variant: result,
        grossAmount: String(totalNetPayout + totalCommission),
        netPayout: String(totalNetPayout),
        commissionDeducted: String(totalCommission),
        commissionRate: String(commissionRate),
      },
      sendEmail: true,
    }).catch(() => { });
  }
}
