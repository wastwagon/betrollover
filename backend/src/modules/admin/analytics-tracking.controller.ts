import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AnalyticsTrackingService } from './analytics-tracking.service';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import type { Request } from 'express';

/**
 * Public analytics tracking - no auth required.
 * Used by frontend beacon for visitor/page view tracking.
 */
@Controller('analytics')
export class AnalyticsTrackingController {
  constructor(private readonly tracking: AnalyticsTrackingService) {}

  @Post('track')
  async track(
    @Body() body: { sessionId?: string; page?: string; deviceType?: string; clientIp?: string },
    @Req() req: Request,
  ) {
    const sessionId = body?.sessionId || (req.headers['x-session-id'] as string) || `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];
    const userId = (req as any).user?.id;
    const clientIp = body?.clientIp || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req as any).ip;

    await this.tracking.trackPageView({
      sessionId: String(sessionId).slice(0, 64),
      userId,
      page: body?.page?.slice(0, 255),
      referrer: typeof referrer === 'string' ? referrer.slice(0, 512) : undefined,
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 2000) : undefined,
      deviceType: body?.deviceType?.slice(0, 20),
      clientIp: typeof clientIp === 'string' ? clientIp : undefined,
    });
    return { ok: true };
  }

  @Post('track-event')
  @UseGuards(OptionalJwtGuard)
  async trackEvent(
    @Body() body: { sessionId?: string; eventType: string; page?: string; metadata?: Record<string, unknown> },
    @Req() req: Request,
  ) {
    const sessionId = body?.sessionId || (req.headers['x-session-id'] as string) || `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userId = (req as any).user?.id;

    const result = await this.tracking.trackEvent({
      sessionId: String(sessionId).slice(0, 64),
      userId,
      eventType: body.eventType,
      page: body?.page?.slice(0, 255),
      metadata: body?.metadata,
    });
    return result.ok ? { ok: true } : { ok: false, error: (result as any).error };
  }
}
