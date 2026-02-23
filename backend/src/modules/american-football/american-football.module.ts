import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { SportEventOdd } from '../sport-events/entities/sport-event-odd.entity';
import { OddsApiModule } from '../odds-api/odds-api.module';
import { AmericanFootballSyncService } from './american-football-sync.service';
import { AmericanFootballController } from './american-football.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SportEvent, SportEventOdd]), OddsApiModule],
  controllers: [AmericanFootballController],
  providers: [AmericanFootballSyncService],
  exports: [AmericanFootballSyncService],
})
export class AmericanFootballModule {}
