import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { UserWallet } from '../wallet/entities/user-wallet.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { PickMarketplace } from '../accumulators/entities/pick-marketplace.entity';
import { EscrowFund } from '../accumulators/entities/escrow-fund.entity';
import { TipsterRequest } from '../users/entities/tipster-request.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { UserPurchasedPick } from '../accumulators/entities/user-purchased-pick.entity';
import { DepositRequest } from '../wallet/entities/deposit-request.entity';
import { WithdrawalRequest } from '../wallet/entities/withdrawal-request.entity';
import { PayoutMethod } from '../wallet/entities/payout-method.entity';
import { AdminController } from './admin.controller';
import { AnalyticsTrackingController } from './analytics-tracking.controller';
import { AdminService } from './admin.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTrackingService } from './analytics-tracking.service';
import { MigrationRunnerService } from './migration-runner.service';
import { SeedRunnerService } from './seed-runner.service';
import { PredictionEngineService } from '../predictions/prediction-engine.service';
import { PredictionsModule } from '../predictions/predictions.module';
import { AccumulatorsModule } from '../accumulators/accumulators.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContentModule } from '../content/content.module';
import { NewsModule } from '../news/news.module';
import { ResourcesModule } from '../resources/resources.module';
import { AdsModule } from '../ads/ads.module';
import { EmailModule } from '../email/email.module';
import { WalletModule } from '../wallet/wallet.module';
import { SmtpSettings } from '../email/entities/smtp-settings.entity';
import { ApiSettings } from './entities/api-settings.entity';
import { PaystackSettings } from '../wallet/entities/paystack-settings.entity';
import { VisitorSession } from './entities/visitor-session.entity';
import { AnalyticsDaily } from './entities/analytics-daily.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { Prediction } from '../predictions/entities/prediction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      SmtpSettings,
      ApiSettings,
      PaystackSettings,
      UserWallet,
      WalletTransaction,
      AccumulatorTicket,
      PickMarketplace,
      EscrowFund,
      TipsterRequest,
      Notification,
      UserPurchasedPick,
      DepositRequest,
      WithdrawalRequest,
      PayoutMethod,
      Tipster,
      Prediction,
      VisitorSession,
      AnalyticsDaily,
    ]),
    AccumulatorsModule,
    NotificationsModule,
    ContentModule,
    NewsModule,
    ResourcesModule,
    AdsModule,
    EmailModule,
    WalletModule,
    PredictionsModule,
  ],
  controllers: [AdminController, AnalyticsTrackingController],
  providers: [AdminService, AnalyticsService, AnalyticsTrackingService, MigrationRunnerService, SeedRunnerService],
  exports: [MigrationRunnerService, SeedRunnerService],
})
export class AdminModule {}
