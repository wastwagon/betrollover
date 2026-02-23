import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { SportEventOdd } from '../sport-events/entities/sport-event-odd.entity';
import { OddsApiModule } from '../odds-api/odds-api.module';
import { TennisApiService } from './tennis-api.service';
import { TennisSyncService } from './tennis-sync.service';
import { TennisController } from './tennis.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SportEvent, SportEventOdd]), OddsApiModule],
  controllers: [TennisController],
  providers: [TennisApiService, TennisSyncService],
  exports: [TennisSyncService],
})
export class TennisModule {}
