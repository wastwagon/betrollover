import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { AccumulatorTicket } from './entities/accumulator-ticket.entity';
import { AccumulatorPick } from './entities/accumulator-pick.entity';
import { EscrowFund } from './entities/escrow-fund.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { determinePickResult } from './settlement-logic';
import { clampPlatformCommissionPercent } from '../../common/platform-commission';

/** Market types and selection formats we support for settlement. See determinePickResult. */
export const SETTLEMENT_SUPPORTED_MARKETS = [
  'Match Winner (1X2): Home, Away, Draw (also Match Winner: Team/Player name)',
  'Double Chance: 1X, X2, 12 (slash or text format)',
  'Both Teams To Score: Yes, No',
  'Over/Under: Over/Under 1.5, 2.5, 3.5 (goals, points, etc.)',
  'Handicap/Spread: Home -3.5, Away +2.5, Team Name ±N',
  'Odd/Even: Total goals/points odd or even',
  'Draw No Bet: Match winner, draw = void',
  'Set Betting (tennis): 2-0, 2-1 (order-agnostic)',
  'Correct Score: 2-1, 1:1 (dash or colon)',
] as const;

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
    private walletService: WalletService,
    private notificationsService: NotificationsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

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

  private async loadFinishedFixtureAndEventMaps(twoHoursAgo: Date): Promise<{
    finishedFixtures: Fixture[];
    fixtureMap: Map<number, Fixture>;
    fixtureIds: number[];
    eventsWithScores: SportEvent[];
    eventMap: Map<number, SportEvent>;
    eventIds: number[];
  }> {
    const [ftFixtures, scoredPastFixtures] = await Promise.all([
      this.fixtureRepo.find({
        where: { status: 'FT' },
        select: ['id', 'homeScore', 'awayScore', 'homeTeamName', 'awayTeamName'],
      }),
      this.fixtureRepo
        .createQueryBuilder('f')
        .select(['f.id', 'f.homeScore', 'f.awayScore', 'f.homeTeamName', 'f.awayTeamName'])
        .where("f.status != 'FT'")
        .andWhere('f.matchDate < :cutoff', { cutoff: twoHoursAgo })
        .andWhere('f.homeScore IS NOT NULL')
        .andWhere('f.awayScore IS NOT NULL')
        .getMany(),
    ]);

    const seen = new Set(ftFixtures.map((f) => f.id));
    const finishedFixtures = [...ftFixtures];
    for (const f of scoredPastFixtures) {
      if (f.homeScore != null && f.awayScore != null && !seen.has(f.id)) {
        seen.add(f.id);
        finishedFixtures.push(f);
        await this.fixtureRepo.update({ id: f.id }, { status: 'FT', statusElapsed: null });
      }
    }

    const fixtureIds = finishedFixtures
      .filter((f) => f.homeScore !== null && f.awayScore !== null)
      .map((f) => f.id);

    const finishedEvents = await this.sportEventRepo.find({
      where: [
        { sport: 'basketball', status: 'FT' },
        { sport: 'rugby', status: 'FT' },
        { sport: 'mma', status: 'FT' },
        { sport: 'volleyball', status: 'FT' },
        { sport: 'hockey', status: 'FT' },
        { sport: 'american_football', status: 'FT' },
        { sport: 'tennis', status: 'FT' },
      ],
      select: ['id', 'homeScore', 'awayScore', 'homeTeam', 'awayTeam'],
    });
    const eventsWithScores = finishedEvents.filter((e) => e.homeScore != null && e.awayScore != null);
    const eventIds = eventsWithScores.map((e) => e.id);
    const eventMap = new Map(eventsWithScores.map((e) => [e.id, e]));
    const fixtureMap = new Map(finishedFixtures.map((f) => [f.id, f]));

    return {
      finishedFixtures,
      fixtureMap,
      fixtureIds,
      eventsWithScores,
      eventMap,
      eventIds,
    };
  }

  /**
   * Re-grade picks already marked won/lost/void using current fixture/event scores; updates coupon outcome and
   * escrow when the result flips (e.g. wrong score while API quota was exhausted). Run after scores are correct.
   */
  async reconcileMisgradedSettlements(): Promise<{
    picksRegraded: number;
    ticketsOutcomeChanged: number;
    escrowTicketsAdjusted: number;
    errors: string[];
  }> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const { fixtureMap, fixtureIds, eventMap, eventIds } = await this.loadFinishedFixtureAndEventMaps(twoHoursAgo);

    type Computed = 'won' | 'lost' | 'void';
    const deltas: { pickId: number; accumulatorId: number; computed: Computed }[] = [];

    if (fixtureIds.length > 0) {
      const picks = await this.pickRepo.find({
        where: { fixtureId: In(fixtureIds), result: In(['won', 'lost', 'void']) },
      });
      for (const pick of picks) {
        const fix = fixtureMap.get(pick.fixtureId!);
        if (!fix || fix.homeScore == null || fix.awayScore == null) continue;
        const computed = determinePickResult(
          pick.prediction,
          fix.homeScore,
          fix.awayScore,
          fix.homeTeamName,
          fix.awayTeamName,
        );
        if (!computed || computed === pick.result) continue;
        deltas.push({ pickId: pick.id, accumulatorId: pick.accumulatorId, computed });
      }
    }

    if (eventIds.length > 0) {
      const picks = await this.pickRepo.find({
        where: { eventId: In(eventIds), result: In(['won', 'lost', 'void']) },
      });
      for (const pick of picks) {
        const evt = eventMap.get(pick.eventId!);
        if (!evt || evt.homeScore == null || evt.awayScore == null) continue;
        const computed = determinePickResult(
          pick.prediction,
          evt.homeScore,
          evt.awayScore,
          evt.homeTeam,
          evt.awayTeam,
        );
        if (!computed || computed === pick.result) continue;
        deltas.push({ pickId: pick.id, accumulatorId: pick.accumulatorId, computed });
      }
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
          if (!picks.length || !picks.every((p) => p.result !== 'pending')) {
            return { picks: ticketDeltas.length, changed: false, escrow: false };
          }

          const newAgg = this.aggregateTicketResult(picks);
          if (newAgg === ticket.result) {
            return { picks: ticketDeltas.length, changed: false, escrow: false };
          }

          const oldResult = ticket.result;
          let escrowAdjusted = false;
          if (ticket.isMarketplace && Number(ticket.price) > 0 && this.escrowWalletFlipNeeded(oldResult, newAgg)) {
            const titleRow = await tRepo.findOne({ where: { id: ticketId }, select: ['title'] });
            const title = titleRow?.title ?? `Pick #${ticketId}`;
            if (oldResult === 'won') {
              await this.escrowWonToLostOrVoid(manager, ticketId, ticket.userId, title, newAgg === 'void');
              escrowAdjusted = true;
            } else if (newAgg === 'won') {
              await this.escrowLostOrVoidToWon(manager, ticketId, ticket.userId, title);
              escrowAdjusted = true;
            }
          }

          await tRepo.update({ id: ticketId }, { result: newAgg, status: newAgg });
          return { picks: ticketDeltas.length, changed: true, escrow: escrowAdjusted };
        });

        picksRegraded += summary.picks;
        if (summary.changed) ticketsOutcomeChanged += 1;
        if (summary.escrow) escrowTicketsAdjusted += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Ticket ${ticketId}: ${msg}`);
        this.logger.warn(`Reconcile failed for ticket ${ticketId}: ${msg}`);
      }
    }

    if (picksRegraded > 0) {
      this.logger.log(
        `Reconcile: ${picksRegraded} pick(s) regraded, ${ticketsOutcomeChanged} coupon(s) outcome updated, ${escrowTicketsAdjusted} escrow adjustment(s)`,
      );
    }

    return { picksRegraded, ticketsOutcomeChanged, escrowTicketsAdjusted, errors };
  }

  private aggregateTicketResult(picks: AccumulatorPick[]): 'won' | 'lost' | 'void' {
    const hasLost = picks.some((p) => p.result === 'lost');
    const hasVoid = picks.some((p) => p.result === 'void');
    return hasLost ? 'lost' : hasVoid ? 'void' : 'won';
  }

  private escrowWalletFlipNeeded(oldResult: string, newResult: string): boolean {
    return (oldResult === 'won') !== (newResult === 'won');
  }

  private async escrowLostOrVoidToWon(
    manager: EntityManager,
    ticketId: number,
    sellerId: number,
    title: string,
  ): Promise<void> {
    const eRepo = manager.getRepository(EscrowFund);
    const funds = await eRepo.find({ where: { pickId: ticketId, status: 'refunded' } });
    if (funds.length === 0) {
      const released = await eRepo.find({ where: { pickId: ticketId, status: 'released' } });
      if (released.length > 0) {
        throw new Error('Escrow already released for this coupon; aborting win reconciliation');
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
        `Score correction: reclaim mistaken refund for "${title}"`,
        manager,
      );
      const commission = Number((gross * commissionRate / 100).toFixed(2));
      const netPayout = Number((gross - commission).toFixed(2));
      await this.walletService.credit(
        sellerId,
        netPayout,
        'payout',
        `reconcile-payout-${ticketId}-u${f.userId}`,
        `Score correction payout for "${title}"`,
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
    title: string,
    isVoid: boolean,
  ): Promise<void> {
    const eRepo = manager.getRepository(EscrowFund);
    const funds = await eRepo.find({ where: { pickId: ticketId, status: 'released' } });
    if (funds.length === 0) {
      const refunded = await eRepo.find({ where: { pickId: ticketId, status: 'refunded' } });
      if (refunded.length > 0) {
        throw new Error('Escrow already refunded for this coupon; aborting reversal');
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
        `Score correction: reverse payout for "${title}"`,
        manager,
      );
      await this.walletService.credit(
        f.userId,
        gross,
        'refund',
        `reconcile-recredit-buyer-${ticketId}-u${f.userId}`,
        isVoid
          ? `Score correction: refund for voided "${title}"`
          : `Score correction: refund for lost "${title}"`,
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
   * 1. Find finished fixtures: status=FT OR (has scores + match_date > 2h ago) — catches missed API updates
   * 2. Update any non-FT fixtures with scores to status=FT
   * 3. For each pending pick on those fixtures, determine won/lost via determinePickResult
   * 4. For tickets where all picks are settled, set ticket result (won/lost/void) and status
   * 5. If marketplace coupon with price > 0: settle escrow (payout tipster or refund buyer)
   *
   * Supported markets: Match Winner, Double Chance, BTTS, Over/Under 1.5/2.5/3.5, Correct Score.
   * Unmatched predictions log a warning so new market types can be added.
   */
  async runSettlement(): Promise<{
    picksUpdated: number;
    ticketsSettled: number;
  }> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const { fixtureMap, fixtureIds, eventMap, eventIds, finishedFixtures, eventsWithScores } =
      await this.loadFinishedFixtureAndEventMaps(twoHoursAgo);

    this.logger.debug(
      `Settlement: ${fixtureIds.length} finished fixtures, ${finishedFixtures.length} total`,
    );

    const pendingFixturePicks = fixtureIds.length > 0
      ? await this.pickRepo.find({ where: { fixtureId: In(fixtureIds), result: 'pending' } })
      : [];
    const pendingEventPicks = eventIds.length > 0
      ? await this.pickRepo.find({ where: { eventId: In(eventIds), result: 'pending' } })
      : [];

    this.logger.debug(
      `Settlement: ${eventsWithScores.length} finished sport_events, ${pendingFixturePicks.length} pending fixture picks, ${pendingEventPicks.length} pending event picks`,
    );

    let picksUpdated = 0;

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
      const voidPicks = await this.pickRepo.find({
        where: { fixtureId: In(voidFixtureIds), result: 'pending' },
      });
      for (const pick of voidPicks) {
        pick.result = 'void';
        await this.pickRepo.save(pick);
        picksUpdated++;
      }
      if (voidPicks.length > 0) {
        this.logger.log(`Voided ${voidPicks.length} pick(s) on postponed/cancelled fixtures`);
      }
    }

    for (const pick of pendingFixturePicks) {
      const fix = fixtureMap.get(pick.fixtureId!);
      if (!fix || fix.homeScore == null || fix.awayScore == null) continue;

      const result = determinePickResult(pick.prediction, fix.homeScore, fix.awayScore, fix.homeTeamName, fix.awayTeamName);
      if (result) {
        pick.result = result;
        await this.pickRepo.save(pick);
        picksUpdated++;
      } else if (pick.prediction) {
        this.logger.warn(`Unmatched prediction: "${pick.prediction}". Supported: ${SETTLEMENT_SUPPORTED_MARKETS.join('; ')}`);
      }
    }

    for (const pick of pendingEventPicks) {
      const evt = eventMap.get(pick.eventId!);
      if (!evt || evt.homeScore == null || evt.awayScore == null) continue;

      const result = determinePickResult(pick.prediction, evt.homeScore, evt.awayScore, evt.homeTeam, evt.awayTeam);
      if (result) {
        pick.result = result;
        await this.pickRepo.save(pick);
        picksUpdated++;
      } else if (pick.prediction) {
        this.logger.warn(`Unmatched prediction: "${pick.prediction}". Supported: ${SETTLEMENT_SUPPORTED_MARKETS.join('; ')}`);
      }
    }

    const allPendingTickets = await this.ticketRepo.find({
      where: { result: 'pending' },
      select: ['id', 'userId', 'isMarketplace', 'price'],
    });

    let ticketsSettled = 0;
    for (const ticket of allPendingTickets) {
      const picks = await this.pickRepo.find({ where: { accumulatorId: ticket.id } });
      const allSettled = picks.length > 0 && picks.every((p) => p.result !== 'pending');
      if (!allSettled) continue;

      const hasLost = picks.some((p) => p.result === 'lost');
      const hasVoid = picks.some((p) => p.result === 'void');
      ticket.result = hasLost ? 'lost' : hasVoid ? 'void' : 'won';
      ticket.status = ticket.result;
      await this.ticketRepo.save(ticket);
      ticketsSettled++;

      const priceNum = Number(ticket.price);
      if (ticket.isMarketplace && priceNum > 0) {
        const fullTicket = await this.ticketRepo.findOne({ where: { id: ticket.id }, select: ['title'] });
        await this.settleEscrow(ticket.id, ticket.userId, ticket.result, fullTicket?.title ?? `Pick #${ticket.id}`);
      }
    }

    if (picksUpdated > 0 || ticketsSettled > 0) {
      this.logger.log(`Settlement: ${picksUpdated} picks updated, ${ticketsSettled} tickets settled`);
    }

    return { picksUpdated, ticketsSettled };
  }

  private async settleEscrow(accumulatorId: number, sellerId: number, result: string, title: string) {
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
          // Commission deducted from tipster's gross payout
          const commission = Number((gross * commissionRate / 100).toFixed(2));
          const netPayout = Number((gross - commission).toFixed(2));
          totalCommission += commission;
          totalNetPayout += netPayout;
          buyerCount++;

          // Credit tipster with net amount
          await this.walletService.credit(
            sellerId,
            netPayout,
            'payout',
            `pick-${accumulatorId}`,
            `Payout for pick "${title}" (gross GHS ${gross.toFixed(2)} − ${commissionRate}% platform fee)`,
          );

          // Record commission transaction for revenue analytics (does NOT change any wallet balance)
          if (commission > 0) {
            await this.walletService.recordTransaction(
              sellerId,
              commission,
              'commission',
              `commission-pick-${accumulatorId}`,
              `Platform commission (${commissionRate}%) on pick "${title}"`,
              { pickId: accumulatorId, grossAmount: gross, commissionRate, netPayout },
            );
          }

          await this.notificationsService.create({
            userId: f.userId,
            type: 'settlement',
            title: 'Pick Won!',
            message: `Your purchased pick "${title}" won! The tipster has been paid.`,
            link: `/my-purchases`,
            icon: 'trophy',
            sendEmail: true,
            metadata: { pickTitle: title, variant: 'won' },
          }).catch(() => { });
        } else {
          // Lost or void: full refund to buyer (stake back)
          const isVoid = result === 'void';
          await this.walletService.credit(
            f.userId,
            gross,
            'refund',
            `pick-${accumulatorId}`,
            isVoid ? `Refund for voided pick "${title}"` : `Refund for pick "${title}"`,
          );
          await this.notificationsService.create({
            userId: f.userId,
            type: 'settlement',
            title: isVoid ? 'Pick Void — Refunded' : 'Pick Lost — Refunded',
            message: isVoid
              ? `Your purchased pick "${title}" was voided (e.g. postponed/cancelled). A full refund of GHS ${gross.toFixed(2)} has been credited to your wallet.`
              : `Your purchased pick "${title}" lost. A full refund of GHS ${gross.toFixed(2)} has been credited to your wallet.`,
            link: `/my-purchases`,
            icon: 'refund',
            sendEmail: true,
            metadata: { pickTitle: title, variant: result, amount: gross.toFixed(2) },
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
        ? `Your pick "${title}" won! GHS ${totalNetPayout.toFixed(2)} credited (${buyerCount} buyer${buyerCount !== 1 ? 's' : ''} · GHS ${totalCommission.toFixed(2)} platform fee deducted).`
        : `Your pick "${title}" won! Payout credited to your wallet.`
      : result === 'void'
        ? `Your pick "${title}" was voided. Full refunds have been sent to buyers.`
        : `Your pick "${title}" lost. Full refunds have been sent to buyers.`;

    await this.notificationsService.create({
      userId: sellerId,
      type: 'settlement',
      title: result === 'won' ? 'Payout Sent' : 'Pick Settled',
      message: payoutMsg,
      link: `/my-picks`,
      icon: result === 'won' ? 'trophy' : 'info',
      metadata: {
        pickTitle: title,
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
