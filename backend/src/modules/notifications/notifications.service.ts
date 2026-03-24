import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { TipsterFollow } from '../predictions/entities/tipster-follow.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
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
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    private emailService: EmailService,
    @Optional() private pushService?: PushService,
  ) {}

  private async getTipsterFormSnapshot(tipsterUserId: number): Promise<{
    label: string;
    winRate: string;
    roi: string;
    streak: string;
    totalPicks: string;
    asOf: string;
  } | null> {
    const tipster = await this.tipsterRepo.findOne({
      where: { userId: tipsterUserId },
      select: ['winRate', 'roi', 'currentStreak', 'totalPredictions', 'updatedAt'],
    });
    if (!tipster) return null;
    const winRate = Number(tipster.winRate ?? 0).toFixed(1);
    const roi = Number(tipster.roi ?? 0).toFixed(2);
    const streak = Number(tipster.currentStreak ?? 0);
    const totalPicks = String(Number(tipster.totalPredictions ?? 0));
    const asOf = (tipster.updatedAt ?? new Date()).toISOString();
    const streakLabel = streak >= 0 ? `W${streak}` : `L${Math.abs(streak)}`;
    return {
      label: `Form: ${winRate}% Win Rate · ROI ${roi}% · Streak ${streakLabel} · ${totalPicks} picks`,
      winRate,
      roi,
      streak: streakLabel,
      totalPicks,
      asOf,
    };
  }

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
      metadata: data.metadata ?? null,
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
    couponCard?: {
      totalOdds: number;
      legs: Array<{
        matchDescription: string;
        prediction: string;
        odds: number;
        matchDate?: string | null;
      }>;
      isSubscription?: boolean;
    };
  }): Promise<void> {
    const follows = await this.tipsterFollowRepo.find({
      where: { tipsterId: params.tipsterId },
      select: ['userId'],
    });
    const followerIds = follows.map((f: TipsterFollow) => f.userId).filter((id: number) => id !== params.tipsterUserId);
    if (followerIds.length === 0) return;

    const tipsterName = params.tipsterDisplayName || 'A tipster';
    const tipsterForm = await this.getTipsterFormSnapshot(params.tipsterUserId);
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
        sendEmail: !params.couponCard,
        alwaysSendEmail: !params.couponCard,
        metadata: {
          tipsterName,
          pickTitle: params.pickTitle,
          ...(tipsterForm
            ? {
                tipsterForm: tipsterForm.label,
                tipsterWinRate: tipsterForm.winRate,
                tipsterRoi: tipsterForm.roi,
                tipsterStreak: tipsterForm.streak,
                tipsterTotalPicks: tipsterForm.totalPicks,
                tipsterFormAsOf: tipsterForm.asOf,
              }
            : {}),
          audience: 'followers',
          deliveryMode: params.couponCard ? 'detailed_card' : 'teaser',
        },
      }).catch((err) => this.logger.warn(`notifyFollowersOfNewCoupon: user ${followerId} ${err}`));

      if (params.couponCard) {
        try {
          const user = await this.userRepo.findOne({
            where: { id: followerId },
            select: ['email', 'emailNotifications'],
          });
          if (user?.email && user.emailNotifications) {
            await this.emailService.sendCouponCardEmail(user.email, {
              tipsterName,
              couponTitle: params.pickTitle,
              tipsterForm: tipsterForm?.label,
              tipsterFormAsOf: tipsterForm?.asOf,
              totalOdds: params.couponCard.totalOdds,
              price,
              link,
              legs: params.couponCard.legs,
              isSubscription: params.couponCard.isSubscription ?? false,
            });
          }
        } catch (err) {
          this.logger.warn(`notifyFollowersOfNewCoupon email card failed for user ${followerId}: ${err}`);
        }
      }
    }
  }

  /**
   * Notify explicit users (e.g., paid subscribers) about a subscription-only coupon.
   * Does not use follower graph.
   */
  async notifyUsersOfSubscriptionCoupon(params: {
    recipientUserIds: number[];
    tipsterUserId: number;
    tipsterDisplayName: string;
    pickTitle: string;
    accumulatorId: number;
    couponCard: {
      totalOdds: number;
      legs: Array<{
        matchDescription: string;
        prediction: string;
        odds: number;
        matchDate?: string | null;
      }>;
    };
  }): Promise<void> {
    const recipients = [...new Set((params.recipientUserIds || []).filter((id) => id !== params.tipsterUserId))];
    if (recipients.length === 0) return;
    const tipsterName = params.tipsterDisplayName || 'A tipster';
    const tipsterForm = await this.getTipsterFormSnapshot(params.tipsterUserId);
    const link = `/coupons/${params.accumulatorId}`;
    const message = `${tipsterName} posted a new subscribers-only coupon "${params.pickTitle}".`;

    for (const userId of recipients) {
      await this.create({
        userId,
        type: 'subscription',
        title: 'New Subscribers-Only Coupon',
        message,
        link,
        icon: 'star',
        sendEmail: false,
        metadata: {
          tipsterName,
          pickTitle: params.pickTitle,
          ...(tipsterForm
            ? {
                tipsterForm: tipsterForm.label,
                tipsterWinRate: tipsterForm.winRate,
                tipsterRoi: tipsterForm.roi,
                tipsterStreak: tipsterForm.streak,
                tipsterTotalPicks: tipsterForm.totalPicks,
                tipsterFormAsOf: tipsterForm.asOf,
              }
            : {}),
          audience: 'subscribers',
          deliveryMode: 'detailed_card',
        },
      }).catch((err) => this.logger.warn(`notifyUsersOfSubscriptionCoupon: user ${userId} ${err}`));

      try {
        const user = await this.userRepo.findOne({
          where: { id: userId },
          select: ['email', 'emailNotifications'],
        });
        if (user?.email && user.emailNotifications) {
          await this.emailService.sendCouponCardEmail(user.email, {
            tipsterName,
            couponTitle: params.pickTitle,
            tipsterForm: tipsterForm?.label,
            tipsterFormAsOf: tipsterForm?.asOf,
            totalOdds: params.couponCard.totalOdds,
            price: 0,
            link,
            legs: params.couponCard.legs,
            isSubscription: true,
          });
        }
      } catch (err) {
        this.logger.warn(`notifyUsersOfSubscriptionCoupon email failed for user ${userId}: ${err}`);
      }
    }
  }
}
