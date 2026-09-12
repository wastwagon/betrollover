import { Module } from '@nestjs/common';
import { TelegramChannelService } from './telegram-channel.service';

@Module({
  providers: [TelegramChannelService],
  exports: [TelegramChannelService],
})
export class TelegramModule {}
