import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  VIP_MAX_COUPONS_PER_DAY,
  VIP_TIPSTER,
  VIP_TIPSTER_DAILY_CRON,
  VIP_TIPSTER_EARLY_CRON,
  VIP_TIPSTER_TYPE,
  isVipTipsterEnabled,
  type VipConstructionKey,
} from '../../config/vip-tipster.config';
import {
  accraDateStr,
  addDateStrDays,
  deskDayFromTitle,
  deskDayFixtureWindow,
  slotForKickoff,
  ACCA_DESK_TIME_SLOTS,
  type AccaDeskSlotKey,
} from '../../config/acca-desk-slots';
import { ACCA_DESK_TIPSTER_TYPE } from '../../config/acca-desk-tipsters.config';
import { isSubscriptionsEnabled } from '../../common/subscriptions-enabled';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { TipsterSubscriptionPackage } from '../subscriptions/entities/tipster-subscription-package.entity';
import { SyncStatus } from '../fixtures/entities/sync-status.entity';
import { AccaGeneratorService } from './acca-generator.service';
import { VipTipsterSetupService } from './vip-tipster-setup.service';

export type VipTipsterRunResult = {
  enabled: boolean;
  reason?: string;
  deskDay: string;
  published: number;
  skippedAlreadyPosted: number;
  skippedEmptyPool: number;
  skippedNoUser: number;
  errors: number;
  details: {
    status: 'published' | 'skipped_already' | 'empty_pool' | 'no_user' | 'error' | 'disabled';
    ticketId?: number;
    construction?: VipConstructionKey;
    slotKey?: AccaDeskSlotKey;
    message?: string;
  }[];
};

@Injectable()
export class VipTipsterPublisherService {
  private readonly logger = new Logger(VipTipsterPublisherService.name);

  constructor(
    private readonly accaGenerator: AccaGeneratorService,
    private readonly setup: VipTipsterSetupService,
    @InjectRepository(Tipster)
    private readonly tipsterRepo: Repository<Tipster>,
    @InjectRepository(AccumulatorTicket)
    private readonly ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(AccumulatorPick)
    private readonly pickRepo: Repository<AccumulatorPick>,
    @InjectRepository(Fixture)
    private readonly fixtureRepo: Repository<Fixture>,
    @InjectRepository(TipsterSubscriptionPackage)
    private readonly packageRepo: Repository<TipsterSubscriptionPackage>,
    @InjectRepository(SyncStatus)
    private readonly syncStatusRepo: Repository<SyncStatus>,
  ) {}

  async getOverview() {
    const tipster = await this.tipsterRepo.findOne({
      where: { username: VIP_TIPSTER.username, tipsterType: VIP_TIPSTER_TYPE },
    });
    const pkg = tipster?.userId
      ? await this.packageRepo.findOne({
          where: { tipsterUserId: tipster.userId, status: 'active' },
          order: { createdAt: 'ASC' },
        })
      : null;

    const tz = this.predictionTimeZone();
    const todayDesk = accraDateStr(new Date(), tz);
    const tomorrowDesk = addDateStrDays(todayDesk, 1);
    const todayTickets = tipster?.userId ? await this.findDeskDayTickets(tipster.userId, todayDesk) : [];
    const tomorrowTickets = tipster?.userId
      ? await this.findDeskDayTickets(tipster.userId, tomorrowDesk)
      : [];
    const ticketIds = [...todayTickets, ...tomorrowTickets].map((t) => t.id);
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

    const fixtureIds = [
      ...new Set(picks.map((p) => p.fixtureId).filter((id): id is number => id != null)),
    ];
    const fixtures = fixtureIds.length
      ? await this.fixtureRepo.find({
          where: { id: In(fixtureIds) },
          select: [
            'id',
            'homeScore',
            'awayScore',
            'status',
            'statusElapsed',
            'homeTeamLogo',
            'awayTeamLogo',
            'homeTeamName',
            'awayTeamName',
            'homeCountryCode',
            'awayCountryCode',
          ],
        })
      : [];
    const fixtureMap = new Map(fixtures.map((f) => [f.id, f]));

    const sync = await this.syncStatusRepo.findOne({ where: { syncType: 'vip_desk' } });
    const earlySync = await this.syncStatusRepo.findOne({ where: { syncType: 'vip_desk_early' } });
    const serialize = (rows: AccumulatorTicket[]) =>
      rows.map((t) => {
        const ticketPicks = (picksByTicket.get(t.id) || []).map((p) => {
          const fix = p.fixtureId != null ? fixtureMap.get(p.fixtureId) : undefined;
          return {
            id: p.id,
            matchDescription: p.matchDescription,
            prediction: p.prediction,
            odds: Number(p.odds),
            matchDate: p.matchDate,
            result: p.result,
            homeScore: fix?.homeScore ?? null,
            awayScore: fix?.awayScore ?? null,
            fixtureStatus: fix?.status ?? null,
            fixtureStatusElapsed: fix?.statusElapsed ?? null,
            homeTeamLogo: fix?.homeTeamLogo ?? null,
            awayTeamLogo: fix?.awayTeamLogo ?? null,
            homeTeamName: fix?.homeTeamName ?? null,
            awayTeamName: fix?.awayTeamName ?? null,
            homeCountryCode: fix?.homeCountryCode ?? null,
            awayCountryCode: fix?.awayCountryCode ?? null,
          };
        });
        return {
          id: t.id,
          title: t.title,
          totalOdds: Number(t.totalOdds),
          totalPicks: Number(t.totalPicks),
          price: Number(t.price) || 0,
          status: t.status,
          result: t.result,
          createdAt: t.createdAt?.toISOString?.() || String(t.createdAt),
          bookmakerKey: t.bookmakerKey,
          bookingCode: t.bookingCode,
          picks: ticketPicks,
        };
      });

    return {
      enabled: isVipTipsterEnabled(),
      subscriptionsEnabled: isSubscriptionsEnabled(),
      cron: VIP_TIPSTER_DAILY_CRON,
      earlyCron: VIP_TIPSTER_EARLY_CRON,
      timezone: tz,
      todayDeskDay: todayDesk,
      tomorrowDeskDay: tomorrowDesk,
      maxPerDay: VIP_MAX_COUPONS_PER_DAY,
      username: VIP_TIPSTER.username,
      displayName: VIP_TIPSTER.display_name,
      avatarUrl: tipster?.avatarUrl || VIP_TIPSTER.avatar_url,
      winRate: tipster ? Number(tipster.winRate) : 0,
      roi: tipster ? Number(tipster.roi) : 0,
      totalPicks: tipster?.totalPredictions ?? 0,
      wonPicks: tipster?.totalWins ?? 0,
      lostPicks: tipster?.totalLosses ?? 0,
      rank: tipster?.leaderboardRank ?? null,
      setup: !!tipster,
      isActive: tipster?.isActive ?? false,
      userId: tipster?.userId ?? null,
      packageId: pkg?.id ?? null,
      packageName: pkg?.name ?? null,
      packagePrice: pkg ? Number(pkg.price) : null,
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
      todayTickets: serialize(todayTickets),
      tomorrowTickets: serialize(tomorrowTickets),
    };
  }

  async runDaily(opts?: { ensureSetup?: boolean; deskDayStr?: string }): Promise<VipTipsterRunResult> {
    const tz = this.predictionTimeZone();
    const deskDayStr = opts?.deskDayStr || accraDateStr(new Date(), tz);

    if (!isVipTipsterEnabled()) {
      this.logger.warn('VIP tipster disabled (VIP_TIPSTER_ENABLED=false)');
      return this.emptyResult(deskDayStr, 'disabled');
    }
    if (!isSubscriptionsEnabled()) {
      this.logger.warn('VIP tipster skipped — SUBSCRIPTIONS_ENABLED is off');
      return this.emptyResult(deskDayStr, 'subscriptions_off');
    }

    if (opts?.ensureSetup !== false) {
      await this.setup.initializeVipTipster();
    }

    const tipster = await this.tipsterRepo.findOne({
      where: { username: VIP_TIPSTER.username, tipsterType: VIP_TIPSTER_TYPE },
    });
    if (!tipster?.userId || !tipster.isActive) {
      return {
        enabled: true,
        deskDay: deskDayStr,
        published: 0,
        skippedAlreadyPosted: 0,
        skippedEmptyPool: 0,
        skippedNoUser: 1,
        errors: 0,
        details: [{ status: 'no_user' }],
      };
    }

    const pkg = await this.packageRepo.findOne({
      where: { tipsterUserId: tipster.userId, status: 'active' },
      order: { createdAt: 'ASC' },
    });
    if (!pkg) {
      return {
        enabled: true,
        deskDay: deskDayStr,
        published: 0,
        skippedAlreadyPosted: 0,
        skippedEmptyPool: 0,
        skippedNoUser: 1,
        errors: 0,
        details: [{ status: 'no_user', message: 'No active VIP package' }],
      };
    }

    const existing = await this.findDeskDayTickets(tipster.userId, deskDayStr);
    const usedFixtureIds = new Set<number>();
    await this.addDeskDayFixtureIds(usedFixtureIds, [tipster.userId], deskDayStr);
    await this.addAccaDeskFixtureIds(usedFixtureIds, deskDayStr);

    const postedSlots = await this.postedSlotsForDeskDay(existing);
    const result: VipTipsterRunResult = {
      enabled: true,
      deskDay: deskDayStr,
      published: 0,
      skippedAlreadyPosted: postedSlots.size,
      skippedEmptyPool: 0,
      skippedNoUser: 0,
      errors: 0,
      details: [],
    };

    for (const slot of ACCA_DESK_TIME_SLOTS) {
      if (postedSlots.has(slot.key)) {
        result.details.push({ status: 'skipped_already', slotKey: slot.key });
        continue;
      }
      if (postedSlots.size >= VIP_MAX_COUPONS_PER_DAY) {
        result.details.push({ status: 'skipped_already', slotKey: slot.key });
        continue;
      }
      try {
        const generated = await this.accaGenerator.generateForVip({
          userId: tipster.userId,
          excludeFixtureIds: usedFixtureIds,
          deskDayStr,
          slotKey: slot.key,
        });
        if (!generated.ok) {
          result.skippedEmptyPool++;
          result.details.push({
            status: 'empty_pool',
            slotKey: slot.key,
            message: `home_win candidates=${generated.candidates}`,
          });
          continue;
        }

        const title =
          `${VIP_TIPSTER.display_name} · ${generated.constructionLabel} · ${slot.label} · 2-fold @ ${generated.combinedOdds} · ${deskDayStr}`.slice(
            0,
            255,
          );
        const description = (
          `${VIP_TIPSTER.bio} ${generated.constructionLabel} · ${slot.label} · ${deskDayStr}. VIP subscribers only.`
        ).slice(0, 2000);

        const published = await this.accaGenerator.publish(tipster.userId, {
          generationId: generated.generationId,
          title,
          description,
          placement: 'subscription',
          subscriptionPackageIds: [pkg.id],
        });

        for (const leg of generated.legs) {
          if (leg.fixtureId) usedFixtureIds.add(leg.fixtureId);
        }
        postedSlots.add(slot.key);

        const ticketId = Number(
          (published as { publishedTicketId?: number })?.publishedTicketId ??
            (published as { ticket?: { id?: number } })?.ticket?.id,
        );
        result.published++;
        result.details.push({
          status: 'published',
          ticketId: Number.isFinite(ticketId) ? ticketId : undefined,
          construction: generated.construction,
          slotKey: slot.key,
        });
        this.logger.log(
          `VIP published ${generated.construction} ${slot.key} deskDay=${deskDayStr} ticket=#${ticketId} odds=${generated.combinedOdds}`,
        );
      } catch (err: unknown) {
        result.errors++;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`VIP publish failed ${slot.key} deskDay=${deskDayStr}: ${message}`);
        result.details.push({ status: 'error', slotKey: slot.key, message });
      }
    }

    return result;
  }

  private emptyResult(deskDayStr: string, reason: string): VipTipsterRunResult {
    return {
      enabled: false,
      reason,
      deskDay: deskDayStr,
      published: 0,
      skippedAlreadyPosted: 0,
      skippedEmptyPool: 0,
      skippedNoUser: 0,
      errors: 0,
      details: [{ status: 'disabled', message: reason }],
    };
  }

  private predictionTimeZone(): string {
    return process.env.PREDICTION_TIMEZONE || 'Africa/Accra';
  }

  private async addAccaDeskFixtureIds(usedFixtureIds: Set<number>, deskDayStr: string): Promise<void> {
    const tipsters = await this.tipsterRepo.find({
      where: { tipsterType: ACCA_DESK_TIPSTER_TYPE },
      select: ['userId'],
    });
    const userIds = tipsters.map((t) => t.userId).filter((id): id is number => id != null);
    await this.addDeskDayFixtureIds(usedFixtureIds, userIds, deskDayStr);
  }

  private async addDeskDayFixtureIds(
    usedFixtureIds: Set<number>,
    userIds: number[],
    deskDayStr: string,
  ): Promise<void> {
    if (!userIds.length) return;
    const tickets = await this.findDeskDayTicketsForUsers(userIds, deskDayStr);
    if (!tickets.length) return;
    const picks = await this.pickRepo.find({
      where: { accumulatorId: In(tickets.map((t) => t.id)) },
      select: ['fixtureId'],
    });
    for (const p of picks) {
      if (p.fixtureId) usedFixtureIds.add(p.fixtureId);
    }
  }

  private async postedSlotsForDeskDay(tickets: AccumulatorTicket[]): Promise<Set<AccaDeskSlotKey>> {
    const slots = new Set<AccaDeskSlotKey>();
    if (!tickets.length) return slots;
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
    return slots;
  }

  private async findDeskDayTickets(userId: number, deskDayStr: string): Promise<AccumulatorTicket[]> {
    return this.findDeskDayTicketsForUsers([userId], deskDayStr);
  }

  private async findDeskDayTicketsForUsers(
    userIds: number[],
    deskDayStr: string,
  ): Promise<AccumulatorTicket[]> {
    const { start, end } = deskDayFixtureWindow(deskDayStr, this.predictionTimeZone());
    const createdFrom = new Date(start);
    createdFrom.setUTCDate(createdFrom.getUTCDate() - 1);
    const createdTo = new Date(end);
    createdTo.setUTCDate(createdTo.getUTCDate() + 1);

    const candidates = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.userId IN (:...userIds)', { userIds })
      .andWhere('t.createdAt >= :createdFrom', { createdFrom })
      .andWhere('t.createdAt < :createdTo', { createdTo })
      .andWhere("t.status NOT IN ('cancelled', 'void')")
      .andWhere("t.result NOT IN ('void', 'cancelled')")
      .orderBy('t.createdAt', 'ASC')
      .getMany();

    return candidates.filter((t) => deskDayFromTitle(t.title) === deskDayStr);
  }
}
