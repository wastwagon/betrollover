import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { SportEventOdd } from '../sport-events/entities/sport-event-odd.entity';
import { OddsApiModule } from '../odds-api/odds-api.module';
import { RugbySyncService } from './rugby-sync.service';
import { RugbyController } from './rugby.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SportEvent, SportEventOdd]), OddsApiModule],
  controllers: [RugbyController],
  providers: [RugbySyncService],
  exports: [RugbySyncService],
})
export class RugbyModule {}
