import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RegistrationOtp } from './entities/registration-otp.entity';
import { EmailService } from '../email/email.service';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

@Injectable()
export class EmailOtpService {
  constructor(
    @InjectRepository(RegistrationOtp)
    private otpRepo: Repository<RegistrationOtp>,
    private emailService: EmailService,
  ) {}

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
      throw new BadRequestException('Please enter a valid email address');
    }

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.otpRepo.delete({ email: normalized });
    await this.otpRepo.save(
      this.otpRepo.create({ email: normalized, code, expiresAt }),
    );

    const result = await this.emailService.sendRegistrationOtp(normalized, code);
    if (!result.sent) {
      throw new BadRequestException(result.error || 'Failed to send verification code');
    }
    return { success: true, message: 'Verification code sent to your email' };
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const otpCode = String(code).trim().replace(/\D/g, '');
    if (!normalized || !otpCode || otpCode.length < 4) {
      throw new BadRequestException('Invalid verification code');
    }

    const record = await this.otpRepo.findOne({
      where: { email: normalized },
      order: { createdAt: 'DESC' },
    }) as RegistrationOtp | null;

    if (!record) {
      throw new UnauthorizedException('No verification code found. Please request a new one.');
    }
    if (new Date() > record.expiresAt) {
      await this.otpRepo.delete({ email: normalized });
      throw new UnauthorizedException('Verification code expired. Please request a new one.');
    }
    if (record.code !== otpCode) {
      throw new UnauthorizedException('Invalid verification code');

    }

    await this.otpRepo.delete({ email: normalized });
    return true;
  }

  async cleanupExpired(): Promise<void> {
    await this.otpRepo.delete({ expiresAt: LessThan(new Date()) });
  }
}
