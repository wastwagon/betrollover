import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { SportEventOdd } from '../sport-events/entities/sport-event-odd.entity';
import { OddsApiModule } from '../odds-api/odds-api.module';
import { BasketballSyncService } from './basketball-sync.service';
import { BasketballController } from './basketball.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SportEvent, SportEventOdd]), OddsApiModule],
  controllers: [BasketballController],
  providers: [BasketballSyncService],
  exports: [BasketballSyncService],
})
export class BasketballModule {}
