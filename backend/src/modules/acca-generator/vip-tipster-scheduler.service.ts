import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VIP_TIPSTER_DAILY_CRON,
  VIP_TIPSTER_EARLY_CRON,
  isVipTipsterEnabled,
} from '../../config/vip-tipster.config';
import { accraDateStr, addDateStrDays } from '../../config/acca-desk-slots';
import { isSubscriptionsEnabled } from '../../common/subscriptions-enabled';
import { SyncStatus } from '../fixtures/entities/sync-status.entity';
import { SyncLockService } from '../fixtures/sync-lock.service';
import { VipTipsterPublisherService } from './vip-tipster-publisher.service';
import { isSchedulingEnabled } from '../email/scheduling-enabled';

const PREDICTION_TIME_ZONE =
  process.env.PREDICTION_TIMEZONE || process.env.TIMEZONE || 'Africa/Accra';
const BOOT_CATCHUP_MS = 20_000;

@Injectable()
export class VipTipsterSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(VipTipsterSchedulerService.name);

  constructor(
    private readonly publisher: VipTipsterPublisherService,
    private readonly syncLock: SyncLockService,
    @InjectRepository(SyncStatus)
    private readonly syncStatusRepo: Repository<SyncStatus>,
  ) {}

  onModuleInit(): void {
    if (!isVipTipsterEnabled() || !isSchedulingEnabled() || !isSubscriptionsEnabled()) {
      this.logger.warn(
        !isVipTipsterEnabled()
          ? 'VIP tipster is disabled (VIP_TIPSTER_ENABLED=false).'
          : !isSubscriptionsEnabled()
            ? 'VIP tipster cron is off (SUBSCRIPTIONS_ENABLED=false).'
            : 'VIP tipster cron is off (ENABLE_SCHEDULING=false).',
      );
      return;
    }
    setTimeout(() => {
      void this.catchUpIfDue();
    }, BOOT_CATCHUP_MS);
  }

  /** 20:00 Africa/Accra — tomorrow’s VIP slips (~24h ahead), before Acca Desk 20:10. */
  @Cron(VIP_TIPSTER_EARLY_CRON, { timeZone: PREDICTION_TIME_ZONE })
  async handleEarlyTomorrow(): Promise<void> {
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    const tomorrow = addDateStrDays(today, 1);
    await this.runLocked('20:00 early', tomorrow, 'vip_desk_early');
  }

  /** 00:20 Africa/Accra — today’s remaining VIP slots, before Acca Desk 00:30. */
  @Cron(VIP_TIPSTER_DAILY_CRON, { timeZone: PREDICTION_TIME_ZONE })
  async handleMidnightCatchup(): Promise<void> {
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    await this.runLocked('00:20 catch-up', today, 'vip_desk');
  }

  /** Before Acca Desk 06:00 — claim new homes from overnight odds. */
  @Cron('50 5 * * *', { timeZone: PREDICTION_TIME_ZONE })
  async handleDawnCatchup(): Promise<void> {
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    await this.runLocked('05:50 catch-up', today, 'vip_desk');
  }

  /** Before Acca Desk 08:45 — last VIP fill of the morning. */
  @Cron('35 8 * * *', { timeZone: PREDICTION_TIME_ZONE })
  async handleMorningCatchup(): Promise<void> {
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    await this.runLocked('08:35 catch-up', today, 'vip_desk');
  }

  private async catchUpIfDue(): Promise<void> {
    if (!isVipTipsterEnabled() || !isSchedulingEnabled() || !isSubscriptionsEnabled()) return;
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    await this.runLocked('boot catch-up', today, 'vip_desk');
  }

  private async runLocked(
    label: string,
    deskDayStr: string,
    syncType: 'vip_desk' | 'vip_desk_early',
  ): Promise<void> {
    if (!isVipTipsterEnabled() || !isSchedulingEnabled() || !isSubscriptionsEnabled()) return;

    if (!(await this.syncLock.tryStartSync('vip_desk'))) {
      this.logger.warn(`VIP tipster skipped (${label}) — already running`);
      return;
    }

    try {
      this.logger.log(`VIP tipster starting (${label}, deskDay=${deskDayStr})`);
      const result = await this.publisher.runDaily({ ensureSetup: true, deskDayStr });
      await this.syncStatusRepo.upsert(
        {
          syncType: 'vip_desk',
          status: 'success',
          lastSyncAt: new Date(),
          lastSyncCount: result.published,
          lastError: null,
        },
        ['syncType'],
      );
      if (syncType === 'vip_desk_early') {
        await this.syncStatusRepo.upsert(
          {
            syncType: 'vip_desk_early',
            status: 'success',
            lastSyncAt: new Date(),
            lastSyncCount: result.published,
            lastError: null,
          },
          ['syncType'],
        );
      }
      this.logger.log(
        `VIP tipster done (${label}): published=${result.published} empty=${result.skippedEmptyPool} errors=${result.errors}`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`VIP tipster failed (${label}): ${message}`);
      await this.syncStatusRepo.upsert(
        {
          syncType: 'vip_desk',
          status: 'error',
          lastError: message,
        },
        ['syncType'],
      );
    }
  }
}
