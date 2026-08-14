import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ACCA_DESK_DAILY_CRON,
  ACCA_DESK_LEGS,
  ACCA_DESK_TIPSTERS,
  ACCA_DESK_TIPSTER_TYPE,
  isAccaDeskEnabled,
  type AccaDeskTipsterConfig,
} from '../../config/acca-desk-tipsters.config';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { SyncStatus } from '../fixtures/entities/sync-status.entity';
import { AccaGeneratorService } from './acca-generator.service';
import { AccaDeskSetupService } from './acca-desk-setup.service';

export type AccaDeskRunResult = {
  enabled: boolean;
  published: number;
  skippedAlreadyPosted: number;
  skippedEmptyPool: number;
  skippedNoUser: number;
  errors: number;
  details: {
    username: string;
    status: 'published' | 'skipped_already' | 'empty_pool' | 'no_user' | 'error';
    ticketId?: number;
    message?: string;
  }[];
};

@Injectable()
export class AccaDeskPublisherService {
  private readonly logger = new Logger(AccaDeskPublisherService.name);

  constructor(
    private readonly accaGenerator: AccaGeneratorService,
    private readonly setup: AccaDeskSetupService,
    @InjectRepository(Tipster)
    private readonly tipsterRepo: Repository<Tipster>,
    @InjectRepository(AccumulatorTicket)
    private readonly ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(AccumulatorPick)
    private readonly pickRepo: Repository<AccumulatorPick>,
    @InjectRepository(SyncStatus)
    private readonly syncStatusRepo: Repository<SyncStatus>,
  ) {}

  /** Admin monitor: roster, last cron status, today's Acca Desk marketplace coupons. */
  async getOverview() {
    const tipsters = await this.tipsterRepo.find({
      where: { tipsterType: ACCA_DESK_TIPSTER_TYPE },
      order: { username: 'ASC' },
    });
    const byUsername = new Map(tipsters.map((t) => [t.username, t]));
    const roster = ACCA_DESK_TIPSTERS.map((c) => {
      const row = byUsername.get(c.username);
      return {
        username: c.username,
        displayName: c.display_name,
        avatarUrl: row?.avatarUrl || c.avatar_url,
        riskLevel: c.riskLevel,
        markets: c.markets,
        legs: c.legs,
        strategyId: c.strategy_id,
        isActive: row?.isActive ?? false,
        userId: row?.userId ?? null,
        tipsterId: row?.id ?? null,
        setup: !!row,
      };
    });

    const userIds = tipsters.map((t) => t.userId).filter((id): id is number => id != null);
    const { start, end } = this.utcDayBounds();
    let todayTickets: {
      id: number;
      title: string;
      username: string;
      displayName: string;
      totalOdds: number;
      totalPicks: number;
      status: string;
      createdAt: string;
      legs: { matchDescription: string; prediction: string; odds: number }[];
    }[] = [];

    if (userIds.length) {
      const tickets = await this.ticketRepo
        .createQueryBuilder('t')
        .where('t.userId IN (:...userIds)', { userIds })
        .andWhere('t.createdAt >= :start', { start })
        .andWhere('t.createdAt < :end', { end })
        .orderBy('t.createdAt', 'DESC')
        .getMany();

      const tipsterByUser = new Map(
        tipsters.filter((t) => t.userId != null).map((t) => [t.userId!, t]),
      );
      const ticketIds = tickets.map((t) => t.id);
      const picks =
        ticketIds.length > 0
          ? await this.pickRepo.find({
              where: { accumulatorId: In(ticketIds) },
              order: { id: 'ASC' },
            })
          : [];
      const picksByTicket = new Map<number, AccumulatorPick[]>();
      for (const p of picks) {
        const list = picksByTicket.get(p.accumulatorId) || [];
        list.push(p);
        picksByTicket.set(p.accumulatorId, list);
      }

      todayTickets = tickets.map((t) => {
        const tip = tipsterByUser.get(t.userId);
        const legs = (picksByTicket.get(t.id) || []).map((p) => ({
          matchDescription: p.matchDescription,
          prediction: p.prediction,
          odds: Number(p.odds),
        }));
        return {
          id: t.id,
          title: t.title,
          username: tip?.username || `user-${t.userId}`,
          displayName: tip?.displayName || tip?.username || 'Acca Desk',
          totalOdds: Number(t.totalOdds),
          totalPicks: Number(t.totalPicks),
          status: t.status,
          createdAt: t.createdAt?.toISOString?.() || String(t.createdAt),
          legs,
        };
      });
    }

    const sync = await this.syncStatusRepo.findOne({ where: { syncType: 'acca_desk' } });

    return {
      enabled: isAccaDeskEnabled(),
      cron: ACCA_DESK_DAILY_CRON,
      timezone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
      legs: ACCA_DESK_LEGS,
      rosterSize: ACCA_DESK_TIPSTERS.length,
      setupCount: roster.filter((r) => r.setup).length,
      activeCount: roster.filter((r) => r.setup && r.isActive).length,
      todayPublished: todayTickets.length,
      syncStatus: sync
        ? {
            status: sync.status,
            lastSyncAt: sync.lastSyncAt,
            lastSyncCount: sync.lastSyncCount,
            lastError: sync.lastError,
          }
        : null,
      roster,
      todayTickets,
    };
  }

  /**
   * Daily Acca Desk pass: one 2-leg free coupon per active bot (idempotent per UTC day).
   * Fixture exclusivity across Acca Desk bots only (fixed roster order).
   */
  async runDaily(opts?: { ensureSetup?: boolean }): Promise<AccaDeskRunResult> {
    if (!isAccaDeskEnabled()) {
      this.logger.warn('Acca Desk disabled (ACCA_DESK_ENABLED=false)');
      return {
        enabled: false,
        published: 0,
        skippedAlreadyPosted: 0,
        skippedEmptyPool: 0,
        skippedNoUser: 0,
        errors: 0,
        details: [],
      };
    }

    if (opts?.ensureSetup !== false) {
      await this.setup.initializeAccaDeskTipsters();
    }

    const usedFixtureIds = new Set<number>();
    const result: AccaDeskRunResult = {
      enabled: true,
      published: 0,
      skippedAlreadyPosted: 0,
      skippedEmptyPool: 0,
      skippedNoUser: 0,
      errors: 0,
      details: [],
    };

    for (const config of ACCA_DESK_TIPSTERS) {
      try {
        const outcome = await this.publishOne(config, usedFixtureIds);
        result.details.push(outcome.detail);
        if (outcome.detail.status === 'published') result.published++;
        else if (outcome.detail.status === 'skipped_already') result.skippedAlreadyPosted++;
        else if (outcome.detail.status === 'empty_pool') result.skippedEmptyPool++;
        else if (outcome.detail.status === 'no_user') result.skippedNoUser++;
        else result.errors++;
      } catch (err: any) {
        result.errors++;
        const message = err?.message || String(err);
        this.logger.error(`Acca Desk ${config.username} failed: ${message}`);
        result.details.push({ username: config.username, status: 'error', message });
      }
    }

    this.logger.log(
      `Acca Desk daily: published=${result.published} already=${result.skippedAlreadyPosted} empty=${result.skippedEmptyPool} errors=${result.errors}`,
    );
    return result;
  }

  private async publishOne(
    config: AccaDeskTipsterConfig,
    usedFixtureIds: Set<number>,
  ): Promise<{ detail: AccaDeskRunResult['details'][number] }> {
    const tipster = await this.tipsterRepo.findOne({
      where: { username: config.username, tipsterType: ACCA_DESK_TIPSTER_TYPE },
    });
    if (!tipster?.userId || !tipster.isActive) {
      return { detail: { username: config.username, status: 'no_user' } };
    }

    const already = await this.countCouponsCreatedUtcToday(tipster.userId);
    if (already >= 1) {
      return { detail: { username: config.username, status: 'skipped_already' } };
    }

    const generated = await this.accaGenerator.generateForDesk({
      userId: tipster.userId,
      markets: config.markets,
      legs: ACCA_DESK_LEGS,
      riskLevel: config.riskLevel,
      excludeFixtureIds: usedFixtureIds,
    });

    if (!generated.ok) {
      return {
        detail: {
          username: config.username,
          status: 'empty_pool',
          message: `candidates=${generated.candidates}`,
        },
      };
    }

    const riskLabel = config.riskLevel.charAt(0).toUpperCase() + config.riskLevel.slice(1);
    const title = `${config.display_name} · 2-fold @ ${generated.combinedOdds}`.slice(0, 255);
    const description = (
      `${config.bio} Generated by Acca Desk (${config.strategy_id}) using Acca Generator odd bands. ` +
      `Free pick — educational/informational only.`
    ).slice(0, 2000);

    const published = await this.accaGenerator.publish(tipster.userId, {
      generationId: generated.generationId,
      title,
      description,
    });

    for (const leg of generated.legs) {
      if (leg.fixtureId) usedFixtureIds.add(leg.fixtureId);
    }

    const ticketId = Number(
      (published as { publishedTicketId?: number })?.publishedTicketId ??
        (published as { ticket?: { id?: number } })?.ticket?.id,
    );

    this.logger.log(
      `Acca Desk published ${config.username} (${riskLabel}) ticket=#${ticketId} odds=${generated.combinedOdds}`,
    );

    return {
      detail: {
        username: config.username,
        status: 'published',
        ticketId: Number.isFinite(ticketId) ? ticketId : undefined,
      },
    };
  }

  private utcDayBounds(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
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
}
