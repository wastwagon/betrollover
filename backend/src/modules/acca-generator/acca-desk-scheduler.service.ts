import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ACCA_DESK_DAILY_CRON,
  isAccaDeskEnabled,
} from '../../config/acca-desk-tipsters.config';
import { SyncStatus } from '../fixtures/entities/sync-status.entity';
import { SyncLockService } from '../fixtures/sync-lock.service';
import { AccaDeskPublisherService } from './acca-desk-publisher.service';

const PREDICTION_TIME_ZONE =
  process.env.PREDICTION_TIMEZONE || process.env.TIMEZONE || 'Africa/Accra';

@Injectable()
export class AccaDeskSchedulerService {
  private readonly logger = new Logger(AccaDeskSchedulerService.name);

  constructor(
    private readonly publisher: AccaDeskPublisherService,
    private readonly syncLock: SyncLockService,
    @InjectRepository(SyncStatus)
    private readonly syncStatusRepo: Repository<SyncStatus>,
  ) {}

  /** 00:30 Africa/Accra — new calendar day after midnight fixture/odds sync. */
  @Cron(ACCA_DESK_DAILY_CRON, { timeZone: PREDICTION_TIME_ZONE })
  async handleDaily(): Promise<void> {
    if (!isAccaDeskEnabled()) {
      this.logger.debug('Acca Desk cron skipped (disabled)');
      return;
    }
    if (process.env.ENABLE_SCHEDULING === 'false' || process.env.ENABLE_SCHEDULING === '0') {
      this.logger.debug('Acca Desk cron skipped (ENABLE_SCHEDULING off)');
      return;
    }

    if (!(await this.syncLock.tryStartSync('acca_desk'))) {
      this.logger.warn('Acca Desk cron skipped — already running');
      return;
    }

    try {
      this.logger.log(`Acca Desk daily cron starting (${PREDICTION_TIME_ZONE})`);
      const result = await this.publisher.runDaily({ ensureSetup: true });
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
      this.logger.log(
        `Acca Desk cron done: published=${result.published} empty=${result.skippedEmptyPool} errors=${result.errors}`,
      );
    } catch (err: any) {
      const message = err?.message || String(err);
      this.logger.error(`Acca Desk cron failed: ${message}`);
      await this.syncStatusRepo.upsert(
        {
          syncType: 'acca_desk',
          status: 'error',
          lastError: message,
        },
        ['syncType'],
      );
    }
  }
}
