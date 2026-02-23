import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { DepositRequest } from './entities/deposit-request.entity';
import { PayoutMethod } from './entities/payout-method.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { PaystackService } from './paystack.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(UserWallet)
    private readonly walletRepo: Repository<UserWallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    @InjectRepository(DepositRequest)
    private readonly depositRepo: Repository<DepositRequest>,
    @InjectRepository(PayoutMethod)
    private readonly payoutRepo: Repository<PayoutMethod>,
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRepo: Repository<WithdrawalRequest>,
    private readonly paystackService: PaystackService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) { }

  async getOrCreateWallet(userId: number, manager?: EntityManager): Promise<UserWallet> {
    const repo = manager ? manager.getRepository(UserWallet) : this.walletRepo;
    let wallet = await repo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = repo.create({
        userId,
        balance: 0,
        currency: 'GHS',
        status: 'active',
      });
      await repo.save(wallet);
    }
    return wallet;
  }

  async getBalance(userId: number): Promise<{ balance: number; currency: string }> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: Number(wallet.balance),
      currency: wallet.currency,
    };
  }

  async getTransactions(userId: number, limit = 50) {
    return this.txRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(100, limit),
      select: ['id', 'type', 'amount', 'currency', 'status', 'description', 'reference', 'createdAt'],
    });
  }

  async debit(
    userId: number,
    amount: number,
    type: string,
    reference?: string,
    description?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const wRepo = manager ? manager.getRepository(UserWallet) : this.walletRepo;
    const tRepo = manager ? manager.getRepository(WalletTransaction) : this.txRepo;

    const wallet = await this.getOrCreateWallet(userId, manager);
    const bal = Number(wallet.balance);
    if (bal < amount) {
      throw new BadRequestException('Insufficient balance');
    }
    wallet.balance = Number((bal - amount).toFixed(2));
    await wRepo.save(wallet);
    await tRepo.save({
      userId,
      type,
      amount: -amount,
      currency: 'GHS',
      status: 'completed',
      reference: reference ?? null,
      description: description ?? null,
    });
  }

  async credit(
    userId: number,
    amount: number,
    type: string,
    reference?: string,
    description?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const wRepo = manager ? manager.getRepository(UserWallet) : this.walletRepo;
    const tRepo = manager ? manager.getRepository(WalletTransaction) : this.txRepo;

    const wallet = await this.getOrCreateWallet(userId, manager);
    wallet.balance = Number((Number(wallet.balance) + amount).toFixed(2));
    await wRepo.save(wallet);
    await tRepo.save({
      userId,
      type,
      amount,
      currency: 'GHS',
      status: 'completed',
      reference: reference ?? null,
      description: description ?? null,
    });
  }

  /**
   * Records a wallet_transaction row without modifying any wallet balance.
   * Used for informational entries such as the platform commission deducted from
   * a tipster's gross payout — the actual balance impact is already captured
   * by the reduced payout amount passed to credit().
   */
  async recordTransaction(
    userId: number,
    amount: number,
    type: string,
    reference?: string,
    description?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.txRepo.save({
      userId,
      type,
      amount,
      currency: 'GHS',
      status: 'completed',
      reference: reference ?? null,
      description: description ?? null,
      metadata: metadata ?? null,
    });
  }

  async initializeDeposit(user: User, amount: number) {
    const { emailVerifiedAt } = await this.usersService.getEmailVerificationStatus(user.id);
    if (!emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email before making a deposit.');
    }
    if (amount < 1 || amount > 10000) {
      throw new BadRequestException('Amount must be between GHS 1 and GHS 10,000');
    }
    const reference = this.paystackService.generateReference();
    const appUrl = this.config.get('APP_URL') || process.env.APP_URL || 'http://localhost:6002';
    const callbackUrl = `${appUrl}/wallet?deposit=success&ref=${reference}`;

    const data = await this.paystackService.initializeTransaction({
      email: user.email,
      amount,
      reference,
      callbackUrl,
      metadata: { userId: user.id },
    });

    await this.depositRepo.save({
      userId: user.id,
      reference,
      amount,
      currency: 'GHS',
      status: 'pending',
    });

    return {
      authorizationUrl: data.authorization_url,
      accessCode: data.access_code,
      reference,
    };
  }

  /**
   * Verify deposit by reference (callback fallback when webhook is slow or unreachable).
   * Credits wallet if payment succeeded and not yet processed.
   */
  async verifyDepositByRef(userId: number, reference: string): Promise<{ credited: boolean; amount?: number }> {
    const deposit = await this.depositRepo.findOne({ where: { reference, userId } });
    if (!deposit) {
      return { credited: false };
    }
    if (deposit.status === 'completed') {
      const tx = await this.txRepo.findOne({
        where: { userId, reference, type: 'deposit' },
        order: { createdAt: 'DESC' },
      });
      return { credited: true, amount: tx ? Number(tx.amount) : undefined };
    }

    const verify = await this.paystackService.verifyTransaction(reference);
    if (!verify || verify.status !== 'success') {
      return { credited: false };
    }

    const amount = Number(verify.amount) / 100; // pesewas to GHS
    deposit.status = 'completed';
    deposit.paystackReference = verify.id || null;
    await this.depositRepo.save(deposit);

    await this.credit(userId, amount, 'deposit', reference, 'Wallet deposit via Paystack');

    await this.notificationsService.create({
      userId,
      type: 'deposit_success',
      title: 'Deposit Received',
      message: `Your deposit of GHS ${amount.toFixed(2)} has been credited to your wallet. You can now purchase picks or request withdrawals.`,
      link: '/wallet',
      icon: 'wallet',
      sendEmail: true,
      metadata: { amount: amount.toFixed(2) },
    }).catch(() => { });

    const user = await this.usersService.findById(userId);
    this.emailService.sendAdminNotification({
      type: 'deposit_completed',
      metadata: {
        amount: amount.toFixed(2),
        displayName: user?.displayName || 'User',
        email: user?.email || String(userId),
      },
    }).catch(() => { });

    return { credited: true, amount };
  }

  async handlePaystackWebhook(rawBody: string, signature: string) {
    if (!(await this.paystackService.verifyWebhookSignature(rawBody, signature))) {
      return { received: false, reason: 'Invalid signature' };
    }
    const payload = JSON.parse(rawBody || '{}');
    const event = payload.event;
    if (event !== 'charge.success') {
      return { received: true };
    }

    const data = payload.data;
    const reference = data?.reference;
    if (!reference) return { received: true };

    const verify = await this.paystackService.verifyTransaction(reference);
    if (!verify || verify.status !== 'success') {
      return { received: true };
    }

    const amount = Number(verify.amount) / 100; // pesewas to GHS

    // Idempotency: atomically claim the deposit (pending -> completed). Only one concurrent
    // webhook can succeed; duplicates return early without double-crediting.
    const result = await this.depositRepo.update(
      { reference, status: 'pending' },
      { status: 'completed', paystackReference: data?.id || null },
    );
    if (result.affected !== 1) {
      return { received: true }; // Already processed by another webhook
    }

    const deposit = await this.depositRepo.findOne({ where: { reference } });
    if (!deposit) return { received: true };

    await this.credit(
      deposit.userId,
      amount,
      'deposit',
      reference,
      `Wallet deposit via Paystack`,
    );

    await this.notificationsService.create({
      userId: deposit.userId,
      type: 'deposit_success',
      title: 'Deposit Received',
      message: `Your deposit of GHS ${amount.toFixed(2)} has been credited to your wallet. You can now purchase picks or request withdrawals.`,
      link: '/wallet',
      icon: 'wallet',
      sendEmail: true,
      metadata: { amount: amount.toFixed(2) },
    }).catch(() => { });

    const user = await this.usersService.findById(deposit.userId);
    this.emailService.sendAdminNotification({
      type: 'deposit_completed',
      metadata: {
        amount: amount.toFixed(2),
        displayName: user?.displayName || 'User',
        email: user?.email || String(deposit.userId),
      },
    }).catch(() => { });

    return { received: true };
  }

  async getPayoutMethods(userId: number): Promise<PayoutMethod[]> {
    return this.payoutRepo.find({
      where: { userId },
      order: { isDefault: 'DESC' },
    });
  }

  async addPayoutMethod(
    user: User,
    dto: {
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
    const { emailVerifiedAt } = await this.usersService.getEmailVerificationStatus(user.id);
    if (!emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email before adding a payout method.');
    }
    if (user.role !== UserRole.TIPSTER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only tipsters can add payout methods');
    }

    const existing = await this.payoutRepo.findOne({ where: { userId: user.id } });
    if (existing) {
      await this.payoutRepo.remove(existing);
    }

    // Cryptocurrency: admin processes manually
    if (dto.type === 'crypto') {
      if (!dto.walletAddress || !dto.cryptoCurrency) {
        throw new BadRequestException('Wallet address and crypto currency required');
      }
      const manualDetails = JSON.stringify({
        walletAddress: dto.walletAddress.trim(),
        cryptoCurrency: dto.cryptoCurrency,
      });
      const accountMasked = `***${dto.walletAddress.slice(-8)}`;

      return this.payoutRepo.save({
        userId: user.id,
        type: 'crypto',
        recipientCode: `crypto_${Date.now()}`,
        displayName: dto.name || `${dto.cryptoCurrency} Wallet`,
        accountMasked,
        country: null,
        currency: dto.cryptoCurrency,
        manualDetails,
        bankCode: null,
        provider: null,
        isDefault: true,
      });
    }

    // Manual: admin processes (legacy / other mobile money)
    if (dto.type === 'manual') {
      const country = dto.country || 'GH';
      const currency = dto.currency || 'GHS';
      const manualMethod = dto.manualMethod || 'mobile_money';
      if (manualMethod === 'mobile_money') {
        if (!dto.phone) throw new BadRequestException('Phone number required for mobile money');
      } else {
        if (!dto.accountNumber || !dto.bankName) {
          throw new BadRequestException('Account number and bank name required');
        }
      }
      const manualDetails = JSON.stringify({
        manualMethod,
        phone: dto.phone || null,
        accountNumber: dto.accountNumber || null,
        bankName: dto.bankName || null,
        bankCode: dto.bankCode || null,
        provider: dto.provider || null,
      });
      const accountMasked =
        manualMethod === 'mobile_money'
          ? `***${(dto.phone || '').replace(/\D/g, '').slice(-4)}`
          : `***${(dto.accountNumber || '').slice(-4)}`;

      return this.payoutRepo.save({
        userId: user.id,
        type: 'manual',
        recipientCode: `manual_${Date.now()}`,
        displayName: dto.name,
        accountMasked,
        country,
        currency,
        manualDetails,
        bankCode: dto.bankCode ?? null,
        provider: dto.provider ?? null,
        isDefault: true,
      });
    }

    // Bank: global — admin processes (no Ghana-specific Paystack)
    if (dto.type === 'bank') {
      if (!dto.accountNumber || !dto.bankName) {
        throw new BadRequestException('Account number and bank name required');
      }
      const country = dto.country || 'GH';
      const currency = dto.currency || 'GHS';
      const manualDetails = JSON.stringify({
        manualMethod: 'bank',
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
        bankCode: dto.bankCode || null,
      });

      return this.payoutRepo.save({
        userId: user.id,
        type: 'bank',
        recipientCode: `manual_${Date.now()}`,
        displayName: dto.name,
        accountMasked: `***${dto.accountNumber.slice(-4)}`,
        country,
        currency,
        manualDetails,
        bankCode: dto.bankCode ?? null,
        provider: null,
        isDefault: true,
      });
    }

    // Mobile Money: Ghana via Paystack (if configured)
    if (dto.type === 'mobile_money') {
      if (!dto.phone || !dto.provider) {
        throw new BadRequestException('Phone and provider required for mobile money');
      }
      const country = dto.country || 'GH';
      const currency = dto.currency || 'GHS';
      const isGhana = country === 'GH' || country === 'GHA';

      if (isGhana) {
        try {
          const recipient = await this.paystackService.createTransferRecipient({
            type: 'mobile_money',
            name: dto.name,
            currency: 'GHS',
            phone: dto.phone!.replace(/\D/g, ''),
            provider: dto.provider!,
          });
          return this.payoutRepo.save({
            userId: user.id,
            type: 'mobile_money',
            recipientCode: recipient.recipient_code,
            displayName: dto.name,
            accountMasked: `***${(dto.phone || '').replace(/\D/g, '').slice(-4)}`,
            country,
            currency,
            bankCode: null,
            provider: dto.provider ?? null,
            isDefault: true,
          });
        } catch {
          // Paystack failed — fall back to manual
        }
      }

      const manualDetails = JSON.stringify({
        manualMethod: 'mobile_money',
        phone: dto.phone,
        provider: dto.provider || null,
      });
      return this.payoutRepo.save({
        userId: user.id,
        type: 'mobile_money',
        recipientCode: `manual_${Date.now()}`,
        displayName: dto.name,
        accountMasked: `***${(dto.phone || '').replace(/\D/g, '').slice(-4)}`,
        country,
        currency,
        manualDetails,
        bankCode: null,
        provider: dto.provider ?? null,
        isDefault: true,
      });
    }

    throw new BadRequestException('Invalid payout type');
  }

  async requestWithdrawal(user: User, amount: number): Promise<{ withdrawal: WithdrawalRequest; message: string }> {
    const { emailVerifiedAt } = await this.usersService.getEmailVerificationStatus(user.id);
    if (!emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email before requesting a withdrawal.');
    }
    if (user.role !== UserRole.TIPSTER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only tipsters can withdraw');
    }

    const minAmount = 5;
    const maxAmount = 5000;
    if (amount < minAmount || amount > maxAmount) {
      throw new BadRequestException(`Amount must be between GHS ${minAmount} and GHS ${maxAmount}`);
    }

    const payout = await this.payoutRepo.findOne({ where: { userId: user.id } });
    if (!payout) {
      throw new BadRequestException('Add a payout method first (Settings or Wallet)');
    }

    const reference = this.paystackService.generateTransferReference();
    const currency = payout.currency || 'GHS';

    await this.debit(
      user.id,
      amount,
      'withdrawal',
      reference,
      `Withdrawal to ${payout.displayName}`,
    );

    const withdrawal = await this.withdrawalRepo.save({
      userId: user.id,
      payoutMethodId: payout.id,
      amount,
      currency,
      status: payout.type === 'manual' ? 'pending' : 'processing',
      reference,
    });

    this.emailService.sendAdminNotification({
      type: 'withdrawal_request',
      metadata: {
        amount: amount.toFixed(2),
        displayName: user.displayName,
        email: user.email,
        manual: payout.type === 'manual',
      },
    }).catch(() => { });

    // Manual: admin will process (manual, crypto, or bank without Paystack)
    const isManualPayout =
      payout.type === 'manual' ||
      payout.type === 'crypto' ||
      payout.recipientCode?.startsWith?.('manual_');
    if (isManualPayout) {
      return {
        withdrawal,
        message: 'Withdrawal request submitted. Admin will review and process manually. You will be notified when completed.',
      };
    }

    // Paystack automatic transfer
    try {
      const transfer = await this.paystackService.initiateTransfer({
        amount,
        recipient: payout.recipientCode,
        reference,
        reason: 'Tipster withdrawal',
      });

      withdrawal.paystackTransferCode = transfer.transfer_code;
      withdrawal.status = transfer.status === 'success' ? 'completed' : 'processing';
      await this.withdrawalRepo.save(withdrawal);

      if (withdrawal.status === 'processing') {
        return { withdrawal, message: 'Withdrawal initiated. Funds will arrive shortly.' };
      }

      await this.notificationsService.create({
        userId: user.id,
        type: 'withdrawal_done',
        title: 'Withdrawal Completed',
        message: `Your withdrawal of ${currency} ${amount.toFixed(2)} has been sent to ${payout.displayName}. Funds should arrive shortly.`,
        link: '/wallet',
        icon: 'wallet',
        sendEmail: true,
        metadata: { amount: amount.toFixed(2) },
      }).catch(() => { });

      return { withdrawal, message: 'Withdrawal completed.' };
    } catch (e) {
      withdrawal.status = 'failed';
      withdrawal.failureReason = e instanceof Error ? e.message : 'Transfer failed';
      await this.withdrawalRepo.save(withdrawal);
      await this.credit(user.id, amount, 'refund', reference, 'Withdrawal failed - refund');

      await this.notificationsService.create({
        userId: user.id,
        type: 'withdrawal_failed',
        title: 'Withdrawal Failed',
        message: `Your withdrawal of ${currency} ${amount.toFixed(2)} failed. A refund has been credited to your wallet. Reason: ${withdrawal.failureReason}`,
        link: '/wallet',
        icon: 'alert',
        sendEmail: true,
        metadata: { amount: amount.toFixed(2) },
      }).catch(() => { });

      throw new BadRequestException(withdrawal.failureReason);
    }
  }

  async getWithdrawals(userId: number) {
    return this.withdrawalRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
