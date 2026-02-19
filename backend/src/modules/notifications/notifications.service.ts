import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';

const PUSH_NOTIFICATION_TYPES = new Set([
  'subscription', 'subscription_refund', 'subscription_payout',
  'pick_published', 'new_pick_from_followed', 'settlement', 'subscription_payout',
]);

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
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
      if (user?.email && user.emailNotifications) {
        this.emailService.sendNotificationEmail(user.email, {
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link ?? undefined,
          metadata: data.metadata,
        }).catch(() => {});
      }
    }
    return n;
  }
}
