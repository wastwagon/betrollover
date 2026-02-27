import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OddsApiService } from './odds-api.service';
import { OddsApiSettlementService } from './odds-api-settlement.service';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { AccumulatorsModule } from '../accumulators/accumulators.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SportEvent]),
    AccumulatorsModule,
  ],
  providers: [OddsApiService, OddsApiSettlementService],
  exports: [OddsApiService, OddsApiSettlementService],
})
export class OddsApiModule {}
