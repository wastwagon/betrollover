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
import { accraDateStr, deskDayFromTitle, deskDayFixtureWindow } from '../../config/acca-desk-slots';
import { isSubscriptionsEnabled } from '../../common/subscriptions-enabled';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
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
    const tickets = tipster?.userId ? await this.findDeskDayTickets(tipster.userId, todayDesk) : [];
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

    const sync = await this.syncStatusRepo.findOne({ where: { syncType: 'vip_desk' } });
    const earlySync = await this.syncStatusRepo.findOne({ where: { syncType: 'vip_desk_early' } });

    return {
      enabled: isVipTipsterEnabled(),
      subscriptionsEnabled: isSubscriptionsEnabled(),
      cron: VIP_TIPSTER_DAILY_CRON,
      earlyCron: VIP_TIPSTER_EARLY_CRON,
      timezone: tz,
      todayDeskDay: todayDesk,
      maxPerDay: VIP_MAX_COUPONS_PER_DAY,
      username: VIP_TIPSTER.username,
      displayName: VIP_TIPSTER.display_name,
      setup: !!tipster,
      isActive: tipster?.isActive ?? false,
      userId: tipster?.userId ?? null,
      packageId: pkg?.id ?? null,
      packageName: pkg?.name ?? null,
      packagePrice: pkg ? Number(pkg.price) : null,
      todayPublished: tickets.length,
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
      todayTickets: tickets.map((t) => ({
        id: t.id,
        title: t.title,
        totalOdds: Number(t.totalOdds),
        totalPicks: Number(t.totalPicks),
        status: t.status,
        createdAt: t.createdAt?.toISOString?.() || String(t.createdAt),
        legs: (picksByTicket.get(t.id) || []).map((p) => ({
          matchDescription: p.matchDescription,
          prediction: p.prediction,
          odds: Number(p.odds),
        })),
      })),
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
    if (existing.length) {
      const existingPicks = await this.pickRepo.find({
        where: { accumulatorId: In(existing.map((t) => t.id)) },
        select: ['fixtureId'],
      });
      for (const p of existingPicks) {
        if (p.fixtureId) usedFixtureIds.add(p.fixtureId);
      }
    }

    const result: VipTipsterRunResult = {
      enabled: true,
      deskDay: deskDayStr,
      published: 0,
      skippedAlreadyPosted: existing.length,
      skippedEmptyPool: 0,
      skippedNoUser: 0,
      errors: 0,
      details: [],
    };

    let lastConstruction: VipConstructionKey | undefined;
    const remaining = Math.max(0, VIP_MAX_COUPONS_PER_DAY - existing.length);
    for (let i = 0; i < remaining; i++) {
      const prefer: VipConstructionKey =
        lastConstruction === 'home_draw' ? 'brazil_over15' : 'home_draw';
      try {
        const generated = await this.accaGenerator.generateForVip({
          userId: tipster.userId,
          excludeFixtureIds: usedFixtureIds,
          deskDayStr,
          preferConstruction: prefer,
        });
        if (!generated.ok) {
          result.skippedEmptyPool++;
          result.details.push({ status: 'empty_pool', message: `prefer=${prefer}` });
          break;
        }

        const title =
          `${VIP_TIPSTER.display_name} · ${generated.constructionLabel} · 2-fold @ ${generated.combinedOdds} · ${deskDayStr}`.slice(
            0,
            255,
          );
        const description = (
          `${VIP_TIPSTER.bio} ${generated.constructionLabel} · ${deskDayStr}. VIP subscribers only.`
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
        lastConstruction = generated.construction;

        const ticketId = Number(
          (published as { publishedTicketId?: number })?.publishedTicketId ??
            (published as { ticket?: { id?: number } })?.ticket?.id,
        );
        result.published++;
        result.details.push({
          status: 'published',
          ticketId: Number.isFinite(ticketId) ? ticketId : undefined,
          construction: generated.construction,
        });
        this.logger.log(
          `VIP published ${generated.construction} deskDay=${deskDayStr} ticket=#${ticketId} odds=${generated.combinedOdds}`,
        );
      } catch (err: unknown) {
        result.errors++;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`VIP publish failed deskDay=${deskDayStr}: ${message}`);
        result.details.push({ status: 'error', message });
        break;
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

  private async findDeskDayTickets(userId: number, deskDayStr: string): Promise<AccumulatorTicket[]> {
    const { start, end } = deskDayFixtureWindow(deskDayStr, this.predictionTimeZone());
    const createdFrom = new Date(start);
    createdFrom.setUTCDate(createdFrom.getUTCDate() - 1);
    const createdTo = new Date(end);
    createdTo.setUTCDate(createdTo.getUTCDate() + 1);

    const candidates = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .andWhere('t.createdAt >= :createdFrom', { createdFrom })
      .andWhere('t.createdAt < :createdTo', { createdTo })
      .orderBy('t.createdAt', 'ASC')
      .getMany();

    return candidates.filter((t) => deskDayFromTitle(t.title) === deskDayStr);
  }
}
