import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tipster } from '../predictions/entities/tipster.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramVipMembership } from './entities/telegram-vip-membership.entity';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramEligibilityService } from './telegram-eligibility.service';
import { TelegramGrowthScheduler } from './telegram-growth.scheduler';
import { TelegramVipService } from './telegram-vip.service';
import { TelegramVipScheduler } from './telegram-vip.scheduler';
import { TelegramWebhookController } from './telegram-webhook.controller';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      Tipster,
      ApiSettings,
      User,
      Subscription,
      TelegramVipMembership,
      AccumulatorTicket,
      AccumulatorPick,
    ]),
  ],
  controllers: [TelegramWebhookController],
  providers: [
    TelegramChannelService,
    TelegramEligibilityService,
    TelegramGrowthScheduler,
    TelegramVipService,
    TelegramVipScheduler,
  ],
  exports: [TelegramChannelService, TelegramEligibilityService, TelegramVipService],
})
export class TelegramModule {}
