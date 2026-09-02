import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ACCA_DESK_DAILY_CRON,
  ACCA_DESK_EARLY_CRON,
  ACCA_DESK_LEGS,
  ACCA_DESK_MAX_PER_DAY,
  ACCA_DESK_TIME_SLOTS,
  ACCA_DESK_TIPSTERS,
  ACCA_DESK_TIPSTER_TYPE,
  isAccaDeskEarlyPublishEnabled,
  isAccaDeskEnabled,
  type AccaDeskTipsterConfig,
} from '../../config/acca-desk-tipsters.config';
import {
  accraDateStr,
  addDateStrDays,
  deskDayFromTitle,
  deskDayFixtureWindow,
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
import { RolloverDeskService } from './rollover-desk.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ROLLOVER_OWNER_USERNAME } from '../../config/rollover-desk.config';
import type { AccaDeskShort } from '../email/acca-desk-shorts.config';

export type AccaDeskRunResult = {
  enabled: boolean;
  deskDay: string;
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
    private readonly rollover: RolloverDeskService,
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

  /** Admin monitor: roster, last cron status, today's + tomorrow's Acca Desk coupons. */
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

    const tz = this.predictionTimeZone();
    const todayDesk = accraDateStr(new Date(), tz);
    const tomorrowDesk = addDateStrDays(todayDesk, 1);
    const userIds = tipsters.map((t) => t.userId).filter((id): id is number => id != null);

    const mapTickets = async (deskDay: string) => {
      if (!userIds.length) return [];
      const tickets = await this.findDeskDayTickets(userIds, deskDay);
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

      return tickets.map((t) => {
        const tip = tipsterByUser.get(t.userId);
        const legs = (picksByTicket.get(t.id) || []).map((p) => ({
          matchDescription: p.matchDescription,
          prediction: p.prediction,
          odds: Number(p.odds),
        }));
        return {
          id: t.id,
          title: t.title,
          deskDay,
          username: tip?.username || `user-${t.userId}`,
          displayName: tip?.displayName || tip?.username || 'Tipster',
          totalOdds: Number(t.totalOdds),
          totalPicks: Number(t.totalPicks),
          status: t.status,
          createdAt: t.createdAt?.toISOString?.() || String(t.createdAt),
          legs,
        };
      });
    };

    const todayTickets = await mapTickets(todayDesk);
    const tomorrowTickets = await mapTickets(tomorrowDesk);

    const sync = await this.syncStatusRepo.findOne({ where: { syncType: 'acca_desk' } });
    const earlySync = await this.syncStatusRepo.findOne({ where: { syncType: 'acca_desk_early' } });
    const rollover = await this.rollover.getAdminState();

    return {
      enabled: isAccaDeskEnabled(),
      earlyEnabled: isAccaDeskEarlyPublishEnabled(),
      cron: ACCA_DESK_DAILY_CRON,
      earlyCron: ACCA_DESK_EARLY_CRON,
      timezone: tz,
      todayDeskDay: todayDesk,
      tomorrowDeskDay: tomorrowDesk,
      legs: ACCA_DESK_LEGS,
      maxPerDay: ACCA_DESK_MAX_PER_DAY,
      timeSlots: ACCA_DESK_TIME_SLOTS.map((s) => s.key),
      rosterSize: ACCA_DESK_TIPSTERS.length,
      setupCount: roster.filter((r) => r.setup).length,
      activeCount: roster.filter((r) => r.setup && r.isActive).length,
      todayPublished: todayTickets.length,
      tomorrowPublished: tomorrowTickets.length,
      syncStatus: sync
        ? {
            status: sync.status,
            lastSyncAt: sync.lastSyncAt,
            lastSyncCount: sync.lastSyncCount,
            lastError: sync.lastError,
          }
        : null,
      earlySyncStatus: earlySync
        ? {
            status: earlySync.status,
            lastSyncAt: earlySync.lastSyncAt,
            lastSyncCount: earlySync.lastSyncCount,
            lastError: earlySync.lastError,
          }
        : null,
      roster,
      todayTickets,
      tomorrowTickets,
      rollover,
    };
  }

  /**
   * Acca Desk pass for one desk day: up to 4 time-slotted 2-leg coupons per bot.
   * Idempotent per tipster + desk day + slot. Fixture exclusivity within that desk day.
   */
  async runDaily(opts?: {
    ensureSetup?: boolean;
    /** Accra YYYY-MM-DD. Default: today. */
    deskDayStr?: string;
  }): Promise<AccaDeskRunResult> {
    const tz = this.predictionTimeZone();
    const deskDayStr = opts?.deskDayStr || accraDateStr(new Date(), tz);

    if (!isAccaDeskEnabled()) {
      this.logger.warn('Acca Desk disabled (ACCA_DESK_ENABLED=false)');
      return this.emptyResult(deskDayStr);
    }

    if (opts?.ensureSetup !== false) {
      await this.setup.initializeAccaDeskTipsters();
    }

    const usedFixtureIds = new Set<number>();
    await this.seedUsedFixturesForDeskDay(usedFixtureIds, deskDayStr);
    const result: AccaDeskRunResult = {
      enabled: true,
      deskDay: deskDayStr,
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
          const outcome = await this.publishOne(
            config,
            slot,
            usedFixtureIds,
            postedSlotsByUser,
            deskDayStr,
          );
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
          this.logger.error(`Acca Desk ${config.username} ${slot.key} ${deskDayStr} failed: ${message}`);
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
      `Acca Desk deskDay=${deskDayStr}: published=${result.published} already=${result.skippedAlreadyPosted} empty=${result.skippedEmptyPool} errors=${result.errors}`,
    );
    if (shorts.length) {
      try {
        await this.notifications.notifyFollowersOfAccaDeskShorts(shorts);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Acca Desk follower shorts email failed: ${message}`);
      }
    }
    // Rollover is manual-only (admin attach AccaSure1X2). Never auto-attach after desk publish.
    return result;
  }

  /**
   * Publish AccaSure1X2 only (rollover owner). Optional slot; otherwise remaining unposted slots.
   * Does not attach — admin picks the coupon on the rollover board.
   */
  async publishRolloverOwner(opts?: {
    slotKey?: AccaDeskSlotKey;
    ensureSetup?: boolean;
    deskDayStr?: string;
  }): Promise<AccaDeskRunResult> {
    const tz = this.predictionTimeZone();
    const deskDayStr = opts?.deskDayStr || accraDateStr(new Date(), tz);

    if (!isAccaDeskEnabled()) {
      return this.emptyResult(deskDayStr);
    }
    if (opts?.ensureSetup !== false) {
      await this.setup.initializeAccaDeskTipsters();
    }

    const config = ACCA_DESK_TIPSTERS.find((c) => c.username === ROLLOVER_OWNER_USERNAME);
    if (!config) {
      return {
        enabled: true,
        deskDay: deskDayStr,
        published: 0,
        skippedAlreadyPosted: 0,
        skippedEmptyPool: 0,
        skippedNoUser: 1,
        errors: 0,
        details: [{ username: ROLLOVER_OWNER_USERNAME, status: 'no_user' }],
      };
    }

    const slots = opts?.slotKey
      ? ACCA_DESK_TIME_SLOTS.filter((s) => s.key === opts.slotKey)
      : ACCA_DESK_TIME_SLOTS;
    const usedFixtureIds = new Set<number>();
    await this.seedUsedFixturesForDeskDay(usedFixtureIds, deskDayStr);
    const postedSlotsByUser = new Map<number, Set<AccaDeskSlotKey>>();
    const result: AccaDeskRunResult = {
      enabled: true,
      deskDay: deskDayStr,
      published: 0,
      skippedAlreadyPosted: 0,
      skippedEmptyPool: 0,
      skippedNoUser: 0,
      errors: 0,
      details: [],
    };

    for (const slot of slots) {
      try {
        const outcome = await this.publishOne(
          config,
          slot,
          usedFixtureIds,
          postedSlotsByUser,
          deskDayStr,
        );
        result.details.push(outcome.detail);
        if (outcome.detail.status === 'published') result.published++;
        else if (outcome.detail.status === 'skipped_already') result.skippedAlreadyPosted++;
        else if (outcome.detail.status === 'empty_pool') result.skippedEmptyPool++;
        else if (outcome.detail.status === 'no_user') result.skippedNoUser++;
        else result.errors++;
      } catch (err: unknown) {
        result.errors++;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Rollover publish ${config.username} ${slot.key} failed: ${message}`);
        result.details.push({
          username: config.username,
          status: 'error',
          slotKey: slot.key,
          message,
        });
      }
    }

    this.logger.log(
      `Rollover ${ROLLOVER_OWNER_USERNAME} publish deskDay=${deskDayStr}: published=${result.published} already=${result.skippedAlreadyPosted} empty=${result.skippedEmptyPool} errors=${result.errors}`,
    );
    return result;
  }

  private emptyResult(deskDayStr: string): AccaDeskRunResult {
    return {
      enabled: false,
      deskDay: deskDayStr,
      published: 0,
      skippedAlreadyPosted: 0,
      skippedEmptyPool: 0,
      skippedNoUser: 0,
      errors: 0,
      details: [],
    };
  }

  private async publishOne(
    config: AccaDeskTipsterConfig,
    slot: AccaDeskTimeSlot,
    usedFixtureIds: Set<number>,
    postedSlotsByUser: Map<number, Set<AccaDeskSlotKey>>,
    deskDayStr: string,
  ): Promise<{ detail: AccaDeskRunResult['details'][number]; short?: AccaDeskShort }> {
    const tipster = await this.tipsterRepo.findOne({
      where: { username: config.username, tipsterType: ACCA_DESK_TIPSTER_TYPE },
    });
    if (!tipster?.userId || !tipster.isActive) {
      return { detail: { username: config.username, status: 'no_user', slotKey: slot.key } };
    }

    const posted = await this.postedSlotsForDeskDay(tipster.userId, deskDayStr, postedSlotsByUser);
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
      deskDayStr,
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

    const title = `${config.display_name} · ${slot.label} · 2-fold @ ${generated.combinedOdds} · ${deskDayStr}`.slice(
      0,
      255,
    );
    const description = (
      `${config.bio} ${slot.label} · ${deskDayStr}. Free pick — educational only.`
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
      `Acca Desk published ${config.username} ${slot.key} deskDay=${deskDayStr} ticket=#${ticketId} odds=${generated.combinedOdds}`,
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

  /** Tickets for a desk day: title stamp preferred; fallback kickoff in desk-day window. */
  private async findDeskDayTickets(userIds: number[], deskDayStr: string): Promise<AccumulatorTicket[]> {
    if (!userIds.length) return [];
    const { start, end } = deskDayFixtureWindow(deskDayStr, this.predictionTimeZone());
    // Wide createdAt window: early publish is evening before desk day; catch-up next morning.
    const createdFrom = new Date(start);
    createdFrom.setUTCDate(createdFrom.getUTCDate() - 1);
    const createdTo = new Date(end);
    createdTo.setUTCDate(createdTo.getUTCDate() + 1);

    const candidates = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.userId IN (:...userIds)', { userIds })
      .andWhere('t.createdAt >= :createdFrom', { createdFrom })
      .andWhere('t.createdAt < :createdTo', { createdTo })
      .orderBy('t.createdAt', 'DESC')
      .getMany();

    if (!candidates.length) return [];

    const picks = await this.pickRepo.find({
      where: { accumulatorId: In(candidates.map((t) => t.id)) },
      select: ['accumulatorId', 'matchDate'],
    });
    const earliestByTicket = new Map<number, Date>();
    for (const p of picks) {
      if (!p.matchDate) continue;
      const prev = earliestByTicket.get(p.accumulatorId);
      if (!prev || p.matchDate < prev) earliestByTicket.set(p.accumulatorId, p.matchDate);
    }

    return candidates.filter((t) => {
      const fromTitle = deskDayFromTitle(t.title);
      if (fromTitle) return fromTitle === deskDayStr;
      const kickoff = earliestByTicket.get(t.id);
      if (!kickoff) return false;
      return kickoff >= start && kickoff < end;
    });
  }

  private async seedUsedFixturesForDeskDay(
    usedFixtureIds: Set<number>,
    deskDayStr: string,
  ): Promise<void> {
    const tipsters = await this.tipsterRepo.find({ where: { tipsterType: ACCA_DESK_TIPSTER_TYPE } });
    const userIds = tipsters.map((t) => t.userId).filter((id): id is number => id != null);
    if (!userIds.length) return;
    const tickets = await this.findDeskDayTickets(userIds, deskDayStr);
    if (!tickets.length) return;
    const picks = await this.pickRepo.find({
      where: { accumulatorId: In(tickets.map((t) => t.id)) },
      select: ['fixtureId'],
    });
    for (const p of picks) {
      if (p.fixtureId) usedFixtureIds.add(p.fixtureId);
    }
  }

  private async postedSlotsForDeskDay(
    userId: number,
    deskDayStr: string,
    cache: Map<number, Set<AccaDeskSlotKey>>,
  ): Promise<Set<AccaDeskSlotKey>> {
    const cacheKey = userId;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const tickets = await this.findDeskDayTickets([userId], deskDayStr);
    const slots = new Set<AccaDeskSlotKey>();
    if (!tickets.length) {
      cache.set(cacheKey, slots);
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
      const key = fromTitle || fromKickoff;
      if (key) slots.add(key);
    }

    cache.set(cacheKey, slots);
    return slots;
  }
}
