import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { EmailOtpService } from './email-otp.service';
import { RegistrationOtp } from './entities/registration-otp.entity';
import { EmailService } from '../email/email.service';

describe('EmailOtpService', () => {
  let service: EmailOtpService;
  let otpRepo: jest.Mocked<{ delete: jest.Mock; save: jest.Mock; create: jest.Mock; findOne: jest.Mock }>;
  let emailService: jest.Mocked<{ sendRegistrationOtp: jest.Mock }>;

  beforeEach(async () => {
    otpRepo = {
      delete: jest.fn(),
      save: jest.fn(),
      create: jest.fn((input) => input),
      findOne: jest.fn(),
    };
    emailService = {
      sendRegistrationOtp: jest.fn().mockResolvedValue({ sent: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailOtpService,
        { provide: getRepositoryToken(RegistrationOtp), useValue: otpRepo },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<EmailOtpService>(EmailOtpService);
  });

  it('stores hashed OTP code and verifies with plaintext input', async () => {
    await service.sendOtp('user@example.com');
    const created = otpRepo.save.mock.calls[0]?.[0];
    expect(created.email).toBe('user@example.com');
    expect(created.code).toMatch(/^[a-f0-9]{64}$/);

    otpRepo.findOne.mockResolvedValue({
      email: 'user@example.com',
      code: created.code,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      id: 1,
    });

    const codeSent = emailService.sendRegistrationOtp.mock.calls[0]?.[1];
    await expect(service.verifyOtp('user@example.com', codeSent)).resolves.toBe(true);
  });

  it('rejects invalid code attempts and eventually locks verification', async () => {
    const hashed = crypto.createHash('sha256').update('123456').digest('hex');
    otpRepo.findOne.mockResolvedValue({
      email: 'user@example.com',
      code: hashed,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      id: 1,
    });

    for (let i = 0; i < 5; i++) {
      await expect(service.verifyOtp('user@example.com', '000000')).rejects.toThrow(UnauthorizedException);
    }

    await expect(service.verifyOtp('user@example.com', '123456')).rejects.toThrow(
      'Too many failed attempts. Please request a new code in a few minutes.',
    );
  });
});
