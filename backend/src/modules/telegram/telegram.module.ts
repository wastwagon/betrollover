import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tipster } from '../predictions/entities/tipster.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramEligibilityService } from './telegram-eligibility.service';
import { TelegramGrowthScheduler } from './telegram-growth.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Tipster, ApiSettings])],
  providers: [TelegramChannelService, TelegramEligibilityService, TelegramGrowthScheduler],
  exports: [TelegramChannelService, TelegramEligibilityService],
})
export class TelegramModule {}
