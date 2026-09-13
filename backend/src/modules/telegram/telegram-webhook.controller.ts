import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TelegramVipService } from './telegram-vip.service';
import { telegramWebhookSecret } from './telegram-api';

@Controller('telegram')
export class TelegramWebhookController {
  constructor(private readonly vip: TelegramVipService) {}

  @Post('webhook')
  @HttpCode(200)
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async webhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-telegram-bot-api-secret-token') secretHeader?: string,
  ) {
    const expected = telegramWebhookSecret();
    if (expected && secretHeader !== expected) {
      throw new UnauthorizedException('Invalid Telegram webhook secret');
    }
    await this.vip.handleWebhookUpdate(body || {});
    return { ok: true };
  }
}
