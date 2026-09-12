import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isSchedulingEnabled } from '../email/scheduling-enabled';
import { TelegramChannelService } from './telegram-channel.service';

/**
 * Twice-daily growth posts (Africa/Accra) — invite / react / forward.
 * Separate from pick alerts so tips stay clean.
 */
@Injectable()
export class TelegramGrowthScheduler {
  private readonly logger = new Logger(TelegramGrowthScheduler.name);

  constructor(private readonly telegram: TelegramChannelService) {}

  /** Morning growth — default 08:00 Africa/Accra */
  @Cron(process.env.TELEGRAM_GROWTH_CRON_MORNING || '0 8 * * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async morningGrowth(): Promise<void> {
    await this.run('morning');
  }

  /** Evening growth — default 19:00 Africa/Accra */
  @Cron(process.env.TELEGRAM_GROWTH_CRON_EVENING || '0 19 * * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async eveningGrowth(): Promise<void> {
    await this.run('evening');
  }

  private async run(slot: 'morning' | 'evening'): Promise<void> {
    if (!isSchedulingEnabled()) return;
    if (!this.telegram.isConfigured()) return;
    const result = await this.telegram.postGrowthMessage(`${slot}-${new Date().toISOString().slice(0, 10)}`);
    if (result.ok) {
      this.logger.log(`Telegram growth post sent (${slot})`);
    } else if (result.error && result.error !== 'growth_disabled' && result.error !== 'disabled') {
      this.logger.warn(`Telegram growth post failed (${slot}): ${result.error}`);
    }
  }
}
