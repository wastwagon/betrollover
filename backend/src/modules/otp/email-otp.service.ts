import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { RegistrationOtp } from './entities/registration-otp.entity';
import { EmailService } from '../email/email.service';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;
const LOCKOUT_MS = 10 * 60_000;

@Injectable()
export class EmailOtpService {
  private readonly resendState = new Map<string, number>();
  private readonly verifyState = new Map<string, { attempts: number; lockUntil: number }>();

  constructor(
    @InjectRepository(RegistrationOtp)
    private otpRepo: Repository<RegistrationOtp>,
    private emailService: EmailService,
  ) {}

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private generateCode(): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
      code += digits[Math.floor(Math.random() * 10)];
    }
    return code;
  }

  async sendOtp(email: string): Promise<{ success: boolean; message?: string }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('Please enter a valid email address.');
    }

    const now = Date.now();
    const lastSentAt = this.resendState.get(normalized) ?? 0;
    if (now - lastSentAt < RESEND_COOLDOWN_MS) {
      throw new BadRequestException('Please wait before requesting another verification code.');
    }

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.otpRepo.delete({ email: normalized });
    await this.otpRepo.save(
      this.otpRepo.create({ email: normalized, code: this.hashCode(code), expiresAt }),
    );
    this.resendState.set(normalized, now);
    this.verifyState.delete(normalized);

    const result = await this.emailService.sendRegistrationOtp(normalized, code);
    if (!result.sent) {
      throw new BadRequestException(result.error || 'We couldn\'t send the verification code. Please check your email address and try again.');
    }
    return { success: true, message: 'Verification code sent. Check your email.' };
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const otpCode = String(code).trim().replace(/\D/g, '');
    if (!normalized || !otpCode || otpCode.length < 4) {
      throw new BadRequestException('Please enter a valid 6-digit verification code.');
    }

    const now = Date.now();
    const state = this.verifyState.get(normalized);
    if (state && state.lockUntil > now) {
      throw new UnauthorizedException('Too many failed attempts. Please request a new code in a few minutes.');
    }

    const record = await this.otpRepo.findOne({
      where: { email: normalized },
      order: { createdAt: 'DESC' },
    }) as RegistrationOtp | null;

    if (!record) {
      throw new UnauthorizedException('No verification code found. Please request a new code.');
    }
    if (new Date() > record.expiresAt) {
      await this.otpRepo.delete({ email: normalized });
      throw new UnauthorizedException('The verification code has expired. Please request a new one.');
    }
    if (record.code !== this.hashCode(otpCode)) {
      const nextAttempts = (state?.attempts ?? 0) + 1;
      const lockUntil = nextAttempts >= MAX_VERIFY_ATTEMPTS ? now + LOCKOUT_MS : 0;
      this.verifyState.set(normalized, { attempts: nextAttempts, lockUntil });
      throw new UnauthorizedException('The verification code is incorrect. Please check and try again.');
    }

    await this.otpRepo.delete({ email: normalized });
    this.verifyState.delete(normalized);
    return true;
  }

  async cleanupExpired(): Promise<void> {
    await this.otpRepo.delete({ expiresAt: LessThan(new Date()) });
  }
}
