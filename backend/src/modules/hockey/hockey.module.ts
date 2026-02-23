import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { SportEventOdd } from '../sport-events/entities/sport-event-odd.entity';
import { OddsApiModule } from '../odds-api/odds-api.module';
import { HockeySyncService } from './hockey-sync.service';
import { HockeyController } from './hockey.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SportEvent, SportEventOdd]), OddsApiModule],
  controllers: [HockeyController],
  providers: [HockeySyncService],
  exports: [HockeySyncService],
})
export class HockeyModule {}
