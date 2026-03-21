import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { TipsterFollow } from '../predictions/entities/tipster-follow.entity';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';

const PUSH_NOTIFICATION_TYPES = new Set([
  'subscription', 'subscription_refund', 'subscription_payout',
  'pick_published', 'new_pick_from_followed', 'settlement', 'subscription_payout',
]);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(TipsterFollow)
    private tipsterFollowRepo: Repository<TipsterFollow>,
    private emailService: EmailService,
    @Optional() private pushService?: PushService,
  ) {}

  async list(userId: number, limit = 20) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['id', 'type', 'title', 'message', 'link', 'icon', 'isRead', 'createdAt'],
    });
  }

  async markRead(userId: number, id: number) {
    const n = await this.repo.findOne({ where: { id, userId } });
    if (!n) throw new NotFoundException('Notification not found');
    n.isRead = true;
    n.readAt = new Date();
    await this.repo.save(n);
    return { ok: true };
  }

  async create(data: {
    userId: number;
    type: string;
    title: string;
    message: string;
    link?: string;
    icon?: string;
    sendEmail?: boolean;
    /** If true, send email whenever user has an email address (bypasses emailNotifications). Use for follower new-pick alerts. */
    alwaysSendEmail?: boolean;
    metadata?: Record<string, string>;
  }) {
    const n = this.repo.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link ?? null,
      icon: data.icon ?? 'bell',
    });
    await this.repo.save(n);

    if (this.pushService && PUSH_NOTIFICATION_TYPES.has(data.type)) {
      this.pushService
        .sendToUser(data.userId, {
          title: data.title,
          body: data.message,
          link: data.link ?? undefined,
          icon: data.icon,
        })
        .catch(() => {});
    }

    if (data.sendEmail) {
      const user = await this.userRepo.findOne({
        where: { id: data.userId },
        select: ['email', 'emailNotifications'],
      });
      if (
        user?.email &&
        (user.emailNotifications || data.alwaysSendEmail === true)
      ) {
        this.emailService
          .sendNotificationEmail(user.email, {
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link ?? undefined,
            metadata: {
              ...data.metadata,
              ...(data.alwaysSendEmail ? { followerAlert: '1' } : {}),
            },
          })
          .catch((err) => this.logger.warn(`Notification email failed for user ${data.userId}: ${err}`));
      }
    }
    return n;
  }

  /**
   * In-app + email + push for every user following this tipster (except the creator).
   * Used for human marketplace coupons and AI prediction → marketplace sync.
   */
  async notifyFollowersOfNewCoupon(params: {
    tipsterId: number;
    tipsterUserId: number;
    tipsterDisplayName: string;
    pickTitle: string;
    price: number;
    accumulatorId: number;
  }): Promise<void> {
    const follows = await this.tipsterFollowRepo.find({
      where: { tipsterId: params.tipsterId },
      select: ['userId'],
    });
    const followerIds = follows.map((f: TipsterFollow) => f.userId).filter((id: number) => id !== params.tipsterUserId);
    if (followerIds.length === 0) return;

    const tipsterName = params.tipsterDisplayName || 'A tipster';
    const price = Number(params.price) || 0;
    const link = `/coupons/${params.accumulatorId}`;
    const message = `${tipsterName} posted a new pick "${params.pickTitle}"${price > 0 ? ` at GHS ${price.toFixed(2)}` : ' (free)'}.`;

    for (const followerId of followerIds) {
      await this.create({
        userId: followerId,
        type: 'new_pick_from_followed',
        title: 'New Pick from Tipster You Follow',
        message,
        link,
        icon: 'bell',
        sendEmail: true,
        alwaysSendEmail: true,
        metadata: { tipsterName, pickTitle: params.pickTitle },
      }).catch((err) => this.logger.warn(`notifyFollowersOfNewCoupon: user ${followerId} ${err}`));
    }
  }
}
