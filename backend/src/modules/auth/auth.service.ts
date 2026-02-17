import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailOtpService } from '../otp/email-otp.service';
import { EmailService } from '../email/email.service';
import { User } from '../users/entities/user.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { PasswordResetOtp } from '../otp/entities/password-reset-otp.entity';

export interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private walletService: WalletService,
    private emailOtpService: EmailOtpService,
    private emailService: EmailService,
    private config: ConfigService,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(PasswordResetOtp)
    private passwordResetOtpRepo: Repository<PasswordResetOtp>,
  ) { }

  async sendRegistrationOtp(email: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new UnauthorizedException('This email is already registered');
    }
    return this.emailOtpService.sendOtp(email.trim().toLowerCase());
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const valid = await this.usersService.validatePassword(user, password);
    return valid ? user : null;
  }

  async login(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const fullUser = await this.usersService.findById(user.id);
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        emailVerifiedAt: (fullUser as User & { emailVerifiedAt?: Date })?.emailVerifiedAt ?? null,
      },
    };
  }

  async register(data: {
    email: string;
    username: string;
    password: string;
    displayName: string;
    otpCode: string;
  }) {
    await this.emailOtpService.verifyOtp(data.email.trim().toLowerCase(), data.otpCode);
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }
    const user = await this.usersService.create({
      email: data.email,
      username: data.username,
      password: data.password,
      displayName: data.displayName,
      phone: undefined,
    });
    await this.usersService.setEmailVerified(user.id);
    await this.walletService.getOrCreateWallet(user.id);
    await this.ensureTipsterForUser(user);

    this.emailService.sendAdminNotification({
      type: 'new_user_registered',
      metadata: {
        displayName: user.displayName,
        email: user.email,
        username: user.username,
      },
    }).catch(() => { });

    return this.login(user);
  }

  async verifyEmail(token: string): Promise<{ verified: boolean; message: string }> {
    if (!token?.trim()) return { verified: false, message: 'Invalid token' };
    const user = await this.usersService.verifyEmailByToken(token.trim());
    if (!user) return { verified: false, message: 'Invalid or expired token' };
    return { verified: true, message: 'Email verified successfully' };
  }

  async resendVerificationEmail(userId: number): Promise<{ sent: boolean; message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const status = await this.usersService.getEmailVerificationStatus(userId);
    if (status.emailVerifiedAt) {
      return { sent: false, message: 'Email already verified' };
    }
    const token = crypto.randomBytes(32).toString('hex');
    await this.usersService.setEmailVerificationToken(userId, token);
    const appUrl = this.config.get('APP_URL') || process.env.APP_URL || 'http://localhost:6002';
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;
    const result = await this.emailService.sendVerificationEmail(
      (user as User).email,
      verifyUrl,
      user.displayName,
    );
    return result.sent
      ? { sent: true, message: 'Verification email sent' }
      : { sent: false, message: result.error || 'Failed to send email' };
  }

  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private async ensureTipsterForUser(user: User): Promise<void> {
    const existing = await this.tipsterRepo.findOne({ where: { userId: user.id } });
    if (existing) return;
    const byUsername = await this.tipsterRepo.findOne({ where: { username: user.username } });
    if (byUsername) {
      byUsername.userId = user.id;
      byUsername.displayName = user.displayName;
      byUsername.avatarUrl = user.avatar;
      byUsername.bio = user.bio;
      await this.tipsterRepo.save(byUsername);
      return;
    }
    const tipster = this.tipsterRepo.create({
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatar,
      bio: user.bio,
      userId: user.id,
      isAi: false,
      tipsterType: 'human',
      isActive: true,
    });
    await this.tipsterRepo.save(tipster);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await this.usersService.validatePassword(user, currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(userId, hashed);
  }

  async forgotPassword(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    // Silent fail if user not found for security, but we can't send email
    if (!user) return { message: 'If an account exists with that email, a reset code has been sent.' };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.passwordResetOtpRepo.delete({ email: normalized });
    await this.passwordResetOtpRepo.save(
      this.passwordResetOtpRepo.create({ email: normalized, code, expiresAt }),
    );

    await this.emailService.sendPasswordResetOtp(normalized, code);
    return { message: 'If an account exists with that email, a reset code has been sent.' };
  }

  async resetPassword(data: { email: string; code: string; newPassword: string }) {
    const normalized = data.email.trim().toLowerCase();
    const record = await this.passwordResetOtpRepo.findOne({
      where: { email: normalized, code: data.code, isUsed: false },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    if (new Date() > record.expiresAt) {
      throw new UnauthorizedException('Reset code has expired');
    }

    const user = await this.usersService.findByEmail(normalized);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const hashed = await bcrypt.hash(data.newPassword, 12);
    await this.usersService.updatePassword(user.id, hashed);

    record.isUsed = true;
    await this.passwordResetOtpRepo.save(record);

    return { message: 'Password reset successful' };
  }
}
