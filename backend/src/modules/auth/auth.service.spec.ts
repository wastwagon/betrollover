import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailOtpService } from '../otp/email-otp.service';
import { EmailService } from '../email/email.service';
import { ReferralsService } from '../referrals/referrals.service';
import { Tipster } from '../predictions/entities/tipster.entity';
import { PasswordResetOtp } from '../otp/entities/password-reset-otp.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { VisitorSession } from '../admin/entities/visitor-session.entity';

describe('AuthService', () => {
  let service: AuthService;
  let moduleRef: TestingModule;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let walletService: jest.Mocked<Partial<WalletService>>;
  let emailOtpService: jest.Mocked<Partial<EmailOtpService>>;
  let emailService: jest.Mocked<Partial<EmailService>>;

  const mockUser: Partial<User> = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    role: UserRole.USER,
    avatar: null,
    bio: null,
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      validatePassword: jest.fn(),
      create: jest.fn(),
      setEmailVerified: jest.fn(),
      isAtLeast18: jest.fn().mockReturnValue(true),
      verifyEmailByToken: jest.fn(),
      getEmailVerificationStatus: jest.fn(),
      setEmailVerificationToken: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    walletService = {
      getOrCreateWallet: jest.fn().mockResolvedValue({}),
    };
    emailOtpService = {
      verifyOtp: jest.fn().mockResolvedValue(undefined),
      sendOtp: jest.fn().mockResolvedValue({ sent: true }),
    };
    emailService = {
      sendAdminNotification: jest.fn().mockResolvedValue(undefined),
      sendVerificationEmail: jest.fn().mockResolvedValue({ sent: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: WalletService, useValue: walletService },
        { provide: EmailOtpService, useValue: emailOtpService },
        { provide: EmailService, useValue: emailService },
        { provide: ReferralsService, useValue: { registerSignup: jest.fn().mockResolvedValue(undefined) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:6002') } },
        { provide: getRepositoryToken(Tipster), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(PasswordResetOtp), useValue: { findOne: jest.fn(), save: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(RefreshToken), useValue: { findOne: jest.fn(), save: jest.fn(), delete: jest.fn(), create: jest.fn((o) => o) } },
        { provide: getRepositoryToken(VisitorSession), useValue: { update: jest.fn().mockResolvedValue({ affected: 0 }) } },
      ],
    }).compile();

    moduleRef = module;
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when email and password are valid', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (usersService.validatePassword as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(usersService.validatePassword).toHaveBeenCalledWith(mockUser, 'password123');
    });

    it('should return null when user not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('unknown@example.com', 'password123');

      expect(result).toBeNull();
      expect(usersService.validatePassword).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (usersService.validatePassword as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('createTokenForUser', () => {
    it('should return a JWT token', () => {
      const token = service.createTokenForUser({ id: 1, email: 'test@example.com' });

      expect(token).toBe('mock-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 1, email: 'test@example.com' });
    });
  });

  describe('login', () => {
    it('should return access_token, refresh_token and user', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue({ ...mockUser, emailVerifiedAt: new Date() });

      const result = await service.login(mockUser as User);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('refresh_token');
      expect(typeof result.refresh_token).toBe('string');
      expect(result.refresh_token.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: UserRole.USER,
      });
    });
  });

  describe('sendRegistrationOtp', () => {
    it('should throw ConflictException when email already registered', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.sendRegistrationOtp('test@example.com')).rejects.toThrow(ConflictException);
      await expect(service.sendRegistrationOtp('test@example.com')).rejects.toThrow('already registered');
      expect(emailOtpService.sendOtp).not.toHaveBeenCalled();
    });

    it('should send OTP when email is not registered', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await service.sendRegistrationOtp('new@example.com');

      expect(emailOtpService.sendOtp).toHaveBeenCalledWith('new@example.com');
    });
  });

  describe('verifyEmail', () => {
    it('should return verified: false when token is empty', async () => {
      const result = await service.verifyEmail('');

      expect(result).toEqual({ verified: false, message: expect.stringContaining('invalid') });
      expect(usersService.verifyEmailByToken).not.toHaveBeenCalled();
    });

    it('should return verified: true when token is valid', async () => {
      (usersService.verifyEmailByToken as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifyEmail('valid-token');

      expect(result).toEqual({ verified: true, message: 'Email verified successfully. You can now sign in.' });
    });

    it('should return verified: false when token is invalid', async () => {
      (usersService.verifyEmailByToken as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyEmail('invalid-token');

      expect(result.verified).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should throw when refresh_token is empty', async () => {
      await expect(service.refresh('')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh('')).rejects.toThrow('Refresh token is required');
    });

    it('should throw when refresh token is invalid', async () => {
      const refreshTokenRepo = moduleRef.get(getRepositoryToken(RefreshToken)) as { findOne: jest.Mock };
      (refreshTokenRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh('invalid-token')).rejects.toThrow('Invalid or expired');
    });
  });

  describe('logout', () => {
    it('should return revoked: false when token is empty', async () => {
      const result = await service.logout('');
      expect(result).toEqual({ revoked: false });
    });
  });

  describe('register', () => {
    it('should throw ForbiddenException when user is under 18', async () => {
      (usersService.isAtLeast18 as jest.Mock).mockReturnValue(false);

      await expect(
        service.register({
          email: 'new@example.com',
          username: 'newuser',
          password: 'password123',
          displayName: 'New User',
          otpCode: '123456',
          dateOfBirth: '2010-01-01',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      (usersService.isAtLeast18 as jest.Mock).mockReturnValue(true);
      (emailOtpService.verifyOtp as jest.Mock).mockResolvedValue(undefined);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          username: 'newuser',
          password: 'password123',
          displayName: 'New User',
          otpCode: '123456',
          dateOfBirth: '1990-01-01',
        }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });
});
