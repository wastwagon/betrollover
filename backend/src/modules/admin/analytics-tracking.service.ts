import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitorSession } from './entities/visitor-session.entity';

@Injectable()
export class AnalyticsTrackingService {
  constructor(
    @InjectRepository(VisitorSession)
    private visitorRepo: Repository<VisitorSession>,
  ) {}

  /**
   * Record a page view / session. Call from frontend on page load.
   * No auth required - works for anonymous and logged-in users.
   */
  async trackPageView(data: {
    sessionId: string;
    userId?: number;
    page?: string;
    referrer?: string;
    userAgent?: string;
    country?: string;
  }) {
    const session = this.visitorRepo.create({
      sessionId: data.sessionId,
      userId: data.userId ?? null,
      page: data.page ?? null,
      referrer: data.referrer ?? null,
      userAgent: data.userAgent ?? null,
      country: data.country ?? null,
    });
    await this.visitorRepo.save(session);
    return { ok: true };
  }
}
