import { Injectable, BadRequestException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
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
import {
  isPaystackRecipientCode,
  isPaystackTransfersUnavailableMessage,
  normalizeGhanaMomoPhone,
  toPaystackMomoBankCode,
} from './ghana-momo';
import {
  maskCryptoAddress,
  normalizeCryptoAddress,
  normalizeCryptoAsset,
  normalizeCryptoNetwork,
} from './crypto-payout';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

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
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) { }

  private async getWalletForUpdate(userId: number, manager: EntityManager): Promise<UserWallet> {
    let wallet = await manager
      .getRepository(UserWallet)
      .createQueryBuilder('wallet')
      .setLock('pessimistic_write')
      .where('wallet.userId = :userId', { userId })
      .getOne();

    if (!wallet) {
      await manager.getRepository(UserWallet).save(
        manager.getRepository(UserWallet).create({
          userId,
          balance: 0,
          currency: 'GHS',
          status: 'active',
        }),
      );
      wallet = await manager
        .getRepository(UserWallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();
    }
    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }
    return wallet;
  }

  private ensureWalletActive(wallet: UserWallet, operation: string): void {
    if (wallet.status === 'frozen') {
      throw new ForbiddenException(`Wallet is frozen. ${operation} is temporarily unavailable.`);
    }
  }

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

  async getBalance(userId: number): Promise<{
    balance: number;
    currency: string;
    paystackTransfersEnabled: boolean;
  }> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: Number(wallet.balance),
      currency: wallet.currency,
      paystackTransfersEnabled: await this.paystackService.isTransfersEnabled(),
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
    if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');
    if (manager) {
      const wallet = await this.getWalletForUpdate(userId, manager);
      this.ensureWalletActive(wallet, 'Debit');
      const bal = Number(wallet.balance);
      if (bal < amount) {
        throw new BadRequestException('Insufficient balance');
      }
      wallet.balance = Number((bal - amount).toFixed(2));
      await manager.getRepository(UserWallet).save(wallet);
      await manager.getRepository(WalletTransaction).save({
        userId,
        type,
        amount: -amount,
        currency: 'GHS',
        status: 'completed',
        reference: reference ?? null,
        description: description ?? null,
      });
      return;
    }

    await this.walletRepo.manager.transaction(async (txManager) => {
      await this.debit(userId, amount, type, reference, description, txManager);
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
    if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');
    if (manager) {
      const wallet = await this.getWalletForUpdate(userId, manager);
      wallet.balance = Number((Number(wallet.balance) + amount).toFixed(2));
      await manager.getRepository(UserWallet).save(wallet);
      await manager.getRepository(WalletTransaction).save({
        userId,
        type,
        amount,
        currency: 'GHS',
        status: 'completed',
        reference: reference ?? null,
        description: description ?? null,
      });
      return;
    }

    await this.walletRepo.manager.transaction(async (txManager) => {
      await this.credit(userId, amount, type, reference, description, txManager);
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
    const wallet = await this.getOrCreateWallet(user.id);
    this.ensureWalletActive(wallet, 'Deposits');

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

    // Idempotency: skip if already credited (e.g. webhook processed first)
    const existingTx = await this.txRepo.findOne({
      where: { userId, reference, type: 'deposit' },
      select: ['id', 'amount'],
    });
    if (existingTx) {
      deposit.status = 'completed';
      deposit.paystackReference = verify.id || null;
      await this.depositRepo.save(deposit).catch(() => {});
      return { credited: true, amount: Number(existingTx.amount) };
    }

    const amount = Number(verify.amount) / 100; // pesewas to GHS
    const wallet = await this.getOrCreateWallet(userId);
    this.ensureWalletActive(wallet, 'Deposits');
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
    if (event === 'transfer.success' || event === 'transfer.failed' || event === 'transfer.reversed') {
      return this.handlePaystackTransferWebhook(event, payload.data || {});
    }
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
    const wallet = await this.getOrCreateWallet(deposit.userId);
    this.ensureWalletActive(wallet, 'Deposits');

    // Idempotency: skip if we already credited this reference (e.g. verify callback ran first)
    const existingTx = await this.txRepo.findOne({
      where: { userId: deposit.userId, type: 'deposit', reference },
      select: ['id'],
    });
    if (existingTx) return { received: true };

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

  private async handlePaystackTransferWebhook(
    event: 'transfer.success' | 'transfer.failed' | 'transfer.reversed',
    data: { reference?: string; transfer_code?: string; reason?: string; message?: string },
  ) {
    const reference = data?.reference;
    const transferCode = data?.transfer_code || null;
    if (!reference && !transferCode) return { received: true };

    const openStatuses = ['pending', 'processing'] as const;
    const findWhere = reference
      ? { reference }
      : { paystackTransferCode: transferCode as string };
    const claimWhere = reference
      ? { reference, status: In([...openStatuses]) }
      : { paystackTransferCode: transferCode as string, status: In([...openStatuses]) };

    if (event === 'transfer.success') {
      if (reference) {
        const verify = await this.paystackService.verifyTransfer(reference);
        if (verify && verify.status && verify.status !== 'success') {
          return { received: true };
        }
      }
      const result = await this.withdrawalRepo.update(claimWhere, {
        status: 'completed',
        ...(transferCode ? { paystackTransferCode: transferCode } : {}),
      });
      if (result.affected !== 1) return { received: true };

      const withdrawal = await this.withdrawalRepo.findOne({ where: findWhere });
      if (!withdrawal) return { received: true };

      await this.notificationsService.create({
        userId: withdrawal.userId,
        type: 'withdrawal_done',
        title: 'Withdrawal Completed',
        message: `Your withdrawal of ${withdrawal.currency || 'GHS'} ${Number(withdrawal.amount).toFixed(2)} has been sent to your Mobile Money number.`,
        link: '/wallet',
        icon: 'wallet',
        sendEmail: true,
        alwaysSendEmail: true,
        metadata: { amount: Number(withdrawal.amount).toFixed(2) },
      }).catch(() => { });

      return { received: true };
    }

    const failureReason =
      (typeof data?.reason === 'string' && data.reason) ||
      (typeof data?.message === 'string' && data.message) ||
      (event === 'transfer.reversed' ? 'Paystack reversed the transfer' : 'Paystack transfer failed');

    const result = await this.withdrawalRepo.update(claimWhere, {
      status: 'failed',
      failureReason,
      ...(transferCode ? { paystackTransferCode: transferCode } : {}),
    });
    if (result.affected !== 1) return { received: true };

    const withdrawal = await this.withdrawalRepo.findOne({ where: findWhere });
    if (!withdrawal) return { received: true };

    const refundReference = withdrawal.reference || undefined;
    const existingRefund = await this.txRepo.findOne({
      where: { userId: withdrawal.userId, type: 'refund', reference: refundReference },
      select: ['id'],
    });
    if (!existingRefund) {
      await this.credit(
        withdrawal.userId,
        Number(withdrawal.amount),
        'refund',
        refundReference,
        'Withdrawal failed - refund',
      );
    }

    await this.notificationsService.create({
      userId: withdrawal.userId,
      type: 'withdrawal_failed',
      title: 'Withdrawal Failed',
      message: `Your withdrawal of ${withdrawal.currency || 'GHS'} ${Number(withdrawal.amount).toFixed(2)} failed. A refund has been credited to your wallet. Reason: ${failureReason}`,
      link: '/wallet',
      icon: 'alert',
      sendEmail: true,
      alwaysSendEmail: true,
      metadata: { amount: Number(withdrawal.amount).toFixed(2), reason: failureReason },
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
      network?: string;
    },
  ) {
    const { emailVerifiedAt } = await this.usersService.getEmailVerificationStatus(user.id);
    if (!emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email before adding a payout method.');
    }
    // Users and tipsters have same privileges (either can add payout)
    if (user.role !== UserRole.TIPSTER && user.role !== UserRole.ADMIN && user.role !== UserRole.USER) {
      throw new ForbiddenException('Only tipsters can add payout methods');
    }

    if (dto.type === 'mobile_money') {
      if (!dto.phone || !dto.provider) {
        throw new BadRequestException('Phone and provider required for mobile money');
      }
      if (!toPaystackMomoBankCode(dto.provider)) {
        throw new BadRequestException('Select MTN, Telecel (Vodafone), or AirtelTigo');
      }
      if (!normalizeGhanaMomoPhone(dto.phone)) {
        throw new BadRequestException('Enter a valid Ghana Mobile Money number (e.g. 0551234567)');
      }
    }
    if (dto.type === 'bank' && (!dto.accountNumber || !dto.bankName)) {
      throw new BadRequestException('Account number and bank name required');
    }

    const existing = await this.payoutRepo.findOne({ where: { userId: user.id } });
    const savePayout = async (row: Partial<PayoutMethod>) => {
      if (existing) await this.payoutRepo.remove(existing);
      return this.payoutRepo.save(row);
    };

    // Crypto: admin sends USDT/USDC off-platform. Address does not expire.
    if (dto.type === 'crypto') {
      const asset = normalizeCryptoAsset(dto.cryptoCurrency);
      const network = normalizeCryptoNetwork(dto.network);
      if (!asset) {
        throw new BadRequestException('Choose USDT or USDC');
      }
      if (!network) {
        throw new BadRequestException('Choose TRC20, ERC20, or BEP20');
      }
      const walletAddress = normalizeCryptoAddress(dto.walletAddress, network);
      if (!walletAddress) {
        throw new BadRequestException(
          network === 'TRC20'
            ? 'Enter a valid Tron (TRC20) address starting with T'
            : 'Enter a valid 0x address for this network',
        );
      }
      const country = dto.country || 'GH';
      const currency = dto.currency || 'GHS';
      const manualDetails = JSON.stringify({
        walletAddress,
        cryptoCurrency: asset,
        network,
      });
      return savePayout({
        userId: user.id,
        type: 'crypto',
        recipientCode: `manual_${Date.now()}`,
        displayName: dto.name,
        accountMasked: `${asset} · ${network} · ${maskCryptoAddress(walletAddress)}`,
        country,
        currency,
        manualDetails,
        bankCode: null,
        provider: network,
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

      return savePayout({
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

      return savePayout({
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

    // Mobile Money: Ghana via Paystack Transfers (falls back to admin manual payout)
    if (dto.type === 'mobile_money') {
      if (!dto.phone || !dto.provider) {
        throw new BadRequestException('Phone and provider required for mobile money');
      }
      const bankCode = toPaystackMomoBankCode(dto.provider);
      if (!bankCode) {
        throw new BadRequestException('Select MTN, Telecel (Vodafone), or AirtelTigo');
      }
      const phone = normalizeGhanaMomoPhone(dto.phone);
      if (!phone) {
        throw new BadRequestException('Enter a valid Ghana Mobile Money number (e.g. 0551234567)');
      }
      const country = dto.country || 'GH';
      const currency = dto.currency || 'GHS';
      const isGhana = country === 'GH' || country === 'GHA';
      const manualDetails = JSON.stringify({
        manualMethod: 'mobile_money',
        phone,
        provider: bankCode,
      });
      const accountMasked = `***${phone.slice(-4)}`;

      if (
        isGhana &&
        (await this.paystackService.isTransfersEnabled()) &&
        (await this.paystackService.isConfigured())
      ) {
        try {
          const recipient = await this.paystackService.createTransferRecipient({
            type: 'mobile_money',
            name: dto.name,
            currency: 'GHS',
            accountNumber: phone,
            bankCode,
          });
          return savePayout({
            userId: user.id,
            type: 'mobile_money',
            recipientCode: recipient.recipient_code,
            displayName: dto.name,
            accountMasked,
            country,
            currency,
            manualDetails,
            bankCode,
            provider: bankCode,
            isDefault: true,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to create payout recipient';
          if (!isPaystackTransfersUnavailableMessage(msg)) {
            throw e instanceof BadRequestException ? e : new BadRequestException(msg);
          }
          this.logger.warn(`Paystack MoMo recipient unavailable, saving as manual: ${msg}`);
        }
      }

      return savePayout({
        userId: user.id,
        type: 'mobile_money',
        recipientCode: `manual_${Date.now()}`,
        displayName: dto.name,
        accountMasked,
        country,
        currency,
        manualDetails,
        bankCode,
        provider: bankCode,
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
    if (user.role !== UserRole.TIPSTER && user.role !== UserRole.ADMIN && user.role !== UserRole.USER) {
      throw new ForbiddenException('Withdrawals are not available for your account type.');
    }

    const minAmount = 5;
    const maxAmount = 5000;
    if (amount < minAmount || amount > maxAmount) {
      throw new BadRequestException(`Amount must be between GHS ${minAmount} and GHS ${maxAmount}`);
    }

    const wallet = await this.getOrCreateWallet(user.id);
    this.ensureWalletActive(wallet, 'Withdrawals');

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

    const usePaystackTransfer =
      (await this.paystackService.isTransfersEnabled()) &&
      payout.type === 'mobile_money' &&
      isPaystackRecipientCode(payout.recipientCode);

    const withdrawal = await this.withdrawalRepo.save({
      userId: user.id,
      payoutMethodId: payout.id,
      amount,
      currency,
      status: usePaystackTransfer ? 'processing' : 'pending',
      reference,
    });

    this.emailService.sendAdminNotification({
      type: 'withdrawal_request',
      metadata: {
        amount: amount.toFixed(2),
        displayName: user.displayName,
        email: user.email,
        manual: !usePaystackTransfer,
      },
    }).catch(() => { });

    // Bank, crypto, and MoMo without a Paystack recipient: admin fulfills from wallet balance
    if (!usePaystackTransfer) {
      return {
        withdrawal,
        message: 'Withdrawal request submitted. Admin will review and process manually. You will be notified when completed.',
      };
    }

    try {
      const transfer = await this.paystackService.initiateTransfer({
        amount,
        recipient: payout.recipientCode,
        reference,
        reason: 'Withdrawal',
      });

      withdrawal.paystackTransferCode = transfer.transfer_code ?? null;

      if (transfer.status === 'success') {
        withdrawal.status = 'completed';
        await this.withdrawalRepo.save(withdrawal);
        await this.notificationsService.create({
          userId: user.id,
          type: 'withdrawal_done',
          title: 'Withdrawal Completed',
          message: `Your withdrawal of ${currency} ${amount.toFixed(2)} has been sent to ${payout.displayName}. Funds should arrive shortly.`,
          link: '/wallet',
          icon: 'wallet',
          sendEmail: true,
          alwaysSendEmail: true,
          metadata: { amount: amount.toFixed(2) },
        }).catch(() => { });
        return { withdrawal, message: 'Withdrawal completed.' };
      }

      if (transfer.status === 'otp') {
        withdrawal.status = 'processing';
        withdrawal.failureReason =
          'Paystack is waiting for transfer OTP. Disable “Confirm transfers” in the Paystack Dashboard, or pay this request manually.';
        await this.withdrawalRepo.save(withdrawal);
        return {
          withdrawal,
          message: 'Withdrawal submitted. It will be completed shortly.',
        };
      }

      withdrawal.status = 'processing';
      await this.withdrawalRepo.save(withdrawal);
      return { withdrawal, message: 'Withdrawal initiated. Funds will arrive shortly.' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transfer failed';
      if (withdrawal.paystackTransferCode) {
        withdrawal.status = 'processing';
        withdrawal.failureReason = msg;
        await this.withdrawalRepo.save(withdrawal);
        return { withdrawal, message: 'Withdrawal initiated. Funds will arrive shortly.' };
      }
      // Paystack did not accept the transfer — keep the debit and queue for admin manual payout
      withdrawal.status = 'pending';
      withdrawal.failureReason = msg;
      await this.withdrawalRepo.save(withdrawal);
      this.logger.warn(`Paystack transfer failed for ${reference}, queued for manual payout: ${msg}`);
      return {
        withdrawal,
        message: 'Withdrawal request submitted. Admin will review and process it. You will be notified when completed.',
      };
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
