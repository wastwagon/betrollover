import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PushService } from './push.service';

@Controller('notifications/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    const key = this.pushService.getVapidPublicKey();
    return { vapidPublicKey: key ?? null };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(
    @CurrentUser() user: User,
    @Body() body: { platform: string; token: string; deviceName?: string },
  ) {
    if (!body?.platform || !body?.token) {
      return { error: 'platform and token required' };
    }
    const platform = String(body.platform).toLowerCase();
    if (!['web', 'ios', 'android'].includes(platform)) {
      return { error: 'platform must be web, ios, or android' };
    }
    return this.pushService.register(user.id, platform, body.token.trim(), body.deviceName);
  }

  @Delete('register')
  @UseGuards(JwtAuthGuard)
  async unregister(@CurrentUser() user: User, @Body() body: { token: string }) {
    if (!body?.token) return { error: 'token required' };
    return this.pushService.unregister(user.id, body.token.trim());
  }
}
