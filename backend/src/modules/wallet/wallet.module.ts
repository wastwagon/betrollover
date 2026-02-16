import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { DepositRequest } from './entities/deposit-request.entity';
import { PayoutMethod } from './entities/payout-method.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { PaystackSettings } from './entities/paystack-settings.entity';
import { WalletService } from './wallet.service';
import { PaystackService } from './paystack.service';
import { WalletController } from './wallet.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    EmailModule,
    TypeOrmModule.forFeature([
      UserWallet,
      WalletTransaction,
      DepositRequest,
      PayoutMethod,
      WithdrawalRequest,
      PaystackSettings,
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, PaystackService],
  exports: [WalletService],
})
export class WalletModule {}
