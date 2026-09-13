import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TelegramVipService } from './telegram-vip.service';

@Injectable()
export class TelegramVipScheduler {
  private readonly logger = new Logger(TelegramVipScheduler.name);

  constructor(private readonly vip: TelegramVipService) {}

  /** After period-end payout (03:00 Accra) — drop expired VIP Telegram members. */
  @Cron('15 3 * * *', { timeZone: process.env.PREDICTION_TIMEZONE || process.env.TIMEZONE || 'Africa/Accra' })
  async kickExpiredNightly() {
    if (process.env.ENABLE_SCHEDULING === 'false') return;
    try {
      const result = await this.vip.kickExpired();
      if (result.kicked || result.errors) {
        this.logger.log(`VIP Telegram kick: kicked=${result.kicked} errors=${result.errors}`);
      }
    } catch (e) {
      this.logger.error(`VIP Telegram kick failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
