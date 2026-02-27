import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
/* eslint-disable @typescript-eslint/no-require-imports */
const geoip = require('geoip-lite') as { lookup: (ip: string) => { country: string } | null };
const UAParser = require('ua-parser-js') as new (ua?: string) => { getResult: () => { device?: { type?: string } } };
import { VisitorSession } from './entities/visitor-session.entity';
import { AnalyticsEvent } from './entities/analytics-event.entity';

/** Allowed custom event types - prevents arbitrary strings */
export const ANALYTICS_EVENT_TYPES = [
  'purchase_completed',
  'followed_tipster',
  'unfollowed_tipster',
  'coupon_viewed',
  'coupon_purchased',
  'registration_started',
  'registration_completed',
  'language_change',
  'currency_change',
  'account_menu_open',
] as const;

@Injectable()
export class AnalyticsTrackingService {
  constructor(
    @InjectRepository(VisitorSession)
    private visitorRepo: Repository<VisitorSession>,
    @InjectRepository(AnalyticsEvent)
    private eventRepo: Repository<AnalyticsEvent>,
    private config: ConfigService,
  ) {}

  /** Derive device type from user-agent: mobile, tablet, desktop */
  private parseDeviceType(userAgent: string | undefined): string | null {
    if (!userAgent) return null;
    try {
      const ua = new UAParser(userAgent).getResult();
      const device = ua.device?.type; // mobile, tablet, wearable, etc.
      if (device === 'mobile' || device === 'wearable') return 'mobile';
      if (device === 'tablet') return 'tablet';
      return 'desktop';
    } catch {
      return null;
    }
  }

  /** Get country code from IP using geoip-lite */
  private getCountryFromIp(ip: string | undefined): string | null {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) return null;
    try {
      const geo = geoip.lookup(ip);
      return geo?.country ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Record a page view / session. Call from frontend on page load.
   * No auth required - works for anonymous and logged-in users.
   * Populates country (Geo-IP) and deviceType (UA parse) when available.
   */
  async trackPageView(data: {
    sessionId: string;
    userId?: number;
    page?: string;
    referrer?: string;
    userAgent?: string;
    country?: string;
    deviceType?: string;
    clientIp?: string;
  }) {
    const country = data.country ?? this.getCountryFromIp(data.clientIp);
    const deviceType = data.deviceType ?? this.parseDeviceType(data.userAgent);

    const session = this.visitorRepo.create({
      sessionId: data.sessionId,
      userId: data.userId ?? null,
      page: data.page ?? null,
      referrer: data.referrer ?? null,
      userAgent: data.userAgent ?? null,
      country,
      deviceType,
    });
    await this.visitorRepo.save(session);
    return { ok: true };
  }

  /**
   * Record a custom event. Unifies with visitor_sessions via sessionId.
   */
  async trackEvent(data: {
    sessionId: string;
    userId?: number;
    eventType: string;
    page?: string;
    metadata?: Record<string, unknown>;
  }) {
    const allowed = ANALYTICS_EVENT_TYPES.includes(data.eventType as (typeof ANALYTICS_EVENT_TYPES)[number]);
    if (!allowed) return { ok: false, error: 'Invalid event type' };

    const event = this.eventRepo.create({
      sessionId: data.sessionId.slice(0, 64),
      userId: data.userId ?? null,
      eventType: data.eventType,
      page: data.page?.slice(0, 255) ?? null,
      metadata: data.metadata ?? null,
    });
    await this.eventRepo.save(event);
    return { ok: true };
  }

  /**
   * Data retention: delete old visitor_sessions and analytics_events.
   * Run via cron. Default retention 90 days (configurable via ANALYTICS_RETENTION_DAYS).
   */
  async pruneOldData(retentionDays = 90): Promise<{ visitorSessionsDeleted: number; eventsDeleted: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const [vsResult, evResult] = await Promise.all([
      this.visitorRepo
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoff', { cutoff })
        .execute(),
      this.eventRepo
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoff', { cutoff })
        .execute(),
    ]);
    return {
      visitorSessionsDeleted: vsResult.affected ?? 0,
      eventsDeleted: evResult.affected ?? 0,
    };
  }

  /** Weekly retention prune - Sundays at 3 AM */
  @Cron('0 3 * * 0')
  async runRetentionPrune(): Promise<void> {
    const days = this.config.get<number>('ANALYTICS_RETENTION_DAYS', 90);
    const result = await this.pruneOldData(days);
    if (result.visitorSessionsDeleted > 0 || result.eventsDeleted > 0) {
      console.log(`[Analytics] Retention prune: ${result.visitorSessionsDeleted} sessions, ${result.eventsDeleted} events deleted (older than ${days}d)`);
    }
  }
}
