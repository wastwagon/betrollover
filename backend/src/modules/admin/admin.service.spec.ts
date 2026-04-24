import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService financial guards', () => {
  const makeTransactionDataSource = (manager: any) => ({
    transaction: jest.fn(async (...args: any[]) => {
      const run = typeof args[0] === 'function' ? args[0] : args[1];
      return run(manager);
    }),
  });

  it('prevents duplicate deposit credit when deposit tx exists', async () => {
    const service: any = Object.create(AdminService.prototype);
    const deposit = { id: 1, userId: 5, amount: 20, reference: 'dep-abc', status: 'pending' };
    const depositRepo = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(deposit),
      })),
      save: jest.fn(async (v) => v),
    };
    const txRepo = { findOne: jest.fn().mockResolvedValue({ id: 44 }) };
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity?.name === 'DepositRequest') return depositRepo;
        if (entity?.name === 'WalletTransaction') return txRepo;
        return {};
      }),
    };
    service.dataSource = makeTransactionDataSource(manager);
    service.walletService = { credit: jest.fn().mockResolvedValue(undefined) };

    const result = await service.updateDepositStatus(1, 'completed');
    expect(result?.status).toBe('completed');
    expect(service.walletService.credit).not.toHaveBeenCalled();
  });

  it('blocks edits on finalized deposit', async () => {
    const service: any = Object.create(AdminService.prototype);
    const deposit = { id: 1, userId: 5, amount: 20, reference: 'dep-abc', status: 'completed' };
    const manager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(deposit),
        })),
      })),
    };
    service.dataSource = makeTransactionDataSource(manager);

    await expect(service.updateDepositStatus(1, 'failed')).rejects.toThrow(BadRequestException);
  });

  it('refunds once when withdrawal fails', async () => {
    const service: any = Object.create(AdminService.prototype);
    const withdrawal = {
      id: 9,
      userId: 7,
      payoutMethodId: 3,
      status: 'pending',
      amount: 55,
      currency: 'GHS',
      reference: 'wd-ref',
      failureReason: null,
    };
    const withdrawalRepo = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(withdrawal),
      })),
      save: jest.fn(async (v) => v),
    };
    const txRepo = { findOne: jest.fn().mockResolvedValue(null) };
    const payoutRepo = { findOne: jest.fn().mockResolvedValue({ id: 3, displayName: 'MoMo' }) };
    const manager = {
      getRepository: jest.fn((entity: any) => {
        if (entity?.name === 'WithdrawalRequest') return withdrawalRepo;
        if (entity?.name === 'WalletTransaction') return txRepo;
        if (entity?.name === 'PayoutMethod') return payoutRepo;
        return {};
      }),
    };
    service.dataSource = makeTransactionDataSource(manager);
    service.walletService = { credit: jest.fn().mockResolvedValue(undefined) };
    service.notificationsService = { create: jest.fn().mockResolvedValue(undefined) };
    service.auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const result = await service.updateWithdrawalStatus(1, 9, 'failed', 'timeout');
    expect(result.status).toBe('failed');
    expect(service.walletService.credit).toHaveBeenCalledTimes(1);
  });

  it('throws when withdrawal is not found', async () => {
    const service: any = Object.create(AdminService.prototype);
    const manager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        })),
      })),
    };
    service.dataSource = makeTransactionDataSource(manager);
    service.walletService = { credit: jest.fn().mockResolvedValue(undefined) };
    service.notificationsService = { create: jest.fn().mockResolvedValue(undefined) };
    service.auditService = { log: jest.fn().mockResolvedValue(undefined) };

    await expect(service.updateWithdrawalStatus(1, 9, 'failed')).rejects.toThrow(NotFoundException);
  });
});
