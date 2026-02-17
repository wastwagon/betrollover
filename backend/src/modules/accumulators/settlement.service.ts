import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AccumulatorTicket } from './entities/accumulator-ticket.entity';
import { AccumulatorPick } from './entities/accumulator-pick.entity';
import { EscrowFund } from './entities/escrow-fund.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { SmartCoupon, SmartCouponFixture } from '../coupons/entities/smart-coupon.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { User } from '../users/entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TipsterService } from '../tipster/tipster.service';

/** Market types and selection formats we support for settlement. See determinePickResult. */
export const SETTLEMENT_SUPPORTED_MARKETS = [
  'Match Winner (1X2): Home, Away, Draw',
  'Double Chance: 1X, X2, 12 (Home or Draw, Draw or Away, Home or Away)',
  'Both Teams To Score: Yes, No',
  'Goals Over/Under: 1.5, 2.5, 3.5 (Over/Under)',
  'Correct Score: e.g. 2-1, 1-1',
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
    @InjectRepository(SmartCoupon)
    private smartCouponRepo: Repository<SmartCoupon>,
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
    smartCouponsSettled: number;
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
   * 6. Settle Smart Coupons (Double Chance tips) — update status and profit when all fixtures finish
   *
   * Supported markets: Match Winner, Double Chance, BTTS, Over/Under 1.5/2.5/3.5, Correct Score.
   * Unmatched predictions log a warning so new market types can be added.
   */
  async runSettlement(): Promise<{
    picksUpdated: number;
    ticketsSettled: number;
    smartCouponsSettled: number;
  }> {
    // Get all finished fixtures: status FT, OR has scores and match was >2h ago (catch missed updates)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const [ftFixtures, scoredPastFixtures] = await Promise.all([
      this.fixtureRepo.find({
        where: { status: 'FT' },
        select: ['id', 'homeScore', 'awayScore'],
      }),
      this.fixtureRepo
        .createQueryBuilder('f')
        .select(['f.id', 'f.homeScore', 'f.awayScore'])
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

    if (fixtureIds.length === 0) {
      const smartSettled = await this.settleSmartCoupons([], new Map());
      return { picksUpdated: 0, ticketsSettled: 0, smartCouponsSettled: smartSettled };
    }

    const fixtureMap = new Map(finishedFixtures.map((f) => [f.id, f]));
    const pendingPicks = await this.pickRepo.find({
      where: { fixtureId: In(fixtureIds), result: 'pending' },
    });

    let picksUpdated = 0;
    for (const pick of pendingPicks) {
      const fix = fixtureMap.get(pick.fixtureId!);
      if (!fix || fix.homeScore == null || fix.awayScore == null) continue;

      const result = this.determinePickResult(pick.prediction, fix.homeScore, fix.awayScore, fix.homeTeamName, fix.awayTeamName);
      if (result) {
        pick.result = result;
        await this.pickRepo.save(pick);
        picksUpdated++;
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

    const smartCouponsSettled = await this.settleSmartCoupons(fixtureIds, fixtureMap);
    return { picksUpdated, ticketsSettled, smartCouponsSettled };
  }

  /**
   * Settle Smart Coupons when their fixtures finish.
   * Smart Coupons use Double Chance tips only (Home or Draw, Draw or Away, Home or Away).
   * Profit: 1 unit stake assumed — won = totalOdds - 1, lost = -1.
   */
  private async settleSmartCoupons(
    finishedFixtureIds: number[],
    fixtureMap: Map<number, { homeScore: number | null; awayScore: number | null }>,
  ): Promise<number> {
    if (finishedFixtureIds.length === 0) return 0;

    const finishedSet = new Set(finishedFixtureIds);
    const pendingCoupons = await this.smartCouponRepo.find({
      where: { status: 'pending' },
    });

    let settled = 0;
    for (const coupon of pendingCoupons) {
      const fixtures = (coupon.fixtures || []) as SmartCouponFixture[];
      if (fixtures.length === 0) continue;

      let anyUpdated = false;
      const updatedFixtures = fixtures.map((f) => {
        if (f.status === 'won' || f.status === 'lost') return f;
        const fix = fixtureMap.get(f.fixtureId);
        if (!fix || fix.homeScore == null || fix.awayScore == null || !finishedSet.has(f.fixtureId)) return f;
        const result = this.determinePickResult(f.tip, fix.homeScore, fix.awayScore, f.home, f.away);
        if (result) {
          anyUpdated = true;
          return { ...f, status: result };
        }
        return f;
      });

      if (!anyUpdated) continue;

      const allSettled = updatedFixtures.every((f) => f.status === 'won' || f.status === 'lost');
      if (!allSettled) {
        coupon.fixtures = updatedFixtures;
        await this.smartCouponRepo.save(coupon);
        continue;
      }

      const hasLost = updatedFixtures.some((f) => f.status === 'lost');
      coupon.status = hasLost ? 'lost' : 'won';
      coupon.fixtures = updatedFixtures;
      // Profit per 1 unit stake: won = totalOdds - 1, lost = -1
      const totalOdds = Number(coupon.totalOdds);
      coupon.profit = hasLost ? -1 : totalOdds - 1;
      await this.smartCouponRepo.save(coupon);
      settled++;
    }

    return settled;
  }

  private determinePickResult(
    prediction: string,
    homeScore: number,
    awayScore: number,
    homeTeam?: string,
    awayTeam?: string,
  ): 'won' | 'lost' | 'void' | null {
    const pred = (prediction || '').trim().toLowerCase();
    const total = homeScore + awayScore;
    const homeWin = homeScore > awayScore;
    const awayWin = awayScore > homeScore;
    const draw = homeScore === awayScore;
    const bothScored = homeScore > 0 && awayScore > 0;

    const homeName = (homeTeam || '').toLowerCase();
    const awayName = (awayTeam || '').toLowerCase();

    // --- Double Chance (check FIRST - before home/away/draw) ---
    // Standard patterns
    if (pred.includes('12') || pred.includes('home_away') || pred.includes('home or away')) {
      return homeWin || awayWin ? 'won' : 'lost';
    }
    if (pred.includes('1x') || pred.includes('home_draw') || pred.includes('home or draw')) {
      return homeWin || draw ? 'won' : 'lost';
    }
    if (pred.includes('x2') || pred.includes('draw_away') || pred.includes('draw or away')) {
      return awayWin || draw ? 'won' : 'lost';
    }

    // Team-name based patterns (e.g. "Santos W or Draw")
    if (homeName && (pred.includes(`${homeName} or draw`) || pred.includes(`${homeName}_draw`) || pred.includes(`${homeName} or x`))) {
      return homeWin || draw ? 'won' : 'lost';
    }
    if (awayName && (pred.includes(`${awayName} or draw`) || pred.includes(`draw or ${awayName}`) || pred.includes(`x2`))) {
      return awayWin || draw ? 'won' : 'lost';
    }
    if (homeName && awayName && (pred.includes(`${homeName} or ${awayName}`) || pred.includes(`${homeName}_${awayName}`))) {
      return homeWin || awayWin ? 'won' : 'lost';
    }

    // Catch-all regex for any "X or Draw" where X might be a partial team name or 1
    if (/(home|1|[\w\s.-]+) or draw/i.test(pred) || /(home|1|[\w\s.-]+) or x/i.test(pred)) {
      // If tip is "Away or Draw", this regex might be too broad if we don't check 'away'
      if (!pred.includes('away')) {
        return homeWin || draw ? 'won' : 'lost';
      }
    }
    if (/(away|2|[\w\s.-]+) or draw/i.test(pred) || /draw or (away|2|[\w\s.-]+)/i.test(pred) || /x or (away|2)/i.test(pred)) {
      if (!pred.includes('home') || pred.indexOf('home') > pred.indexOf('away')) { // simple check to favor away if both mentioned in complex ways
        return awayWin || draw ? 'won' : 'lost';
      }
    }

    // --- Match Winner (1X2) ---
    // Be careful with greedy "draw" matching - only match if it's strictly Match Winner
    if (
      pred === 'home' ||
      pred === '1' ||
      pred === 'match winner: home' ||
      pred === 'home win'
    ) {
      return homeWin ? 'won' : 'lost';
    }
    if (
      pred === 'away' ||
      pred === '2' ||
      pred === 'match winner: away' ||
      pred === 'away win'
    ) {
      return awayWin ? 'won' : 'lost';
    }
    if (
      pred === 'draw' ||
      pred === 'x' ||
      pred === 'match winner: draw'
    ) {
      return draw ? 'won' : 'lost';
    }

    // --- Goals Over/Under (1.5, 2.5, 3.5) ---
    if (pred.includes('over 3.5') || pred.includes('over3.5')) {
      return total > 3.5 ? 'won' : 'lost';
    }
    if (pred.includes('under 3.5') || pred.includes('under3.5')) {
      return total < 3.5 ? 'won' : 'lost';
    }
    if (pred.includes('over 2.5') || pred.includes('over2.5') || pred === 'over25') {
      return total > 2.5 ? 'won' : 'lost';
    }
    if (pred.includes('under 2.5') || pred.includes('under2.5') || pred === 'under25') {
      return total < 2.5 ? 'won' : 'lost';
    }
    if (pred.includes('over 1.5') || pred.includes('over1.5')) {
      return total > 1.5 ? 'won' : 'lost';
    }
    if (pred.includes('under 1.5') || pred.includes('under1.5')) {
      return total < 1.5 ? 'won' : 'lost';
    }

    // --- Both Teams To Score ---
    if (pred.includes('btts') && pred.includes('no')) {
      return !bothScored ? 'won' : 'lost';
    }
    if (pred.includes('btts') || (pred.includes('both teams') && pred.includes('yes'))) {
      return bothScored ? 'won' : 'lost';
    }
    if (pred.includes('both teams') && pred.includes('no')) {
      return !bothScored ? 'won' : 'lost';
    }

    // --- Correct Score (e.g. "2-1", "1:1", "Correct Score: 2-1") ---
    const scoreMatch = pred.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (scoreMatch) {
      const expected = `${scoreMatch[1]}-${scoreMatch[2]}`;
      const actual = `${homeScore}-${awayScore}`;
      return expected === actual ? 'won' : 'lost';
    }

    this.logger.warn(
      `Unmatched prediction for settlement: "${prediction}" (normalized: "${pred}"). ` +
      `Add support in determinePickResult. Supported: ${SETTLEMENT_SUPPORTED_MARKETS.join('; ')}`,
    );
    return null;
  }

  private async settleEscrow(accumulatorId: number, sellerId: number, result: string, title: string) {
    const funds = await this.escrowRepo.find({
      where: { pickId: accumulatorId, status: 'held' },
    });

    const processedUsers = new Set<number>();

    for (const f of funds) {
      if (!processedUsers.has(f.userId)) {
        if (result === 'won') {
          await this.walletService.credit(
            sellerId,
            Number(f.amount),
            'payout',
            `pick-${accumulatorId}`,
            `Payout for pick ${accumulatorId}`,
          );
          await this.notificationsService.create({
            userId: f.userId,
            type: 'settlement',
            title: 'Pick Won!',
            message: `Your purchased pick "${title}" won! Winnings have been credited to your wallet.`,
            link: `/my-purchases`,
            icon: 'trophy',
            sendEmail: true,
            metadata: { pickTitle: title, variant: 'won' },
          }).catch(() => { });
        } else {
          await this.walletService.credit(
            f.userId,
            Number(f.amount),
            'refund',
            `pick-${accumulatorId}`,
            `Refund for pick ${accumulatorId}`,
          );
          await this.notificationsService.create({
            userId: f.userId,
            type: 'settlement',
            title: 'Pick Lost - Refunded',
            message: `Your purchased pick "${title}" lost. A refund of GHS ${Number(f.amount).toFixed(2)} has been credited to your wallet.`,
            link: `/my-purchases`,
            icon: 'refund',
            sendEmail: true,
            metadata: { pickTitle: title, variant: 'lost', amount: Number(f.amount).toFixed(2) },
          }).catch(() => { });
        }
        processedUsers.add(f.userId);
      } else {
        this.logger.warn(`Duplicate escrow fund (id: ${f.id}) found for user ${f.userId} on pick ${accumulatorId}. Skipping payout/refund.`);
      }
      f.status = result === 'won' ? 'released' : 'refunded';
      await this.escrowRepo.save(f);
    }
    await this.notificationsService.create({
      userId: sellerId,
      type: 'settlement',
      title: result === 'won' ? 'Payout Sent' : 'Pick Settled',
      message: result === 'won'
        ? `Your pick "${title}" won! Your share has been credited to your wallet.`
        : `Your pick "${title}" lost. Refunds have been sent to buyers.`,
      link: `/my-picks`,
      icon: result === 'won' ? 'trophy' : 'info',
      metadata: { pickTitle: title, variant: result },
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
