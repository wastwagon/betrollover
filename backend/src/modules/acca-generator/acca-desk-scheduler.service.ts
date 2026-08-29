import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ACCA_DESK_DAILY_CRON,
  ACCA_DESK_EARLY_CRON,
  isAccaDeskEarlyPublishEnabled,
  isAccaDeskEnabled,
} from '../../config/acca-desk-tipsters.config';
import { accraDateStr, addDateStrDays } from '../../config/acca-desk-slots';
import { SyncStatus } from '../fixtures/entities/sync-status.entity';
import { SyncLockService } from '../fixtures/sync-lock.service';
import { AccaDeskPublisherService } from './acca-desk-publisher.service';
import {
  accraMinutesSinceMidnight,
  isSchedulingEnabled,
} from '../email/scheduling-enabled';

const PREDICTION_TIME_ZONE =
  process.env.PREDICTION_TIMEZONE || process.env.TIMEZONE || 'Africa/Accra';
const DESK_WINDOW_MINUTE = 30;
const BOOT_CATCHUP_MS = 25_000;

@Injectable()
export class AccaDeskSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AccaDeskSchedulerService.name);

  constructor(
    private readonly publisher: AccaDeskPublisherService,
    private readonly syncLock: SyncLockService,
    @InjectRepository(SyncStatus)
    private readonly syncStatusRepo: Repository<SyncStatus>,
  ) {}

  onModuleInit(): void {
    if (!isAccaDeskEnabled() || !isSchedulingEnabled()) {
      this.logger.warn(
        !isAccaDeskEnabled()
          ? 'Acca Desk is disabled (ACCA_DESK_ENABLED=false).'
          : 'Acca Desk cron is off (ENABLE_SCHEDULING=false).',
      );
      return;
    }
    setTimeout(() => {
      void this.catchUpIfDue('boot');
    }, BOOT_CATCHUP_MS);
  }

  /** 20:00 Africa/Accra — publish tomorrow’s full desk day (~24h ahead). */
  @Cron(ACCA_DESK_EARLY_CRON, { timeZone: PREDICTION_TIME_ZONE })
  async handleEarlyTomorrow(): Promise<void> {
    if (!isAccaDeskEarlyPublishEnabled()) {
      this.logger.debug('Acca Desk early publish skipped (ACCA_DESK_EARLY_ENABLED=false)');
      return;
    }
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    const tomorrow = addDateStrDays(today, 1);
    await this.runLocked('20:00 early', tomorrow, 'acca_desk_early');
  }

  /** 00:30 Africa/Accra — catch-up for today’s desk day after midnight. */
  @Cron(ACCA_DESK_DAILY_CRON, { timeZone: PREDICTION_TIME_ZONE })
  async handleDaily(): Promise<void> {
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    await this.runLocked('00:30 catch-up', today, 'acca_desk');
  }

  /** Fixtures/odds often land after 00:30 — fill empty slots without waiting for an admin click. */
  @Cron('0 6 * * *', { timeZone: PREDICTION_TIME_ZONE })
  async handleMorningCatchup(): Promise<void> {
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    await this.runLocked('06:00 catch-up', today, 'acca_desk');
  }

  /** Last fill before the 09:00 marketing digest. */
  @Cron('45 8 * * *', { timeZone: PREDICTION_TIME_ZONE })
  async handlePreDigestCatchup(): Promise<void> {
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    await this.runLocked('08:45 catch-up', today, 'acca_desk');
  }

  private async catchUpIfDue(reason: string): Promise<void> {
    if (!isAccaDeskEnabled() || !isSchedulingEnabled()) return;
    const minutes = accraMinutesSinceMidnight(new Date(), PREDICTION_TIME_ZONE);
    if (minutes < DESK_WINDOW_MINUTE) return;
    const today = accraDateStr(new Date(), PREDICTION_TIME_ZONE);
    await this.runLocked(`${reason} catch-up`, today, 'acca_desk');
  }

  private async runLocked(
    label: string,
    deskDayStr: string,
    syncType: 'acca_desk' | 'acca_desk_early',
  ): Promise<void> {
    if (!isAccaDeskEnabled()) {
      this.logger.debug(`Acca Desk skipped (${label}, disabled)`);
      return;
    }
    if (!isSchedulingEnabled()) {
      this.logger.debug(`Acca Desk skipped (${label}, ENABLE_SCHEDULING off)`);
      return;
    }

    // Share one lock so early + catch-up never overlap.
    if (!(await this.syncLock.tryStartSync('acca_desk'))) {
      this.logger.warn(`Acca Desk skipped (${label}) — already running`);
      return;
    }

    try {
      this.logger.log(
        `Acca Desk starting (${label}, deskDay=${deskDayStr}, ${PREDICTION_TIME_ZONE})`,
      );
      const result = await this.publisher.runDaily({
        ensureSetup: true,
        deskDayStr,
      });
      // Always clear the shared `acca_desk` lock row.
      await this.syncStatusRepo.upsert(
        {
          syncType: 'acca_desk',
          status: 'success',
          lastSyncAt: new Date(),
          lastSyncCount: result.published,
          lastError: null,
        },
        ['syncType'],
      );
      if (syncType === 'acca_desk_early') {
        await this.syncStatusRepo.upsert(
          {
            syncType: 'acca_desk_early',
            status: 'success',
            lastSyncAt: new Date(),
            lastSyncCount: result.published,
            lastError: null,
          },
          ['syncType'],
        );
      }
      this.logger.log(
        `Acca Desk done (${label}): published=${result.published} empty=${result.skippedEmptyPool} errors=${result.errors}`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Acca Desk failed (${label}): ${message}`);
      await this.syncStatusRepo.upsert(
        {
          syncType: 'acca_desk',
          status: 'error',
          lastError: message,
        },
        ['syncType'],
      );
      if (syncType === 'acca_desk_early') {
        await this.syncStatusRepo.upsert(
          {
            syncType: 'acca_desk_early',
            status: 'error',
            lastError: message,
          },
          ['syncType'],
        );
      }
    }
  }
}
