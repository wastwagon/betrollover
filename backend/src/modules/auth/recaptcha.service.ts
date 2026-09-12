import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SiteVerifyResponse = {
  success?: boolean;
  'error-codes'?: string[];
};

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly config: ConfigService) {}

  async verifyOrThrow(token: string | undefined): Promise<void> {
    const secret = (this.config.get<string>('RECAPTCHA_SECRET_KEY') || '').trim();
    const isProd = process.env.NODE_ENV === 'production';

    if (!secret) {
      if (isProd) {
        throw new ServiceUnavailableException('Registration is temporarily unavailable.');
      }
      this.logger.warn('RECAPTCHA_SECRET_KEY missing — skipping captcha outside production');
      return;
    }

    if (!token?.trim()) {
      throw new BadRequestException('Please confirm you are not a robot.');
    }

    let payload: SiteVerifyResponse;
    try {
      const body = new URLSearchParams();
      body.set('secret', secret);
      body.set('response', token.trim());
      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(8000),
      });
      payload = (await res.json()) as SiteVerifyResponse;
    } catch (err) {
      this.logger.warn(`reCAPTCHA verify failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException('Could not verify you are human. Please try again.');
    }

    if (!payload?.success) {
      throw new BadRequestException('Please confirm you are not a robot.');
    }
  }
}
