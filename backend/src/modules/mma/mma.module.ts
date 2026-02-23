import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { SportEventOdd } from '../sport-events/entities/sport-event-odd.entity';
import { OddsApiModule } from '../odds-api/odds-api.module';
import { MmaSyncService } from './mma-sync.service';
import { MmaController } from './mma.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SportEvent, SportEventOdd]), OddsApiModule],
  controllers: [MmaController],
  providers: [MmaSyncService],
  exports: [MmaSyncService],
})
export class MmaModule {}
