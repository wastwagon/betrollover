import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AccumulatorTicket } from './entities/accumulator-ticket.entity';
import { AccumulatorPick } from './entities/accumulator-pick.entity';
import { EscrowFund } from './entities/escrow-fund.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { User } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TipsterService } from '../tipster/tipster.service';
import { determinePickResult } from './settlement-logic';

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
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private walletService: WalletService,
    private notificationsService: NotificationsService,
    private tipsterService: TipsterService,
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
    // Get all finished fixtures: status FT, OR has scores and match was >2h ago (catch missed updates)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
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
        await this.fixtureRepo.update({ id: f.id }, { status: 'FT' });
      }
    }

    const fixtureIds = finishedFixtures
      .filter((f) => f.homeScore !== null && f.awayScore !== null)
      .map((f) => f.id);

    // Finished sport_events (all non-football sports) for event-based picks
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

    const pendingFixturePicks = fixtureIds.length > 0
      ? await this.pickRepo.find({ where: { fixtureId: In(fixtureIds), result: 'pending' } })
      : [];
    const pendingEventPicks = eventIds.length > 0
      ? await this.pickRepo.find({ where: { eventId: In(eventIds), result: 'pending' } })
      : [];

    const fixtureMap = new Map(finishedFixtures.map((f) => [f.id, f]));
    let picksUpdated = 0;

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

      if (ticket.isMarketplace && ticket.price > 0) {
        const fullTicket = await this.ticketRepo.findOne({ where: { id: ticket.id }, select: ['title'] });
        await this.settleEscrow(ticket.id, ticket.userId, ticket.result, fullTicket?.title ?? `Pick #${ticket.id}`);
      }
    }

    return { picksUpdated, ticketsSettled };
  }

  private async settleEscrow(accumulatorId: number, sellerId: number, result: string, title: string) {
    const funds = await this.escrowRepo.find({
      where: { pickId: accumulatorId, status: 'held' },
    });

    // Load platform commission rate (default 10%)
    const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
    const commissionRate = Math.min(50, Math.max(0, Number(apiSettings?.platformCommissionRate ?? 10.0)));

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
          // Lost: full refund to buyer
          await this.walletService.credit(
            f.userId,
            gross,
            'refund',
            `pick-${accumulatorId}`,
            `Refund for pick "${title}"`,
          );
          await this.notificationsService.create({
            userId: f.userId,
            type: 'settlement',
            title: 'Pick Lost — Refunded',
            message: `Your purchased pick "${title}" lost. A full refund of GHS ${gross.toFixed(2)} has been credited to your wallet.`,
            link: `/my-purchases`,
            icon: 'refund',
            sendEmail: true,
            metadata: { pickTitle: title, variant: 'lost', amount: gross.toFixed(2) },
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

    // Notify tipster if ROI fell below minimum (they can only post free picks until it improves)
    const user = await this.userRepo.findOne({ where: { id: sellerId }, select: ['role'] });
    if (user?.role === 'tipster' || user?.role === 'admin') {
      const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
      const minimumROI = Number(apiSettings?.minimumROI ?? 20.0);
      const stats = await this.tipsterService.getStats(sellerId, user.role);
      const settled = stats.wonPicks + stats.lostPicks;
      if (stats.roi < minimumROI && settled > 0) {
        await this.notificationsService.create({
          userId: sellerId,
          type: 'roi_below_minimum',
          title: 'ROI Below Minimum',
          message: `Your ROI (${stats.roi.toFixed(2)}%) is below the minimum ${minimumROI}%. You can only post free picks until you improve your ROI. Keep posting free picks to build your track record.`,
          link: '/create-pick',
          icon: 'alert',
          sendEmail: true,
        }).catch(() => { });
      }
    }
  }
}
