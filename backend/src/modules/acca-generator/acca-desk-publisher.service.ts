import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ACCA_DESK_DAILY_CRON,
  ACCA_DESK_LEGS,
  ACCA_DESK_MAX_PER_DAY,
  ACCA_DESK_TIME_SLOTS,
  ACCA_DESK_TIPSTERS,
  ACCA_DESK_TIPSTER_TYPE,
  isAccaDeskEnabled,
  type AccaDeskTipsterConfig,
} from '../../config/acca-desk-tipsters.config';
import {
  slotForKickoff,
  type AccaDeskSlotKey,
  type AccaDeskTimeSlot,
} from '../../config/acca-desk-slots';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { SyncStatus } from '../fixtures/entities/sync-status.entity';
import { AccaGeneratorService } from './acca-generator.service';
import { AccaDeskSetupService } from './acca-desk-setup.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AccaDeskShort } from '../email/acca-desk-shorts.config';

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
    slotKey?: AccaDeskSlotKey;
    message?: string;
  }[];
};

@Injectable()
export class AccaDeskPublisherService {
  private readonly logger = new Logger(AccaDeskPublisherService.name);

  constructor(
    private readonly accaGenerator: AccaGeneratorService,
    private readonly setup: AccaDeskSetupService,
    private readonly notifications: NotificationsService,
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
      maxPerDay: ACCA_DESK_MAX_PER_DAY,
      timeSlots: ACCA_DESK_TIME_SLOTS.map((s) => s.key),
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
   * Daily Acca Desk pass: up to 3 time-slotted 2-leg coupons per bot (idempotent per UTC day + slot).
   * All slots generated in this 00:30 run. Fixture exclusivity across Acca Desk bots only.
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
    await this.seedUsedFixturesFromToday(usedFixtureIds);
    const result: AccaDeskRunResult = {
      enabled: true,
      published: 0,
      skippedAlreadyPosted: 0,
      skippedEmptyPool: 0,
      skippedNoUser: 0,
      errors: 0,
      details: [],
    };

    const postedSlotsByUser = new Map<number, Set<AccaDeskSlotKey>>();
    const shorts: AccaDeskShort[] = [];

    for (const config of ACCA_DESK_TIPSTERS) {
      for (const slot of ACCA_DESK_TIME_SLOTS) {
        try {
          const outcome = await this.publishOne(config, slot, usedFixtureIds, postedSlotsByUser);
          result.details.push(outcome.detail);
          if (outcome.short) shorts.push(outcome.short);
          if (outcome.detail.status === 'published') result.published++;
          else if (outcome.detail.status === 'skipped_already') result.skippedAlreadyPosted++;
          else if (outcome.detail.status === 'empty_pool') result.skippedEmptyPool++;
          else if (outcome.detail.status === 'no_user') result.skippedNoUser++;
          else result.errors++;
        } catch (err: any) {
          result.errors++;
          const message = err?.message || String(err);
          this.logger.error(`Acca Desk ${config.username} ${slot.key} failed: ${message}`);
          result.details.push({
            username: config.username,
            status: 'error',
            slotKey: slot.key,
            message,
          });
        }
      }
    }

    this.logger.log(
      `Acca Desk daily: published=${result.published} already=${result.skippedAlreadyPosted} empty=${result.skippedEmptyPool} errors=${result.errors}`,
    );
    if (shorts.length) {
      try {
        await this.notifications.notifyFollowersOfAccaDeskShorts(shorts);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Acca Desk follower shorts email failed: ${message}`);
      }
    }
    return result;
  }

  private async publishOne(
    config: AccaDeskTipsterConfig,
    slot: AccaDeskTimeSlot,
    usedFixtureIds: Set<number>,
    postedSlotsByUser: Map<number, Set<AccaDeskSlotKey>>,
  ): Promise<{ detail: AccaDeskRunResult['details'][number]; short?: AccaDeskShort }> {
    const tipster = await this.tipsterRepo.findOne({
      where: { username: config.username, tipsterType: ACCA_DESK_TIPSTER_TYPE },
    });
    if (!tipster?.userId || !tipster.isActive) {
      return { detail: { username: config.username, status: 'no_user', slotKey: slot.key } };
    }

    const posted = await this.postedSlotsToday(tipster.userId, postedSlotsByUser);
    if (posted.has(slot.key)) {
      return {
        detail: { username: config.username, status: 'skipped_already', slotKey: slot.key },
      };
    }
    if (posted.size >= ACCA_DESK_MAX_PER_DAY) {
      return {
        detail: { username: config.username, status: 'skipped_already', slotKey: slot.key },
      };
    }

    const generated = await this.accaGenerator.generateForDesk({
      userId: tipster.userId,
      markets: config.markets,
      legs: ACCA_DESK_LEGS,
      riskLevel: config.riskLevel,
      excludeFixtureIds: usedFixtureIds,
      slotKey: slot.key,
    });

    if (!generated.ok) {
      return {
        detail: {
          username: config.username,
          status: 'empty_pool',
          slotKey: slot.key,
          message: `candidates=${generated.candidates}`,
        },
      };
    }

    const title = `${config.display_name} · ${slot.label} · 2-fold @ ${generated.combinedOdds} · ${this.utcDayStamp()}`.slice(
      0,
      255,
    );
    const description = (
      `${config.bio} Slot: ${slot.label}. Generated by Acca Desk (${config.strategy_id}) using Acca Generator odd bands. ` +
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
    posted.add(slot.key);

    const ticketId = Number(
      (published as { publishedTicketId?: number })?.publishedTicketId ??
        (published as { ticket?: { id?: number } })?.ticket?.id,
    );

    this.logger.log(
      `Acca Desk published ${config.username} ${slot.key} ticket=#${ticketId} odds=${generated.combinedOdds}`,
    );

    const short: AccaDeskShort | undefined =
      Number.isFinite(ticketId) && ticketId > 0
        ? {
            ticketId,
            tipsterUserId: tipster.userId,
            tipsterDisplayName: config.display_name,
            title,
            totalOdds: Number(generated.combinedOdds),
            totalPicks: generated.legs.length,
            legs: generated.legs.map((leg) => ({
              matchDescription: leg.matchDescription,
              prediction: leg.prediction,
              odds: Number(leg.odds),
            })),
          }
        : undefined;

    return {
      detail: {
        username: config.username,
        status: 'published',
        slotKey: slot.key,
        ticketId: Number.isFinite(ticketId) ? ticketId : undefined,
      },
      short,
    };
  }

  private predictionTimeZone(): string {
    return process.env.PREDICTION_TIMEZONE || 'Africa/Accra';
  }

  private utcDayBounds(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  /** YYYY-MM-DD so the same odd-band title can publish again tomorrow. */
  private utcDayStamp(): string {
    return this.utcDayBounds().start.toISOString().slice(0, 10);
  }

  private async seedUsedFixturesFromToday(usedFixtureIds: Set<number>): Promise<void> {
    const tipsters = await this.tipsterRepo.find({ where: { tipsterType: ACCA_DESK_TIPSTER_TYPE } });
    const userIds = tipsters.map((t) => t.userId).filter((id): id is number => id != null);
    if (!userIds.length) return;
    const { start, end } = this.utcDayBounds();
    const tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .select(['t.id'])
      .where('t.userId IN (:...userIds)', { userIds })
      .andWhere('t.createdAt >= :start', { start })
      .andWhere('t.createdAt < :end', { end })
      .getMany();
    if (!tickets.length) return;
    const picks = await this.pickRepo.find({
      where: { accumulatorId: In(tickets.map((t) => t.id)) },
      select: ['fixtureId'],
    });
    for (const p of picks) {
      if (p.fixtureId) usedFixtureIds.add(p.fixtureId);
    }
  }

  private async postedSlotsToday(
    userId: number,
    cache: Map<number, Set<AccaDeskSlotKey>>,
  ): Promise<Set<AccaDeskSlotKey>> {
    const cached = cache.get(userId);
    if (cached) return cached;

    const { start, end } = this.utcDayBounds();
    const tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .select(['t.id', 't.title'])
      .where('t.userId = :userId', { userId })
      .andWhere('t.createdAt >= :start', { start })
      .andWhere('t.createdAt < :end', { end })
      .getMany();

    const slots = new Set<AccaDeskSlotKey>();
    if (!tickets.length) {
      cache.set(userId, slots);
      return slots;
    }

    const picks = await this.pickRepo.find({
      where: { accumulatorId: In(tickets.map((t) => t.id)) },
      select: ['accumulatorId', 'matchDate'],
    });
    const earliestByTicket = new Map<number, Date>();
    for (const p of picks) {
      if (!p.matchDate) continue;
      const prev = earliestByTicket.get(p.accumulatorId);
      if (!prev || p.matchDate < prev) earliestByTicket.set(p.accumulatorId, p.matchDate);
    }

    const tz = this.predictionTimeZone();
    for (const t of tickets) {
      const kickoff = earliestByTicket.get(t.id);
      const fromKickoff = kickoff ? slotForKickoff(kickoff, tz)?.key : null;
      const fromTitle = ACCA_DESK_TIME_SLOTS.find((s) => t.title?.includes(`· ${s.label} ·`))?.key;
      // Title is the intended slot; kick-off can drift across the afternoon/evening cut.
      const key = fromTitle || fromKickoff;
      if (key) slots.add(key);
    }

    cache.set(userId, slots);
    return slots;
  }
}
