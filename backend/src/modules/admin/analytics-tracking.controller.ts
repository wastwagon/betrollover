import { Controller, Post, Body, Req } from '@nestjs/common';
import { AnalyticsTrackingService } from './analytics-tracking.service';
import type { Request } from 'express';

/**
 * Public analytics tracking - no auth required.
 * Used by frontend beacon for visitor/page view tracking.
 */
@Controller('analytics')
export class AnalyticsTrackingController {
  constructor(private readonly tracking: AnalyticsTrackingService) {}

  @Post('track')
  async track(@Body() body: { sessionId?: string; page?: string }, @Req() req: Request) {
    const sessionId = body?.sessionId || req.headers['x-session-id'] as string || `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];
    const userId = (req as any).user?.id; // Set by optional JWT if present

    await this.tracking.trackPageView({
      sessionId: String(sessionId).slice(0, 64),
      userId,
      page: body?.page?.slice(0, 255),
      referrer: typeof referrer === 'string' ? referrer.slice(0, 512) : undefined,
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 2000) : undefined,
    });
    return { ok: true };
  }
}
