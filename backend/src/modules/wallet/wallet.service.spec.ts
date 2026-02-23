import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { WalletService } from './wallet.service';
import { PaystackService } from './paystack.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { DepositRequest } from './entities/deposit-request.entity';
import { PayoutMethod } from './entities/payout-method.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';

describe('WalletService', () => {
  let service: WalletService;
  let depositRepo: jest.Mocked<{ findOne: jest.Mock; update: jest.Mock }>;
  let paystackService: jest.Mocked<Partial<PaystackService>>;
  let creditSpy: jest.SpyInstance;

  const mockDeposit = {
    id: 1,
    userId: 10,
    reference: 'dep_ref_123',
    amount: 50,
    currency: 'GHS',
    status: 'pending',
    paystackReference: null,
  };

  beforeEach(async () => {
    depositRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    paystackService = {
      verifyWebhookSignature: jest.fn(),
      verifyTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(UserWallet), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(WalletTransaction), useValue: { save: jest.fn() } },
        { provide: getRepositoryToken(DepositRequest), useValue: depositRepo },
        { provide: getRepositoryToken(PayoutMethod), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(WithdrawalRequest), useValue: { find: jest.fn(), save: jest.fn() } },
        { provide: PaystackService, useValue: paystackService },
        { provide: UsersService, useValue: { findById: jest.fn().mockResolvedValue({ displayName: 'Test', email: 'test@example.com' }) } },
        { provide: NotificationsService, useValue: { create: jest.fn().mockResolvedValue({}) } },
        { provide: EmailService, useValue: { sendAdminNotification: jest.fn().mockResolvedValue({}) } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    creditSpy = jest.spyOn(service, 'credit').mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  describe('handlePaystackWebhook', () => {
    const validPayload = {
      event: 'charge.success',
      data: { reference: 'dep_ref_123', id: 'paystack_tx_1' },
    };
    const rawBody = JSON.stringify(validPayload);

    it('should return received: false when signature is invalid', async () => {
      (paystackService.verifyWebhookSignature as jest.Mock).mockResolvedValue(false);

      const result = await service.handlePaystackWebhook(rawBody, 'bad-signature');

      expect(result).toEqual({ received: false, reason: 'Invalid signature' });
      expect(depositRepo.update).not.toHaveBeenCalled();
      expect(creditSpy).not.toHaveBeenCalled();
    });

    it('should return received: true without crediting when event is not charge.success', async () => {
      (paystackService.verifyWebhookSignature as jest.Mock).mockResolvedValue(true);

      const payload = { event: 'subscription.create', data: {} };
      const result = await service.handlePaystackWebhook(JSON.stringify(payload), 'valid-sig');

      expect(result).toEqual({ received: true });
      expect(depositRepo.update).not.toHaveBeenCalled();
      expect(creditSpy).not.toHaveBeenCalled();
    });

    it('should return received: true without crediting when Paystack verify fails', async () => {
      (paystackService.verifyWebhookSignature as jest.Mock).mockResolvedValue(true);
      (paystackService.verifyTransaction as jest.Mock).mockResolvedValue(null);

      const result = await service.handlePaystackWebhook(rawBody, 'valid-sig');

      expect(result).toEqual({ received: true });
      expect(depositRepo.update).not.toHaveBeenCalled();
      expect(creditSpy).not.toHaveBeenCalled();
    });

    it('should return received: true without crediting when deposit already processed (idempotency)', async () => {
      (paystackService.verifyWebhookSignature as jest.Mock).mockResolvedValue(true);
      (paystackService.verifyTransaction as jest.Mock).mockResolvedValue({ status: 'success', amount: 5000 });
      (depositRepo.update as jest.Mock).mockResolvedValue({ affected: 0 }); // Already completed

      const result = await service.handlePaystackWebhook(rawBody, 'valid-sig');

      expect(result).toEqual({ received: true });
      expect(depositRepo.update).toHaveBeenCalledWith(
        { reference: 'dep_ref_123', status: 'pending' },
        { status: 'completed', paystackReference: 'paystack_tx_1' },
      );
      expect(creditSpy).not.toHaveBeenCalled();
    });

    it('should credit wallet when deposit is successfully claimed', async () => {
      (paystackService.verifyWebhookSignature as jest.Mock).mockResolvedValue(true);
      (paystackService.verifyTransaction as jest.Mock).mockResolvedValue({ status: 'success', amount: 5000 });
      (depositRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (depositRepo.findOne as jest.Mock).mockResolvedValue(mockDeposit);

      const result = await service.handlePaystackWebhook(rawBody, 'valid-sig');

      expect(result).toEqual({ received: true });
      expect(creditSpy).toHaveBeenCalledWith(
        10,
        50,
        'deposit',
        'dep_ref_123',
        'Wallet deposit via Paystack',
      );
    });
  });
});
