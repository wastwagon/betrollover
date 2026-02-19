import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipsterSubscriptionPackage } from './entities/tipster-subscription-package.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionEscrow } from './entities/subscription-escrow.entity';
import { SubscriptionCouponAccess } from './entities/subscription-coupon-access.entity';
import { RoiGuaranteeRefund } from './entities/roi-guarantee-refund.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionSettlementService } from './subscription-settlement.service';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([
      TipsterSubscriptionPackage,
      Subscription,
      SubscriptionEscrow,
      SubscriptionCouponAccess,
      RoiGuaranteeRefund,
      Tipster,
    ]),
    WalletModule,
    NotificationsModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionSettlementService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
