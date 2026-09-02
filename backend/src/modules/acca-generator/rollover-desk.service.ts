import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ACCA_DESK_TIME_SLOTS, addDateStrDays, deskDayFromTitle, type AccaDeskSlotKey } from '../../config/acca-desk-slots';
import {
  ROLLOVER_EXAMPLE_MAX_MONEY_DAY,
  ROLLOVER_EXAMPLE_STAKE_GHS,
  ROLLOVER_OWNER_DISPLAY_FALLBACK,
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
  buildBoardMoneyLadder,
  exampleMoneyForDay,
  isEligibleRolloverTicket,
  selectEligibleRolloverTicket,
  slotKeyFromTitle,
  utcDateStamp,
  utcDayBounds,
  fillPlanCalendarDates,
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

  /**
   * Settlement sync only (serialized). Coupons are never auto-attached —
   * admin must pick AccaSure1X2 manually via adminAttach.
   */
  async syncBoard(): Promise<void> {
    this.attachChain = this.attachChain.then(() => this.syncSettledDays()).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Rollover settlement sync failed: ${message}`);
    });
    await this.attachChain;
  }

  async getBoard(viewerUserId?: number | null) {
    await this.syncBoard();

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

    let skipReason: 'no_coupon' | 'awaiting_settlement' | null = null;
    if (run?.status === 'active') {
      const oldestPending = pendingDays[0] ?? null;
      if (oldestPending?.ticketId && this.dateOnly(oldestPending.calendarDate) !== date && !todayRow?.ticketId) {
        skipReason = 'awaiting_settlement';
      } else if (!todayRow?.ticketId) {
        skipReason = 'no_coupon';
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

    const dayOdds = Array.from({ length: ROLLOVER_PLAN_DAYS }, (_, i) => {
      const row = byNumber.get(i + 1);
      return row?.combinedOdds != null ? Number(row.combinedOdds) : null;
    });
    const ladder = buildBoardMoneyLadder(dayOdds, campaignStakeGhs);
    const slots = ladder.map((money, i) => {
      const dayNumber = i + 1;
      const row = byNumber.get(dayNumber);
      const combinedOdds = row?.combinedOdds != null ? Number(row.combinedOdds) : null;
      return {
        dayNumber,
        calendarDate: row ? this.dateOnly(row.calendarDate) : null,
        ticketId: row?.ticketId ?? null,
        status: row?.status ?? 'empty',
        combinedOdds,
        exampleStakeGhs: money.stakeGhs,
        exampleReturnGhs: money.returnGhs,
      };
    });
    const planDates = fillPlanCalendarDates(
      slots.map((s) => s.calendarDate),
      date,
    );
    slots.forEach((slot, i) => {
      slot.calendarDate = planDates[i];
    });

    const finishMoney = ladder[ladder.length - 1];

    return {
      ownerUsername: ROLLOVER_OWNER_USERNAME,
      ownerDisplayName: owner?.displayName ?? ROLLOVER_OWNER_DISPLAY_FALLBACK,
      ownerAvatarUrl: owner?.avatarUrl ?? null,
      timezone: ROLLOVER_TIMEZONE,
      planDays: ROLLOVER_PLAN_DAYS,
      targetOdds: ROLLOVER_TARGET_ODDS,
      exampleStakeStartGhs: campaignStakeGhs,
      exampleMaxMoneyDay: ROLLOVER_EXAMPLE_MAX_MONEY_DAY,
      exampleFinishGhs: finishMoney?.returnGhs ?? null,
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

  /**
   * Admin: attach a specific AccaSure1X2 coupon, or the earliest eligible pending 2-fold.
   * Same won/lost/void cut as before. Same-day pending can be switched.
   * `asNextDay` attaches a later slot as the next plan day on the same calendar date.
   * Manual only — never called by cron.
   */
  async adminAttach(opts?: { ticketId?: number; asNextDay?: boolean }) {
    await this.syncSettledDays();
    const ticket = opts?.ticketId
      ? await this.requireEligibleTodayTicket(opts.ticketId)
      : opts?.asNextDay
        ? selectEligibleRolloverTicket(
            await this.listAttachableOwnerTickets(),
            await this.usedTicketIds(),
            { preferLatestSlot: true },
          )
        : await this.pickTodayTicket();
    if (!ticket) {
      throw new BadRequestException(
        `No eligible ${ROLLOVER_OWNER_USERNAME} pending 2-fold for today’s or tomorrow’s Acca Desk board. Publish AccaSure1X2 first, then attach the coupon you want.`,
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

  async clearArchiveStats() {
    const now = new Date();
    const existing = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (existing) {
      existing.statsClearedAt = now;
      await this.settingsRepo.save(existing);
    } else {
      await this.settingsRepo.save(
        this.settingsRepo.create({
          id: 1,
          defaultCampaignStakeGhs: ROLLOVER_EXAMPLE_STAKE_GHS,
          statsClearedAt: now,
        }),
      );
    }
    this.logger.log('Rollover public archive stats cleared');
    return this.getAdminState();
  }

  async syncNow() {
    await this.syncSettledDays();
    return this.getAdminState();
  }

  async getAdminState() {
    await this.syncSettledDays();
    const snapshot = await this.getSnapshot();
    const tickets = await this.listAttachableOwnerTickets();
    const used = await this.usedTicketIds();
    const pendingId = snapshot.pendingDay?.ticketId ?? null;
    const lastDay = snapshot.lastDay;
    const date = snapshot.calendarDate;
    const tomorrowStamp = addDateStrDays(date, 1);
    const candidates = tickets.map((t) => {
      const odds = Number(t.totalOdds);
      const result = (t.result || 'pending').toLowerCase();
      const slotKey = slotKeyFromTitle(t.title);
      const deskDay = deskDayFromTitle(t.title);
      const eligible = isEligibleRolloverTicket(t);
      const attached = pendingId === t.id || used.has(t.id);
      return {
        id: t.id,
        title: t.title,
        slotKey,
        deskDay,
        totalOdds: odds,
        totalPicks: t.totalPicks,
        result,
        eligible,
        attached,
        canAttach: eligible && !attached,
      };
    });
    // Slot generate buttons are for today's board only — don't mark posted from tomorrow's early run.
    const postedSlots = Object.fromEntries(
      ACCA_DESK_TIME_SLOTS.map((s) => [
        s.key,
        candidates.some((c) => c.slotKey === s.key && (c.deskDay == null || c.deskDay === date)),
      ]),
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
      candidates.some((c) => c.eligible && !c.attached);

    return {
      ...snapshot,
      planDays: ROLLOVER_PLAN_DAYS,
      targetOdds: ROLLOVER_TARGET_ODDS,
      tomorrowDeskDay: tomorrowStamp,
      postedSlots,
      candidates,
      canAttachEarliest: !blockReason && candidates.some((c) => c.eligible && !c.attached) && !canAttachNextDay,
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
      throw new BadRequestException(`This campaign already has all ${ROLLOVER_PLAN_DAYS} days.`);
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

  private async requireEligibleTodayTicket(ticketId: number): Promise<AccumulatorTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new BadRequestException(`Coupon #${ticketId} not found.`);

    const owner = await this.tipsterRepo.findOne({
      where: { username: ROLLOVER_OWNER_USERNAME },
      select: ['userId', 'username'],
    });
    if (!owner?.userId || ticket.userId !== owner.userId) {
      throw new BadRequestException(`Coupon must belong to ${ROLLOVER_OWNER_USERNAME}.`);
    }
    const todayStamp = utcDateStamp();
    const tomorrowStamp = addDateStrDays(todayStamp, 1);
    const desk = deskDayFromTitle(ticket.title);
    if (desk) {
      if (desk !== todayStamp && desk !== tomorrowStamp) {
        throw new BadRequestException(
          'Coupon must be from today’s or tomorrow’s Acca Desk board (after the 20:00 early publish).',
        );
      }
    } else {
      const { start, end } = utcDayBounds();
      const createdFrom = new Date(start);
      createdFrom.setUTCDate(createdFrom.getUTCDate() - 1);
      const createdTo = new Date(end);
      createdTo.setUTCDate(createdTo.getUTCDate() + 1);
      if (ticket.createdAt < createdFrom || ticket.createdAt >= createdTo) {
        throw new BadRequestException('Coupon must be from a recent Acca Desk publish.');
      }
    }
    if (!ticket.isMarketplace || ticket.totalPicks !== 2) {
      throw new BadRequestException('Coupon must be a published 2-fold marketplace pick.');
    }
    if ((ticket.result || 'pending').toLowerCase() !== 'pending') {
      throw new BadRequestException('Coupon has already settled.');
    }
    return ticket;
  }

  /**
   * AccaSure1X2 coupons for today’s desk day plus tomorrow’s (20:00 early board).
   * After today’s slots settle, admin still needs tomorrow’s pending coupons to attach.
   */
  private async listAttachableOwnerTickets(): Promise<AccumulatorTicket[]> {
    const tipster = await this.tipsterRepo.findOne({
      where: { username: ROLLOVER_OWNER_USERNAME },
      select: ['userId', 'username'],
    });
    if (!tipster?.userId) return [];
    const { start, end } = utcDayBounds();
    const createdFrom = new Date(start);
    createdFrom.setUTCDate(createdFrom.getUTCDate() - 1);
    const createdTo = new Date(end);
    createdTo.setUTCDate(createdTo.getUTCDate() + 1);
    const todayStamp = utcDateStamp();
    const tomorrowStamp = addDateStrDays(todayStamp, 1);
    const tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId: tipster.userId })
      .andWhere('t.createdAt >= :createdFrom', { createdFrom })
      .andWhere('t.createdAt < :createdTo', { createdTo })
      .andWhere('t.isMarketplace = true')
      .orderBy('t.createdAt', 'ASC')
      .getMany();
    const filtered = tickets.filter((t) => {
      const desk = deskDayFromTitle(t.title);
      if (desk) return desk === todayStamp || desk === tomorrowStamp;
      return t.createdAt >= start && t.createdAt < createdTo;
    });
    // Today’s board first, then tomorrow; within a day keep create order (slot order).
    return filtered.sort((a, b) => {
      const da = deskDayFromTitle(a.title) ?? todayStamp;
      const db = deskDayFromTitle(b.title) ?? todayStamp;
      if (da !== db) return da.localeCompare(db);
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
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
    const tickets = await this.listAttachableOwnerTickets();
    if (!tickets.length) {
      const tipster = await this.tipsterRepo.findOne({
        where: { username: ROLLOVER_OWNER_USERNAME },
        select: ['userId'],
      });
      if (!tipster?.userId) this.logger.warn(`Rollover owner ${ROLLOVER_OWNER_USERNAME} not found`);
      return null;
    }
    // Prefer today’s pending before tomorrow’s early board.
    const todayStamp = utcDateStamp();
    const used = await this.usedTicketIds();
    const todayFirst = [
      ...tickets.filter((t) => (deskDayFromTitle(t.title) ?? todayStamp) === todayStamp),
      ...tickets.filter((t) => (deskDayFromTitle(t.title) ?? '') === addDateStrDays(todayStamp, 1)),
    ];
    return selectEligibleRolloverTicket(todayFirst, used);
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
    const allRuns = await this.runRepo.find({ order: { id: 'DESC' } });
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const cutoff = settings?.statsClearedAt ?? null;
    const runs = allRuns.filter((run) => this.runVisibleInStats(run, cutoff));
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

  private runVisibleInStats(run: RolloverRun, cutoff: Date | null): boolean {
    if (run.status === 'active') return true;
    if (!cutoff) return true;
    const ended = run.completedAt ?? run.brokenAt ?? run.resetAt ?? run.startedAt;
    return new Date(ended).getTime() >= new Date(cutoff).getTime();
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
