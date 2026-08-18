import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketingCampaignService } from './marketing-campaign.service';
import { accraMinutesSinceMidnight, isSchedulingEnabled } from './scheduling-enabled';

const TZ = process.env.PREDICTION_TIMEZONE || 'Africa/Accra';
const MARKETING_WINDOW_MINUTE = 9 * 60;
const BOOT_CATCHUP_MS = 20_000;

@Injectable()
export class MarketingCampaignScheduler implements OnModuleInit {
  private readonly logger = new Logger(MarketingCampaignScheduler.name);

  constructor(private readonly campaigns: MarketingCampaignService) {}

  onModuleInit(): void {
    if (!isSchedulingEnabled()) {
      this.logger.warn('Daily marketing cron is off (ENABLE_SCHEDULING=false). Product emails will not send until it is on.');
      return;
    }
    setTimeout(() => {
      void this.catchUpIfDue('boot');
    }, BOOT_CATCHUP_MS);
  }

  /** 09:00 Africa/Accra — welcome, Monday recap, digest, then quiet 7/14d. */
  @Cron('0 9 * * *', { timeZone: TZ })
  async handleDailyPromos(): Promise<void> {
    await this.runIfScheduling('09:00');
  }

  @Cron('20 9 * * *', { timeZone: TZ })
  async handleMorningCatchup(): Promise<void> {
    await this.runIfScheduling('09:20 catch-up');
  }

  @Cron('0 12 * * *', { timeZone: TZ })
  async handleNoonCatchup(): Promise<void> {
    await this.runIfScheduling('12:00 catch-up');
  }

  @Cron('0 18 * * *', { timeZone: TZ })
  async handleEveningCatchup(): Promise<void> {
    await this.runIfScheduling('18:00 catch-up');
  }

  private async runIfScheduling(label: string): Promise<void> {
    if (!isSchedulingEnabled()) {
      this.logger.debug(`Daily marketing skipped (${label}, ENABLE_SCHEDULING off)`);
      return;
    }
    this.logger.log(`Daily marketing starting (${label}, ${TZ})`);
    await this.campaigns.runDailyPromos();
  }

  private async catchUpIfDue(reason: string): Promise<void> {
    if (!isSchedulingEnabled()) return;
    const minutes = accraMinutesSinceMidnight(new Date(), TZ);
    if (minutes < MARKETING_WINDOW_MINUTE) return;
    this.logger.log(`Daily marketing catch-up (${reason}) after 09:00 ${TZ}`);
    await this.campaigns.runDailyPromos();
  }
}
