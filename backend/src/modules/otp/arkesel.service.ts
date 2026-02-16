import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Arkesel OTP Service
 * Docs: https://developers.arkesel.com/ (Phone Verification > OTP)
 * - Generate OTP: sends SMS with one-time code
 * - Verify OTP: validates code against phone
 * Phone format: international, digits only, no + (e.g. 233541234567, 254712345678)
 */
@Injectable()
export class ArkeselService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://sms.arkesel.com';
  private readonly senderId: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('ARKESEL_API_KEY') || '';
    this.senderId = this.config.get<string>('ARKESEL_SENDER_ID') || 'BetRollover';
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  /** Normalize phone to international format (digits only, no +). Arkesel expects country code + number. */
  normalizePhone(phone: string): string {
    let p = phone.replace(/\D/g, '');
    // Local format starting with 0: assume Ghana (233) for backward compat; otherwise require full international
    if (p.startsWith('0') && p.length >= 10) {
      p = '233' + p.slice(1);
    }
    return p;
  }

  /**
   * Generate and send OTP to phone
   * Arkesel OTP API: POST /api/otp/generate
   * Response codes: 1000=success, 1001=validation, 1005=invalid phone, 1007=insufficient balance
   */
  async sendOtp(phone: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('OTP service not configured. Add ARKESEL_API_KEY to .env');
    }
    const normalized = this.normalizePhone(phone);
    if (normalized.length < 10 || normalized.length > 15) {
      throw new BadRequestException('Invalid phone number. Use international format with country code (e.g. 233541234567, 254712345678)');
    }

    const res = await fetch(`${this.baseUrl}/api/otp/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        number: normalized,
        expiry: 5, // minutes
        length: 6,
        type: 'numeric',
        medium: 'sms',
        message: `Your BetRollover verification code is %otp_code%. Valid for 5 minutes.`,
        sender_id: this.senderId.slice(0, 11),
      }),
    });

    const data = await res.json().catch(() => ({}));

    // Arkesel OTP response: code 1000 = success
    const code = data.code ?? data.status;
    if (code === 1000 || code === '1000' || data.status === 'success') {
      return { success: true };
    }

    const msg = data.message || data.reason || 'Failed to send OTP';
    if (code === 1005 || code === '1005') throw new BadRequestException('Invalid phone number');
    if (code === 1007 || code === '1007') throw new BadRequestException('OTP service temporarily unavailable. Try again later.');
    if (code === 1001 || code === '1001') throw new BadRequestException('Invalid request. Check phone format.');
    throw new BadRequestException(msg || 'Failed to send verification code');
  }

  /**
   * Verify OTP code for phone
   * Arkesel OTP API: POST /api/otp/verify
   * Response code: 1100 = verification successful, 1104 = invalid code
   */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new BadRequestException('OTP service not configured');
    }
    const normalized = this.normalizePhone(phone);
    const otpCode = String(code).trim();
    if (!otpCode || otpCode.length < 4) {
      throw new BadRequestException('Invalid verification code');
    }

    const res = await fetch(`${this.baseUrl}/api/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        number: normalized,
        code: otpCode,
      }),
    });

    const data = await res.json().catch(() => ({}));
    const responseCode = data.code ?? data.status;

    // 1100 = OTP verification successful
    return responseCode === 1100 || responseCode === '1100' || data.status === 'success';
  }
}
