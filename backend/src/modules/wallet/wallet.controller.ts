import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { WalletService } from './wallet.service';
import { PaystackService } from './paystack.service';
import { WalletIapService } from './wallet-iap.service';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly paystackService: PaystackService,
    private readonly walletIapService: WalletIapService,
  ) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@CurrentUser() user: { id: number }) {
    return this.walletService.getBalance(user.id);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(@CurrentUser() user: { id: number }) {
    return this.walletService.getTransactions(user.id);
  }

  @Get('deposit/verify')
  @UseGuards(JwtAuthGuard)
  async verifyDeposit(@CurrentUser() user: { id: number }, @Query('ref') ref: string) {
    if (!ref) return { credited: false };
    return this.walletService.verifyDepositByRef(user.id, ref);
  }

  @Post('deposit/initialize')
  @UseGuards(JwtAuthGuard)
  async initializeDeposit(
    @CurrentUser() user: User,
    @Body() body: { amount: number },
  ) {
    return this.walletService.initializeDeposit(user, body.amount);
  }

  @Get('payout-methods')
  @UseGuards(JwtAuthGuard)
  async getPayoutMethods(@CurrentUser() user: { id: number }) {
    return this.walletService.getPayoutMethods(user.id);
  }

  @Post('payout-methods')
  @UseGuards(JwtAuthGuard)
  async addPayoutMethod(
    @CurrentUser() user: User,
    @Body()
    body: {
      type: 'mobile_money' | 'bank' | 'manual' | 'crypto';
      name: string;
      phone?: string;
      provider?: string;
      accountNumber?: string;
      bankCode?: string;
      country?: string;
      currency?: string;
      manualMethod?: 'mobile_money' | 'bank';
      bankName?: string;
      walletAddress?: string;
      cryptoCurrency?: string;
    },
  ) {
    return this.walletService.addPayoutMethod(user, body);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async requestWithdrawal(
    @CurrentUser() user: User,
    @Body() body: { amount: number },
  ) {
    return this.walletService.requestWithdrawal(user, body.amount);
  }

  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  async getWithdrawals(@CurrentUser() user: { id: number }) {
    return this.walletService.getWithdrawals(user.id);
  }

  @Get('iap/products')
  @UseGuards(JwtAuthGuard)
  getIapProducts() {
    return this.walletIapService.getProducts();
  }

  @Post('iap/verify')
  @UseGuards(JwtAuthGuard)
  async verifyIap(
    @CurrentUser() user: { id: number },
    @Body()
    body: {
      platform: 'ios' | 'android';
      productId: string;
      transactionId: string;
      receipt?: string;
      purchaseToken?: string;
    },
  ) {
    return this.walletIapService.verifyAndCredit(user.id, body);
  }

  @Post('paystack-webhook')
  async paystackWebhook(@Req() req: any) {
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    const signature = req.headers['x-paystack-signature'] || '';
    return this.walletService.handlePaystackWebhook(rawBody, signature);
  }
}
