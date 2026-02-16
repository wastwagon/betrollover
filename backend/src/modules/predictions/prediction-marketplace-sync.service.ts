import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { PickMarketplace } from '../accumulators/entities/pick-marketplace.entity';
import { Prediction } from './entities/prediction.entity';
import { PredictionFixture } from './entities/prediction-fixture.entity';
import { Tipster } from './entities/tipster.entity';
import { TipstersSetupService } from './tipsters-setup.service';

/** Format selectedOutcome for display (e.g. over25 -> Over 2.5) */
function formatOutcome(outcome: string | null): string {
  const o = (outcome || '').toLowerCase();
  if (o === 'home') return 'Home Win';
  if (o === 'away') return 'Away Win';
  if (o === 'draw') return 'Draw';
  if (o === 'btts') return 'BTTS Yes';
  if (o === 'over25') return 'Over 2.5';
  if (o === 'under25') return 'Under 2.5';
  if (o === 'home_away') return 'Home or Away (12)';
  if (o === 'home_draw') return 'Home or Draw (1X)';
  if (o === 'draw_away') return 'Draw or Away (X2)';
  return outcome || '—';
}

@Injectable()
export class PredictionMarketplaceSyncService {
  private readonly logger = new Logger(PredictionMarketplaceSyncService.name);

  constructor(
    @InjectRepository(AccumulatorTicket)
    private ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(AccumulatorPick)
    private pickRepo: Repository<AccumulatorPick>,
    @InjectRepository(PickMarketplace)
    private marketplaceRepo: Repository<PickMarketplace>,
    @InjectRepository(Prediction)
    private predictionRepo: Repository<Prediction>,
    @InjectRepository(PredictionFixture)
    private predictionFixtureRepo: Repository<PredictionFixture>,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    private tipstersSetup: TipstersSetupService,
  ) {}

  /**
   * Sync a prediction to the marketplace (free by default).
   * Creates accumulator_ticket, accumulator_picks, pick_marketplace.
   * Skips if tipster has no userId (not yet linked to user).
   */
  async syncToMarketplace(
    prediction: Prediction,
    fixtures: PredictionFixture[],
    tipster: Tipster,
  ): Promise<{ accumulatorId: number } | null> {
    if (!tipster.userId) {
      await this.tipstersSetup.ensureTipsterHasUser(tipster);
      if (!tipster.userId) {
        this.logger.warn(`Tipster ${tipster.username} could not get user, skipping marketplace sync`);
        return null;
      }
    }

    const existing = await this.marketplaceRepo.findOne({
      where: { predictionId: prediction.id },
    });
    if (existing) {
      this.logger.debug(`Prediction ${prediction.id} already on marketplace`);
      return { accumulatorId: existing.accumulatorId };
    }

    // Check for duplicate: same tipster, same fixtures, same markets/odds
    const duplicate = await this.findDuplicateCoupon(tipster.userId, fixtures);
    if (duplicate) {
      this.logger.debug(`Duplicate coupon for tipster ${tipster.username}, skipping prediction ${prediction.id}`);
      return { accumulatorId: duplicate };
    }

    const title = this.isMatchBasedTitle(prediction.predictionTitle)
      ? '2-Pick Acca'
      : (prediction.predictionTitle || '2-Pick Acca');
    const totalOdds = fixtures.reduce((acc, f) => acc * Number(f.selectionOdds), 1);

    const ticket = this.ticketRepo.create({
      userId: tipster.userId,
      title,
      description: 'Hand-picked accumulator from our tipsters.',
      sport: 'Football',
      totalPicks: fixtures.length,
      totalOdds: Math.round(totalOdds * 1000) / 1000,
      price: 0,
      status: 'active',
      result: 'pending',
      isMarketplace: true,
    });
    await this.ticketRepo.save(ticket);

    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i];
      const pick = this.pickRepo.create({
        accumulatorId: ticket.id,
        fixtureId: f.fixtureId,
        matchDescription: `${f.homeTeam} vs ${f.awayTeam}`,
        prediction: formatOutcome(f.selectedOutcome),
        odds: f.selectionOdds,
        matchDate: f.matchDate,
        result: 'pending',
      });
      await this.pickRepo.save(pick);
    }

    await this.marketplaceRepo.save({
      accumulatorId: ticket.id,
      sellerId: tipster.userId,
      price: 0,
      status: 'active',
      predictionId: prediction.id,
      maxPurchases: 999999,
    });

    this.logger.log(`Synced prediction ${prediction.id} to marketplace as accumulator ${ticket.id}`);
    return { accumulatorId: ticket.id };
  }

  /**
   * Backfill: sync all pending predictions to marketplace.
   * Use when predictions were created before sync was enabled, or after running setup/ai-tipsters.
   */
  async syncAllPendingToMarketplace(): Promise<{ synced: number; skipped: number; errors: string[] }> {
    const predictions = await this.predictionRepo.find({
      where: { status: 'pending' },
      relations: ['tipster'],
      order: { id: 'ASC' },
    });
    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const prediction of predictions) {
      const tipster = prediction.tipster as Tipster | null;
      if (!tipster) {
        skipped++;
        errors.push(`Prediction ${prediction.id}: no tipster`);
        continue;
      }
      if (!tipster.userId) {
        skipped++;
        errors.push(`Prediction ${prediction.id}: tipster ${tipster.username} has no userId (run setup/ai-tipsters first)`);
        continue;
      }

      const fixtures = await this.predictionFixtureRepo.find({
        where: { predictionId: prediction.id },
        order: { legNumber: 'ASC' },
      });
      if (fixtures.length === 0) {
        skipped++;
        errors.push(`Prediction ${prediction.id}: no fixtures`);
        continue;
      }

      try {
        const result = await this.syncToMarketplace(prediction, fixtures, tipster);
        if (result) synced++;
        else skipped++;
      } catch (e) {
        skipped++;
        errors.push(`Prediction ${prediction.id}: ${(e as Error).message}`);
      }
    }

    this.logger.log(`Backfill complete: ${synced} synced, ${skipped} skipped`);
    return { synced, skipped, errors };
  }

  /**
   * Fix existing marketplace: update match-based titles and remove duplicates.
   * Call after deploying title/duplicate fixes.
   */
  async fixMarketplaceTitlesAndDedupe(): Promise<{ titlesUpdated: number; duplicatesDeactivated: number }> {
    const tickets = await this.ticketRepo.find({
      where: { isMarketplace: true },
      relations: ['picks'],
    });

    let titlesUpdated = 0;
    const seen = new Map<string, number>(); // fingerprint -> first accumulatorId
    const duplicatesToDeactivate: number[] = [];

    for (const ticket of tickets) {
      if (ticket.status !== 'active' || ticket.result !== 'pending') continue;

      const fingerprint = ticket.picks
        ?.map((p) => `${p.fixtureId}:${p.prediction}:${Number(p.odds)}`)
        .sort()
        .join('|');
      if (!fingerprint) continue;

      const key = `${ticket.userId}|${fingerprint}`;
      if (seen.has(key)) {
        duplicatesToDeactivate.push(ticket.id);
        continue;
      }
      seen.set(key, ticket.id);

      const newTitle = '2-Pick Acca';
      if (ticket.title !== newTitle) {
        await this.ticketRepo.update(ticket.id, { title: newTitle });
        titlesUpdated++;
      }
    }

    for (const accId of duplicatesToDeactivate) {
      await this.ticketRepo.update(accId, { status: 'cancelled' });
      await this.marketplaceRepo.update({ accumulatorId: accId }, { status: 'inactive' });
    }

    this.logger.log(`Fix complete: ${titlesUpdated} titles updated, ${duplicatesToDeactivate.length} duplicates deactivated`);
    return { titlesUpdated, duplicatesDeactivated: duplicatesToDeactivate.length };
  }

  /** Detect old title format: "Team A vs Team B & Team C vs Team D" */
  private isMatchBasedTitle(title: string | null): boolean {
    if (!title || title.length < 10) return false;
    return title.includes(' vs ') && title.includes(' & ');
  }

  /** Find existing accumulator with same tipster, fixtures, and markets. Returns accumulatorId or null. */
  private async findDuplicateCoupon(
    tipsterUserId: number,
    fixtures: PredictionFixture[],
  ): Promise<number | null> {
    const fixtureIds = fixtures.map((f) => f.fixtureId).sort((a, b) => a - b);

    const existingTickets = await this.ticketRepo.find({
      where: { userId: tipsterUserId, isMarketplace: true, status: 'active', result: 'pending' },
      relations: ['picks'],
      order: { createdAt: 'DESC' },
    });

    for (const ticket of existingTickets) {
      if (!ticket.picks || ticket.picks.length !== fixtures.length) continue;
      const pickFixtureIds = ticket.picks
        .map((p) => p.fixtureId)
        .filter((id): id is number => id != null)
        .sort((a, b) => a - b);
      if (JSON.stringify(pickFixtureIds) !== JSON.stringify(fixtureIds)) continue;

      const existingFingerprint = ticket.picks
        .map((p) => `${p.fixtureId}:${p.prediction}:${Number(p.odds)}`)
        .sort()
        .join('|');

      const ourFormatted = fixtures
        .map((f) => `${f.fixtureId}:${formatOutcome(f.selectedOutcome)}:${Number(f.selectionOdds)}`)
        .sort()
        .join('|');

      if (existingFingerprint === ourFormatted) {
        return ticket.id;
      }
    }
    return null;
  }
}
