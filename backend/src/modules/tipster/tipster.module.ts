import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipsterController } from './tipster.controller';
import { TipsterService } from './tipster.service';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccumulatorTicket, WalletTransaction]),
  ],
  controllers: [TipsterController],
  providers: [TipsterService],
  exports: [TipsterService], // Export so other modules can use it
})
export class TipsterModule {}
