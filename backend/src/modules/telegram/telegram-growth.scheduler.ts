import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isSchedulingEnabled } from '../email/scheduling-enabled';
import { TelegramChannelService } from './telegram-channel.service';

/**
 * Scheduled channel promo posts (Africa/Accra) — once per new month by default:
 *  day 1 · 08:00 growth · 12:00 advice · 17:00 community
 * Evening growth and tipster recruit stay off unless their env flags are turned on.
 * Tip/win alerts and VIP Two-Fold slips are event-driven (not here).
 */
@Injectable()
export class TelegramGrowthScheduler {
  private readonly logger = new Logger(TelegramGrowthScheduler.name);

  constructor(private readonly telegram: TelegramChannelService) {}

  /** Monthly growth — discover free tips + VIP invite — default 08:00 on day 1 */
  @Cron(process.env.TELEGRAM_GROWTH_CRON_MORNING || '0 8 1 * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async morningGrowth(): Promise<void> {
    await this.runGrowth('morning');
  }

  /** Tipster recruit — off unless TELEGRAM_TIPSTER_RECRUIT_ENABLED=true */
  @Cron(process.env.TELEGRAM_TIPSTER_RECRUIT_CRON || '0 10 1 * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async morningTipsterRecruit(): Promise<void> {
    await this.runTipsterRecruit();
  }

  /** Monthly advice — bankroll / stay-in-profit — default 12:00 on day 1 */
  @Cron(process.env.TELEGRAM_ADVICE_CRON || '0 12 1 * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async middayAdvice(): Promise<void> {
    await this.runAdvice('midday');
  }

  /** Monthly community appeal — react meanings + share channel — default 17:00 on day 1 */
  @Cron(process.env.TELEGRAM_COMMUNITY_APPEAL_CRON || '0 17 1 * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async dailyCommunityAppeal(): Promise<void> {
    await this.runCommunityAppeal();
  }

  /** Evening growth — off unless TELEGRAM_GROWTH_EVENING_ENABLED=true */
  @Cron(process.env.TELEGRAM_GROWTH_CRON_EVENING || '0 19 1 * *', {
    timeZone: process.env.PREDICTION_TIMEZONE || 'Africa/Accra',
  })
  async eveningGrowth(): Promise<void> {
    if (!this.telegram.eveningGrowthEnabled()) return;
    await this.runGrowth('evening');
  }

  private async runGrowth(slot: 'morning' | 'evening'): Promise<void> {
    if (!isSchedulingEnabled()) return;
    if (!this.telegram.isConfigured()) return;
    const result = await this.telegram.postGrowthMessage(`${slot}-${new Date().toISOString().slice(0, 7)}`);
    if (result.ok) {
      this.logger.log(`Telegram growth post sent (${slot})`);
    } else if (result.error && result.error !== 'growth_disabled' && result.error !== 'disabled') {
      this.logger.warn(`Telegram growth post failed (${slot}): ${result.error}`);
    }
  }

  private async runAdvice(slot: string): Promise<void> {
    if (!isSchedulingEnabled()) return;
    if (!this.telegram.isConfigured()) return;
    const result = await this.telegram.postAdviceMessage(`${slot}-${new Date().toISOString().slice(0, 7)}`);
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
