import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccumulatorTicket } from './entities/accumulator-ticket.entity';
import { AccumulatorPick } from './entities/accumulator-pick.entity';
import { PickMarketplace } from './entities/pick-marketplace.entity';
import { PickReaction } from './entities/pick-reaction.entity';
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
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { User } from '../users/entities/user.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { TipsterFollow } from '../predictions/entities/tipster-follow.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccumulatorTicket,
      AccumulatorPick,
      PickMarketplace,
      PickReaction,
      EscrowFund,
      UserPurchasedPick,
      Fixture,
      User,
      ApiSettings,
      Tipster,
      TipsterFollow,
    ]),
    WalletModule,
    NotificationsModule,
    EmailModule,
    FootballModule,
    TipsterModule,
    SubscriptionsModule,
  ],
  controllers: [AccumulatorsController],
  providers: [AccumulatorsService, SettlementService],
  exports: [AccumulatorsService, SettlementService],
})
export class AccumulatorsModule {}
