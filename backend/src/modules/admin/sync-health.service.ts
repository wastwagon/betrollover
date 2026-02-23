import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { isSportEnabled } from '../../config/sports.config';

/** Sports that are expected to sync daily */
const MONITORED_SPORTS = [
  'basketball',
  'rugby',
  'mma',
  'volleyball',
  'hockey',
  'american_football',
  'tennis',
] as const;

/** Hours after which a sync is considered stale */
const STALE_HOURS = 25;

@Injectable()
export class SyncHealthService {
  private readonly logger = new Logger(SyncHealthService.name);

  constructor(
    @InjectRepository(SportEvent)
    private readonly sportEventRepo: Repository<SportEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Run every hour at :05 past the hour */
  @Cron('5 * * * *')
  async checkSyncHealth(): Promise<void> {
    const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
    const staleSports: string[] = [];

    for (const sport of MONITORED_SPORTS) {
      if (!isSportEnabled(sport)) continue;

      const latest = await this.sportEventRepo
        .createQueryBuilder('e')
        .select('MAX(e.syncedAt)', 'lastSync')
        .where('e.sport = :sport', { sport })
        .getRawOne<{ lastSync: string | null }>();

      const lastSync = latest?.lastSync ? new Date(latest.lastSync) : null;

      if (!lastSync || lastSync < staleThreshold) {
        const hoursAgo = lastSync
          ? Math.round((Date.now() - lastSync.getTime()) / 3_600_000)
          : null;
        const msg = lastSync
          ? `${sport} last synced ${hoursAgo}h ago (threshold: ${STALE_HOURS}h)`
          : `${sport} has never been synced`;
        this.logger.warn(`[SyncHealth] STALE: ${msg}`);
        staleSports.push(`${sport} (${lastSync ? `${hoursAgo}h ago` : 'never'})`);
      } else {
        const hoursAgo = Math.round((Date.now() - lastSync.getTime()) / 3_600_000);
        this.logger.debug(`[SyncHealth] OK: ${sport} last synced ${hoursAgo}h ago`);
      }
    }

    if (staleSports.length === 0) return;

    // Notify all admins
    const admins = await this.userRepo.find({
      where: { role: UserRole.ADMIN },
      select: ['id'],
    });

    const message = `The following sports have stale data (>${STALE_HOURS}h since last sync): ${staleSports.join(', ')}. Go to Admin → Sports to trigger a manual sync.`;

    await Promise.all(
      admins.map((admin) =>
        this.notificationsService.create({
          userId: admin.id,
          type: 'system',
          title: 'Sport Sync Health Warning',
          message,
          link: '/admin/sports',
          icon: 'warning',
        }).catch((err) => this.logger.error(`Failed to notify admin ${admin.id}`, err)),
      ),
    );
  }

  /** Returns current health status for the admin dashboard */
  async getStatus(): Promise<Array<{ sport: string; lastSync: Date | null; stale: boolean; hoursAgo: number | null }>> {
    const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
    const results = [];

    for (const sport of MONITORED_SPORTS) {
      const row = await this.sportEventRepo
        .createQueryBuilder('e')
        .select('MAX(e.syncedAt)', 'lastSync')
        .where('e.sport = :sport', { sport })
        .getRawOne<{ lastSync: string | null }>();

      const lastSync = row?.lastSync ? new Date(row.lastSync) : null;
      const stale = !lastSync || lastSync < staleThreshold;
      const hoursAgo = lastSync ? Math.round((Date.now() - lastSync.getTime()) / 3_600_000) : null;

      results.push({ sport, lastSync, stale, hoursAgo });
    }

    return results;
  }
}
