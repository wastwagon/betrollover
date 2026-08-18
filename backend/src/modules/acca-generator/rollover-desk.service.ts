import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ACCA_DESK_TIME_SLOTS, type AccaDeskSlotKey } from '../../config/acca-desk-slots';
import {
  ROLLOVER_EXAMPLE_MAX_MONEY_DAY,
  ROLLOVER_EXAMPLE_STAKE_GHS,
  ROLLOVER_ODDS_MAX,
  ROLLOVER_ODDS_MIN,
  ROLLOVER_OWNER_USERNAME,
  ROLLOVER_PLAN_DAYS,
  ROLLOVER_TARGET_ODDS,
  ROLLOVER_TIMEZONE,
} from '../../config/rollover-desk.config';
import { AccumulatorsService } from '../accumulators/accumulators.service';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { RolloverDay } from './entities/rollover-day.entity';
import { RolloverRun } from './entities/rollover-run.entity';
import { RolloverSettings } from './entities/rollover-settings.entity';
import {
  exampleMoneyForDay,
  isQualifyingRolloverOdds,
  selectQualifyingRolloverTicket,
  slotKeyFromTitle,
  utcDateStamp,
  utcDayBounds,
} from './rollover-desk.util';

@Injectable()
export class RolloverDeskService {
  private readonly logger = new Logger(RolloverDeskService.name);
  private attachChain: Promise<void> = Promise.resolve();

  constructor(
    @InjectRepository(RolloverRun)
    private readonly runRepo: Repository<RolloverRun>,
    @InjectRepository(RolloverDay)
    private readonly dayRepo: Repository<RolloverDay>,
    @InjectRepository(AccumulatorTicket)
    private readonly ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(Tipster)
    private readonly tipsterRepo: Repository<Tipster>,
    @InjectRepository(RolloverSettings)
    private readonly settingsRepo: Repository<RolloverSettings>,
    private readonly accumulators: AccumulatorsService,
  ) {}

  /** Serialize attach so cron + public GET cannot double-write a plan day. */
  async attachToday(): Promise<void> {
    this.attachChain = this.attachChain.then(() => this.attachTodayInner()).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Rollover attach failed: ${message}`);
    });
    await this.attachChain;
  }

  async getBoard(viewerUserId?: number | null) {
    await this.attachToday();

    const date = utcDateStamp();
    const run = await this.runRepo.findOne({ where: { status: 'active' }, order: { id: 'DESC' } });
    const campaignStakeGhs = Number(run?.campaignStakeGhs ?? (await this.getDefaultCampaignStake()));
    const archive = await this.getArchiveStats();

    const days = run
      ? await this.dayRepo.find({ where: { runId: run.id }, order: { dayNumber: 'ASC' } })
      : [];
    const byNumber = new Map(days.map((d) => [d.dayNumber, d]));

    const owner = await this.tipsterRepo.findOne({
      where: { username: ROLLOVER_OWNER_USERNAME },
      select: ['username', 'displayName', 'avatarUrl'],
    });

    const pendingDays = days.filter((d) => d.status === 'pending' && d.ticketId);
    const latestPending = pendingDays.length ? pendingDays[pendingDays.length - 1] : days.find((d) => d.status === 'pending') ?? null;
    const todayRows = days.filter((d) => this.dateOnly(d.calendarDate) === date && d.ticketId);
    todayRows.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return b.dayNumber - a.dayNumber;
    });
    const todayRow = todayRows[0] ?? (latestPending?.ticketId ? latestPending : null);

    let skipReason: 'no_qualifying' | 'awaiting_settlement' | null = null;
    if (run?.status === 'active') {
      const oldestPending = pendingDays[0] ?? null;
      if (oldestPending?.ticketId && this.dateOnly(oldestPending.calendarDate) !== date && !todayRow?.ticketId) {
        skipReason = 'awaiting_settlement';
      } else if (!todayRow?.ticketId) {
        skipReason = 'no_qualifying';
      }
    }

    let coupon: Record<string, unknown> | null = null;
    const couponTicketId = todayRow?.ticketId ?? latestPending?.ticketId ?? null;
    if (couponTicketId) {
      try {
        coupon = (await this.accumulators.getById(couponTicketId, viewerUserId ?? undefined)) as Record<
          string,
          unknown
        > | null;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Rollover coupon hydrate #${couponTicketId} failed: ${message}`);
      }
    }

    const slots = Array.from({ length: ROLLOVER_PLAN_DAYS }, (_, i) => {
      const dayNumber = i + 1;
      const row = byNumber.get(dayNumber);
      const money = exampleMoneyForDay(dayNumber, ROLLOVER_EXAMPLE_MAX_MONEY_DAY, campaignStakeGhs);
      return {
        dayNumber,
        calendarDate: row ? this.dateOnly(row.calendarDate) : null,
        ticketId: row?.ticketId ?? null,
        status: row?.status ?? 'empty',
        combinedOdds: row?.combinedOdds != null ? Number(row.combinedOdds) : null,
        exampleStakeGhs: money.stakeGhs,
        exampleReturnGhs: money.returnGhs,
      };
    });

    return {
      ownerUsername: ROLLOVER_OWNER_USERNAME,
      ownerDisplayName: owner?.displayName ?? 'Sure · Over 1.5 Goals',
      ownerAvatarUrl: owner?.avatarUrl ?? null,
      timezone: ROLLOVER_TIMEZONE,
      planDays: ROLLOVER_PLAN_DAYS,
      targetOdds: ROLLOVER_TARGET_ODDS,
      oddsMin: ROLLOVER_ODDS_MIN,
      oddsMax: ROLLOVER_ODDS_MAX,
      exampleStakeStartGhs: campaignStakeGhs,
      exampleMaxMoneyDay: ROLLOVER_EXAMPLE_MAX_MONEY_DAY,
      calendarDate: date,
      archive,
      run: run
        ? {
            id: run.id,
            status: run.status,
            currentDay: run.currentDay,
            campaignStakeGhs,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            brokenAt: run.brokenAt,
          }
        : null,
      today: {
        dayNumber: todayRow?.dayNumber ?? latestPending?.dayNumber ?? (run?.currentDay || 1),
        status: todayRow?.status ?? latestPending?.status ?? 'empty',
        ticketId: couponTicketId,
        combinedOdds:
          todayRow?.combinedOdds != null
            ? Number(todayRow.combinedOdds)
            : latestPending?.combinedOdds != null
              ? Number(latestPending.combinedOdds)
              : null,
        skipReason,
        coupon,
      },
      days: slots,
    };
  }

  private async attachTodayInner(): Promise<void> {
    await this.syncSettledDays();
    const ticket = await this.pickTodayTicket();
    if (!ticket) return;
    await this.commitAttach(ticket, { replaceSameDay: false, strict: false });
  }

  /**
   * Admin: attach a specific AccaSureO15 coupon, or the earliest qualifying slot.
   * Same won/lost/void cut as cron. Same-day pending can be switched (early → afternoon/evening).
   * `asNextDay` attaches a later slot as the next plan day on the same calendar date
   * (e.g. evening as Day 2 while afternoon Day 1 is still live or already won).
   */
  async adminAttach(opts?: { ticketId?: number; asNextDay?: boolean }) {
    await this.syncSettledDays();
    const ticket = opts?.ticketId
      ? await this.requireQualifyingTodayTicket(opts.ticketId)
      : opts?.asNextDay
        ? selectQualifyingRolloverTicket(
            await this.listTodayOwnerTickets(),
            await this.usedTicketIds(),
            { preferLatestSlot: true },
          )
        : await this.pickTodayTicket();
    if (!ticket) {
      throw new BadRequestException(
        `No qualifying ${ROLLOVER_OWNER_USERNAME} coupon today (${ROLLOVER_ODDS_MIN.toFixed(2)}–${ROLLOVER_ODDS_MAX.toFixed(2)}, 2-fold, pending). Publish a later slot first.`,
      );
    }
    return this.commitAttach(ticket, {
      replaceSameDay: !opts?.asNextDay,
      strict: true,
      asNextDay: !!opts?.asNextDay,
    });
  }

  async updateCampaignStake(raw: number) {
    const campaignStakeGhs = this.parseCampaignStake(raw);
    await this.upsertSettings(campaignStakeGhs);
    const run = await this.runRepo.findOne({ where: { status: 'active' }, order: { id: 'DESC' } });
    if (run) {
      run.campaignStakeGhs = campaignStakeGhs;
      await this.runRepo.save(run);
    }
    return this.getAdminState();
  }

  async resetCampaign() {
    await this.syncSettledDays();
    const run = await this.runRepo.findOne({ where: { status: 'active' }, order: { id: 'DESC' } });
    if (run) {
      await this.releaseOpenDays(run.id);
      run.status = 'reset';
      run.resetAt = new Date();
      await this.runRepo.save(run);
      this.logger.log(`Rollover run #${run.id} reset by admin`);
    }
    await this.createRun();
    return this.getAdminState();
  }

  async syncNow() {
    await this.syncSettledDays();
    return this.getAdminState();
  }

  async getAdminState() {
    await this.syncSettledDays();
    const snapshot = await this.getSnapshot();
    const tickets = await this.listTodayOwnerTickets();
    const used = await this.usedTicketIds();
    const pendingId = snapshot.pendingDay?.ticketId ?? null;
    const lastDay = snapshot.lastDay;
    const date = snapshot.calendarDate;
    const candidates = tickets.map((t) => {
      const odds = Number(t.totalOdds);
      const result = (t.result || 'pending').toLowerCase();
      const slotKey = slotKeyFromTitle(t.title);
      const qualifying = t.totalPicks === 2 && result === 'pending' && isQualifyingRolloverOdds(odds);
      const attached = pendingId === t.id || used.has(t.id);
      return {
        id: t.id,
        title: t.title,
        slotKey,
        totalOdds: odds,
        totalPicks: t.totalPicks,
        result,
        qualifying,
        attached,
        canAttach: qualifying && !attached,
      };
    });
    const postedSlots = Object.fromEntries(
      ACCA_DESK_TIME_SLOTS.map((s) => [s.key, candidates.some((c) => c.slotKey === s.key)]),
    ) as Record<AccaDeskSlotKey, boolean>;

    let blockReason: string | null = null;
    if (
      snapshot.pendingDay?.ticketId &&
      snapshot.pendingDay.calendarDate !== snapshot.calendarDate
    ) {
      blockReason = 'awaiting_settlement';
    }

    const canAttachNextDay =
      !!lastDay &&
      lastDay.dayNumber < ROLLOVER_PLAN_DAYS &&
      lastDay.calendarDate === date &&
      candidates.some((c) => c.qualifying && !c.attached);

    return {
      ...snapshot,
      oddsMin: ROLLOVER_ODDS_MIN,
      oddsMax: ROLLOVER_ODDS_MAX,
      targetOdds: ROLLOVER_TARGET_ODDS,
      postedSlots,
      candidates,
      canAttachBest: !blockReason && candidates.some((c) => c.qualifying && !c.attached) && !canAttachNextDay,
      canAttachNextDay,
      nextDayNumber: lastDay ? lastDay.dayNumber + 1 : 1,
      blockReason,
    };
  }

  private async syncSettledDays(): Promise<void> {
    const pendingDays = await this.dayRepo.find({
      where: { status: 'pending' },
      order: { dayNumber: 'ASC' },
    });
    if (!pendingDays.length) return;

    const endedRunIds = new Set<number>();
    for (const day of pendingDays) {
      if (endedRunIds.has(day.runId)) continue;
      const ownerRun = await this.runRepo.findOne({ where: { id: day.runId } });
      if (!ownerRun || ownerRun.status !== 'active') {
        await this.releaseOpenDays(day.runId);
        endedRunIds.add(day.runId);
      }
    }

    const activePending = pendingDays.filter((d) => !endedRunIds.has(d.runId));
    if (!activePending.length) return;

    const ticketIds = activePending.map((d) => d.ticketId).filter((id): id is number => id != null);
    if (!ticketIds.length) return;

    const tickets = await this.ticketRepo.find({
      where: { id: In(ticketIds) },
      select: ['id', 'result', 'totalOdds'],
    });
    const byId = new Map(tickets.map((t) => [t.id, t]));
    const now = new Date();

    for (const day of activePending) {
      if (!day.ticketId) continue;
      if (endedRunIds.has(day.runId)) continue;
      const ticket = byId.get(day.ticketId);
      if (!ticket) continue;
      const result = (ticket.result || 'pending').toLowerCase();
      if (result === 'pending') continue;

      const run = await this.runRepo.findOne({ where: { id: day.runId } });
      if (!run || run.status !== 'active') continue;

      if (result === 'won') {
        day.status = 'won';
        day.settledAt = now;
        if (day.combinedOdds == null) day.combinedOdds = Number(ticket.totalOdds);
        await this.dayRepo.save(day);
        run.currentDay = day.dayNumber;
        if (day.dayNumber >= ROLLOVER_PLAN_DAYS) {
          run.status = 'completed';
          run.completedAt = now;
          await this.runRepo.save(run);
          await this.createRun();
          endedRunIds.add(run.id);
          this.logger.log(`Rollover day ${day.dayNumber} won ticket=#${ticket.id} — campaign completed, new table started`);
          continue;
        }
        await this.runRepo.save(run);
        this.logger.log(`Rollover day ${day.dayNumber} won ticket=#${ticket.id}`);
        continue;
      }

      if (result === 'lost') {
        day.status = 'lost';
        day.settledAt = now;
        await this.dayRepo.save(day);
        run.status = 'broken';
        run.brokenAt = now;
        run.currentDay = day.dayNumber;
        await this.runRepo.save(run);
        await this.releaseOpenDays(run.id, day.id);
        await this.createRun();
        endedRunIds.add(run.id);
        this.logger.log(`Rollover day ${day.dayNumber} lost ticket=#${ticket.id} — run broken, new campaign started`);
        continue;
      }

      if (result === 'void' || result === 'cancelled') {
        day.ticketId = null;
        day.combinedOdds = null;
        day.status = 'pending';
        day.settledAt = null;
        await this.dayRepo.save(day);
        this.logger.log(`Rollover day ${day.dayNumber} voided ticket=#${ticket.id} — retry same plan day`);
      }
    }
  }

  private async commitAttach(
    ticket: AccumulatorTicket,
    opts: { replaceSameDay: boolean; strict: boolean; asNextDay?: boolean },
  ): Promise<{ attached: boolean; dayNumber: number; ticketId: number; combinedOdds: number; replaced: boolean }> {
    const date = utcDateStamp();
    let run = await this.runRepo.findOne({ where: { status: 'active' }, order: { id: 'DESC' } });

    if (opts.asNextDay) {
      return this.commitNextDaySameDate(ticket, run, date);
    }

    const pending = run
      ? await this.dayRepo.findOne({
          where: { runId: run.id, status: 'pending' },
          order: { dayNumber: 'ASC' },
        })
      : null;

    if (pending?.ticketId && pending.ticketId === ticket.id) {
      return {
        attached: true,
        dayNumber: pending.dayNumber,
        ticketId: ticket.id,
        combinedOdds: Number(pending.combinedOdds ?? ticket.totalOdds),
        replaced: false,
      };
    }

    if (pending?.ticketId) {
      const pendingDate = this.dateOnly(pending.calendarDate);
      if (pendingDate !== date) {
        if (opts.strict) {
          throw new BadRequestException(
            `Day ${pending.dayNumber} is still live (coupon #${pending.ticketId}). Wait for settlement before attaching today’s coupon.`,
          );
        }
        return {
          attached: false,
          dayNumber: pending.dayNumber,
          ticketId: pending.ticketId,
          combinedOdds: Number(pending.combinedOdds ?? 0),
          replaced: false,
        };
      }
      if (!opts.replaceSameDay) {
        return {
          attached: false,
          dayNumber: pending.dayNumber,
          ticketId: pending.ticketId,
          combinedOdds: Number(pending.combinedOdds ?? 0),
          replaced: false,
        };
      }
      pending.ticketId = ticket.id;
      pending.combinedOdds = Number(ticket.totalOdds);
      pending.calendarDate = date;
      await this.dayRepo.save(pending);
      if (run) {
        run.currentDay = pending.dayNumber;
        await this.runRepo.save(run);
      }
      this.logger.log(
        `Rollover switched day ${pending.dayNumber} to ticket=#${ticket.id} odds=${ticket.totalOdds}`,
      );
      return {
        attached: true,
        dayNumber: pending.dayNumber,
        ticketId: ticket.id,
        combinedOdds: Number(ticket.totalOdds),
        replaced: true,
      };
    }

    if (pending && !pending.ticketId) {
      if (!run) run = await this.createRun();
      pending.ticketId = ticket.id;
      pending.combinedOdds = Number(ticket.totalOdds);
      pending.calendarDate = date;
      await this.dayRepo.save(pending);
      run.currentDay = pending.dayNumber;
      await this.runRepo.save(run);
      this.logger.log(`Rollover retry day ${pending.dayNumber} ticket=#${ticket.id} odds=${ticket.totalOdds}`);
      return {
        attached: true,
        dayNumber: pending.dayNumber,
        ticketId: ticket.id,
        combinedOdds: Number(ticket.totalOdds),
        replaced: false,
      };
    }

    if (!run) {
      run = await this.createRun();
    }

    const takenToday = await this.dayRepo
      .createQueryBuilder('d')
      .where('d.runId = :runId', { runId: run.id })
      .andWhere('d.calendarDate = :date', { date })
      .getOne();
    if (takenToday) {
      if (opts.strict) {
        throw new BadRequestException(
          `A rollover coupon is already recorded for ${date}. Use Attach as Day ${takenToday.dayNumber + 1} for a later slot the same day.`,
        );
      }
      return {
        attached: false,
        dayNumber: takenToday.dayNumber,
        ticketId: takenToday.ticketId ?? ticket.id,
        combinedOdds: Number(takenToday.combinedOdds ?? ticket.totalOdds),
        replaced: false,
      };
    }

    const last = await this.dayRepo.findOne({
      where: { runId: run.id },
      order: { dayNumber: 'DESC' },
    });

    let nextDay = 1;
    if (last?.status === 'won' && last.dayNumber < ROLLOVER_PLAN_DAYS) {
      nextDay = last.dayNumber + 1;
    } else if (last?.status === 'won' && last.dayNumber >= ROLLOVER_PLAN_DAYS) {
      run.status = 'completed';
      run.completedAt = new Date();
      await this.runRepo.save(run);
      run = await this.createRun();
      nextDay = 1;
    }

    return this.insertPlanDay(run, nextDay, date, ticket, opts.strict);
  }

  /** Evening (or later slot) as the next plan day on the same Accra calendar date. */
  private async commitNextDaySameDate(
    ticket: AccumulatorTicket,
    run: RolloverRun | null,
    date: string,
  ) {
    if (!run) run = await this.createRun();
    const last = await this.dayRepo.findOne({
      where: { runId: run.id },
      order: { dayNumber: 'DESC' },
    });
    if (!last) {
      throw new BadRequestException('Attach Day 1 first, then use Attach as next day for a later slot.');
    }
    if (last.dayNumber >= ROLLOVER_PLAN_DAYS) {
      throw new BadRequestException('This campaign already has all 30 days.');
    }
    if (this.dateOnly(last.calendarDate) !== date) {
      throw new BadRequestException(
        'Attach as next day is only for a later Acca Desk slot on the same calendar day (e.g. evening after afternoon).',
      );
    }
    return this.insertPlanDay(run, last.dayNumber + 1, date, ticket, true);
  }

  private async insertPlanDay(
    run: RolloverRun,
    nextDay: number,
    date: string,
    ticket: AccumulatorTicket,
    strict: boolean,
  ): Promise<{ attached: boolean; dayNumber: number; ticketId: number; combinedOdds: number; replaced: boolean }> {
    const row = this.dayRepo.create({
      runId: run.id,
      dayNumber: nextDay,
      calendarDate: date,
      ticketId: ticket.id,
      status: 'pending',
      combinedOdds: Number(ticket.totalOdds),
    });
    try {
      await this.dayRepo.save(row);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === '23505') {
        if (strict) throw new BadRequestException('That coupon is already on the rollover board.');
        return {
          attached: false,
          dayNumber: nextDay,
          ticketId: ticket.id,
          combinedOdds: Number(ticket.totalOdds),
          replaced: false,
        };
      }
      throw err;
    }
    run.currentDay = nextDay;
    await this.runRepo.save(run);
    this.logger.log(`Rollover attached day ${nextDay} ticket=#${ticket.id} odds=${ticket.totalOdds}`);
    return {
      attached: true,
      dayNumber: nextDay,
      ticketId: ticket.id,
      combinedOdds: Number(ticket.totalOdds),
      replaced: false,
    };
  }

  private async requireQualifyingTodayTicket(ticketId: number): Promise<AccumulatorTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new BadRequestException(`Coupon #${ticketId} not found.`);

    const owner = await this.tipsterRepo.findOne({
      where: { username: ROLLOVER_OWNER_USERNAME },
      select: ['userId', 'username'],
    });
    if (!owner?.userId || ticket.userId !== owner.userId) {
      throw new BadRequestException(`Coupon must belong to ${ROLLOVER_OWNER_USERNAME}.`);
    }
    const { start, end } = utcDayBounds();
    if (ticket.createdAt < start || ticket.createdAt >= end) {
      throw new BadRequestException('Coupon must be from today’s Acca Desk publish.');
    }
    if (!ticket.isMarketplace || ticket.totalPicks !== 2) {
      throw new BadRequestException('Coupon must be a published 2-fold marketplace pick.');
    }
    if ((ticket.result || 'pending').toLowerCase() !== 'pending') {
      throw new BadRequestException('Coupon has already settled.');
    }
    if (!isQualifyingRolloverOdds(Number(ticket.totalOdds))) {
      throw new BadRequestException(
        `Combined odds ${Number(ticket.totalOdds).toFixed(2)} are outside ${ROLLOVER_ODDS_MIN.toFixed(2)}–${ROLLOVER_ODDS_MAX.toFixed(2)}.`,
      );
    }
    return ticket;
  }

  private async listTodayOwnerTickets(): Promise<AccumulatorTicket[]> {
    const tipster = await this.tipsterRepo.findOne({
      where: { username: ROLLOVER_OWNER_USERNAME },
      select: ['userId', 'username'],
    });
    if (!tipster?.userId) return [];
    const { start, end } = utcDayBounds();
    return this.ticketRepo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId: tipster.userId })
      .andWhere('t.createdAt >= :start', { start })
      .andWhere('t.createdAt < :end', { end })
      .andWhere('t.isMarketplace = true')
      .orderBy('t.createdAt', 'ASC')
      .getMany();
  }

  private async usedTicketIds(): Promise<Set<number>> {
    const usedRows = await this.dayRepo
      .createQueryBuilder('d')
      .select(['d.ticketId'])
      .where('d.ticketId IS NOT NULL')
      .getMany();
    return new Set(usedRows.map((r) => r.ticketId!).filter(Boolean));
  }

  private async pickTodayTicket(): Promise<AccumulatorTicket | null> {
    const tickets = await this.listTodayOwnerTickets();
    if (!tickets.length) {
      const tipster = await this.tipsterRepo.findOne({
        where: { username: ROLLOVER_OWNER_USERNAME },
        select: ['userId'],
      });
      if (!tipster?.userId) this.logger.warn(`Rollover owner ${ROLLOVER_OWNER_USERNAME} not found`);
      return null;
    }
    return selectQualifyingRolloverTicket(tickets, await this.usedTicketIds());
  }

  /** Read-only ops snapshot — does not attach a coupon. */
  async getSnapshot() {
    const date = utcDateStamp();
    const campaignStakeGhs = await this.getDefaultCampaignStake();
    const archive = await this.getArchiveStats();
    const run = await this.runRepo.findOne({ where: { status: 'active' }, order: { id: 'DESC' } });
    if (!run) {
      return {
        calendarDate: date,
        ownerUsername: ROLLOVER_OWNER_USERNAME,
        campaignStakeGhs,
        defaultCampaignStakeGhs: campaignStakeGhs,
        archive,
        run: null,
        pendingDay: null,
        lastDay: null,
      };
    }
    const pending = await this.dayRepo.findOne({
      where: { runId: run.id, status: 'pending' },
      order: { dayNumber: 'ASC' },
    });
    const last = await this.dayRepo.findOne({
      where: { runId: run.id },
      order: { dayNumber: 'DESC' },
    });
    const stake = Number(run.campaignStakeGhs ?? campaignStakeGhs);
    return {
      calendarDate: date,
      ownerUsername: ROLLOVER_OWNER_USERNAME,
      campaignStakeGhs: stake,
      defaultCampaignStakeGhs: campaignStakeGhs,
      archive,
      run: {
        id: run.id,
        status: run.status,
        currentDay: run.currentDay,
        campaignStakeGhs: stake,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        brokenAt: run.brokenAt,
        resetAt: run.resetAt,
      },
      pendingDay: pending
        ? {
            dayNumber: pending.dayNumber,
            calendarDate: this.dateOnly(pending.calendarDate),
            ticketId: pending.ticketId,
            status: pending.status,
            combinedOdds: pending.combinedOdds != null ? Number(pending.combinedOdds) : null,
          }
        : null,
      lastDay: last
        ? {
            dayNumber: last.dayNumber,
            calendarDate: this.dateOnly(last.calendarDate),
            ticketId: last.ticketId,
            status: last.status,
            combinedOdds: last.combinedOdds != null ? Number(last.combinedOdds) : null,
          }
        : null,
    };
  }

  private async createRun(): Promise<RolloverRun> {
    const campaignStakeGhs = await this.getDefaultCampaignStake();
    try {
      return await this.runRepo.save(
        this.runRepo.create({
          status: 'active',
          currentDay: 0,
          ownerUsername: ROLLOVER_OWNER_USERNAME,
          campaignStakeGhs,
        }),
      );
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === '23505') {
        const raced = await this.runRepo.findOne({ where: { status: 'active' }, order: { id: 'DESC' } });
        if (raced) return raced;
      }
      throw err;
    }
  }

  private async releaseOpenDays(runId: number, keepDayId?: number): Promise<void> {
    const open = await this.dayRepo.find({ where: { runId, status: 'pending' } });
    const now = new Date();
    for (const day of open) {
      if (keepDayId && day.id === keepDayId) continue;
      day.status = 'skipped';
      day.ticketId = null;
      day.combinedOdds = null;
      day.settledAt = now;
      await this.dayRepo.save(day);
    }
  }

  private async getArchiveStats() {
    const runs = await this.runRepo.find({ order: { id: 'DESC' } });
    const empty = {
      bestWonDays: 0,
      bestCampaignStakeGhs: null as number | null,
      bestExampleReturnGhs: null as number | null,
      campaignsCompleted: 0,
      campaignsCut: 0,
      campaignsReset: 0,
      lastEnded: null as {
        status: string;
        wonDays: number;
        endedDay: number;
        endedAt: Date | null;
      } | null,
    };
    if (!runs.length) return empty;

    const won = await this.dayRepo
      .createQueryBuilder('d')
      .select('d.run_id', 'runId')
      .addSelect('MAX(d.day_number)', 'maxWon')
      .where('d.status = :st', { st: 'won' })
      .groupBy('d.run_id')
      .getRawMany<{ runId: number | string; maxWon: number | string }>();
    const maxByRun = new Map(won.map((r) => [Number(r.runId), Number(r.maxWon)]));

    let bestWonDays = 0;
    let bestRun: RolloverRun | null = null;
    for (const run of runs) {
      const n = maxByRun.get(run.id) ?? 0;
      if (n > bestWonDays) {
        bestWonDays = n;
        bestRun = run;
      }
    }

    const stake = Number(bestRun?.campaignStakeGhs ?? ROLLOVER_EXAMPLE_STAKE_GHS);
    const money =
      bestWonDays > 0
        ? exampleMoneyForDay(bestWonDays, ROLLOVER_EXAMPLE_MAX_MONEY_DAY, stake)
        : { stakeGhs: null, returnGhs: null };

    const lastEndedRun = runs.find((r) => r.status !== 'active') ?? null;

    return {
      bestWonDays,
      bestCampaignStakeGhs: bestWonDays > 0 ? stake : null,
      bestExampleReturnGhs: money.returnGhs,
      campaignsCompleted: runs.filter((r) => r.status === 'completed').length,
      campaignsCut: runs.filter((r) => r.status === 'broken').length,
      campaignsReset: runs.filter((r) => r.status === 'reset').length,
      lastEnded: lastEndedRun
        ? {
            status: lastEndedRun.status,
            wonDays: maxByRun.get(lastEndedRun.id) ?? 0,
            endedDay: lastEndedRun.currentDay,
            endedAt: lastEndedRun.brokenAt ?? lastEndedRun.completedAt ?? lastEndedRun.resetAt ?? lastEndedRun.startedAt,
          }
        : null,
    };
  }

  private async getDefaultCampaignStake(): Promise<number> {
    const row = await this.settingsRepo.findOne({ where: { id: 1 } });
    const value = Number(row?.defaultCampaignStakeGhs ?? ROLLOVER_EXAMPLE_STAKE_GHS);
    return Number.isFinite(value) && value > 0 ? value : ROLLOVER_EXAMPLE_STAKE_GHS;
  }

  private async upsertSettings(campaignStakeGhs: number): Promise<void> {
    const existing = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (existing) {
      existing.defaultCampaignStakeGhs = campaignStakeGhs;
      await this.settingsRepo.save(existing);
      return;
    }
    await this.settingsRepo.save(
      this.settingsRepo.create({ id: 1, defaultCampaignStakeGhs: campaignStakeGhs }),
    );
  }

  private parseCampaignStake(raw: number): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1 || n > 100000) {
      throw new BadRequestException('Campaign stake must be between GHS 1 and GHS 100,000.');
    }
    return Math.round(n * 100) / 100;
  }

  private dateOnly(value: string | Date): string {
    if (typeof value === 'string') return value.slice(0, 10);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }
}
