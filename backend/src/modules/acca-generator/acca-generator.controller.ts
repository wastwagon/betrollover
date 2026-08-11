import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AccaGeneratorService, GenerateAccaDto } from './acca-generator.service';

@Controller('acca-generator')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AccaGeneratorController {
  constructor(private readonly accaGeneratorService: AccaGeneratorService) {}

  @Get('config')
  getConfig(@CurrentUser() user: User) {
    return this.accaGeneratorService.getPublicConfig(user.id);
  }

  /**
   * Live DB snapshot: which markets have same-day odds inside the chosen risk band.
   * Does not call API-Sports — reads synced fixture_odds.
   */
  @Get('availability')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getAvailability(
    @Query('riskLevel') riskLevel?: string,
    @Query('markets') markets?: string,
  ) {
    return this.accaGeneratorService.getAvailability(riskLevel, markets);
  }

  @Post('generate')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  generate(@CurrentUser() user: User, @Body() body: GenerateAccaDto) {
    return this.accaGeneratorService.generate(user.id, body);
  }

  @Post('publish')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  publish(
    @CurrentUser() user: User,
    @Body() body: { generationId: number; title?: string; description?: string },
  ) {
    return this.accaGeneratorService.publish(user.id, body);
  }

  /** Product analytics (tool_open). Quota/empty_pool are recorded server-side. */
  @Post('track')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  track(
    @CurrentUser() user: User,
    @Body() body: { eventType?: string; metadata?: Record<string, unknown> },
  ) {
    return this.accaGeneratorService.trackEvent(user.id, body?.eventType || '', body?.metadata);
  }
}
