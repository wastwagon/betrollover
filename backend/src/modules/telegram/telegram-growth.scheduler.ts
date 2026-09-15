import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isSchedulingEnabled } from '../email/scheduling-enabled';
import { TelegramChannelService } from './telegram-channel.service';

/**
 * Scheduled channel posts (Africa/Accra) — one job each:
 *  08:00 growth · 10:00 tipster recruit · 12:00 advice · 17:00 community · 19:00 growth
 * Tip/win alerts are event-driven (not here).
 */
@Injectable()
export class TelegramGrowthScheduler {
  private readonly logger = new Logger(TelegramGrowthScheduler.name);

  constructor(private readonly telegram: TelegramChannelService) {}

  /** Morning growth — discover free tips + join channel — default 08:00 */
  @Cron(process.env.TELEGRAM_GROWTH_CRON_MORNING || '0 8 * * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async morningGrowth(): Promise<void> {
    await this.runGrowth('morning');
  }

  /** Tipster recruit — register + invite tipster friends (earn via paid picks) — default 10:00 */
  @Cron(process.env.TELEGRAM_TIPSTER_RECRUIT_CRON || '0 10 * * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async morningTipsterRecruit(): Promise<void> {
    await this.runTipsterRecruit();
  }

  /** Midday advice — bankroll / stay-in-profit — default 12:00 */
  @Cron(process.env.TELEGRAM_ADVICE_CRON || '0 12 * * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async middayAdvice(): Promise<void> {
    await this.runAdvice('midday');
  }

  /** Community appeal — react meanings + share channel — default 17:00 */
  @Cron(process.env.TELEGRAM_COMMUNITY_APPEAL_CRON || '0 17 * * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async dailyCommunityAppeal(): Promise<void> {
    await this.runCommunityAppeal();
  }

  /** Evening growth — purchase protection + channel — default 19:00 */
  @Cron(process.env.TELEGRAM_GROWTH_CRON_EVENING || '0 19 * * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async eveningGrowth(): Promise<void> {
    await this.runGrowth('evening');
  }

  private async runGrowth(slot: 'morning' | 'evening'): Promise<void> {
    if (!isSchedulingEnabled()) return;
    if (!this.telegram.isConfigured()) return;
    const result = await this.telegram.postGrowthMessage(`${slot}-${new Date().toISOString().slice(0, 10)}`);
    if (result.ok) {
      this.logger.log(`Telegram growth post sent (${slot})`);
    } else if (result.error && result.error !== 'growth_disabled' && result.error !== 'disabled') {
      this.logger.warn(`Telegram growth post failed (${slot}): ${result.error}`);
    }
  }

  private async runAdvice(slot: string): Promise<void> {
    if (!isSchedulingEnabled()) return;
    if (!this.telegram.isConfigured()) return;
    const result = await this.telegram.postAdviceMessage(`${slot}-${new Date().toISOString().slice(0, 10)}`);
    if (result.ok) {
      this.logger.log(`Telegram advice post sent (${slot})`);
    } else if (result.error && result.error !== 'advice_disabled' && result.error !== 'disabled') {
      this.logger.warn(`Telegram advice post failed (${slot}): ${result.error}`);
    }
  }

  private async runCommunityAppeal(): Promise<void> {
    if (!isSchedulingEnabled()) return;
    if (!this.telegram.isConfigured()) return;
    const result = await this.telegram.postCommunityAppealMessage();
    if (result.ok) {
      this.logger.log('Telegram community appeal post sent');
    } else if (
      result.error &&
      result.error !== 'community_appeal_disabled' &&
      result.error !== 'disabled'
    ) {
      this.logger.warn(`Telegram community appeal failed: ${result.error}`);
    }
  }

  private async runTipsterRecruit(): Promise<void> {
    if (!isSchedulingEnabled()) return;
    if (!this.telegram.isConfigured()) return;
    const result = await this.telegram.postTipsterRecruitMessage();
    if (result.ok) {
      this.logger.log('Telegram tipster recruit post sent');
    } else if (
      result.error &&
      result.error !== 'tipster_recruit_disabled' &&
      result.error !== 'disabled'
    ) {
      this.logger.warn(`Telegram tipster recruit failed: ${result.error}`);
    }
  }
}
