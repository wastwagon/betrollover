import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private emailService: EmailService,
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
