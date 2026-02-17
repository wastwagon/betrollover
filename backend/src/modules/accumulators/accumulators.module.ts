import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccumulatorTicket } from './entities/accumulator-ticket.entity';
import { AccumulatorPick } from './entities/accumulator-pick.entity';
import { PickMarketplace } from './entities/pick-marketplace.entity';
import { EscrowFund } from './entities/escrow-fund.entity';
import { UserPurchasedPick } from './entities/user-purchased-pick.entity';
import { AccumulatorsController } from './accumulators.controller';
import { AccumulatorsService } from './accumulators.service';
import { SettlementService } from './settlement.service';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { FootballModule } from '../football/football.module';
import { TipsterModule } from '../tipster/tipster.module';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { User } from '../users/entities/user.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccumulatorTicket,
      AccumulatorPick,
      PickMarketplace,
      EscrowFund,
      UserPurchasedPick,
      Fixture,
      User,
      ApiSettings,
    ]),
    WalletModule,
    NotificationsModule,
    EmailModule,
    FootballModule,
    TipsterModule,
  ],
  controllers: [AccumulatorsController],
  providers: [AccumulatorsService, SettlementService],
  exports: [AccumulatorsService, SettlementService],
})
export class AccumulatorsModule {}
