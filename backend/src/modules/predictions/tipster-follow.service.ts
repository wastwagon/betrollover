import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipsterFollow } from './entities/tipster-follow.entity';
import { Tipster } from './entities/tipster.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TipsterFollowService {
  constructor(
    @InjectRepository(TipsterFollow)
    private followRepo: Repository<TipsterFollow>,
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    private notificationsService: NotificationsService,
  ) {}

  async follow(userId: number, username: string): Promise<{ success: boolean }> {
    const tipster = await this.tipsterRepo.findOne({ where: { username } });
    if (!tipster) throw new NotFoundException('Tipster not found');

    const existing = await this.followRepo.findOne({
      where: { userId, tipsterId: tipster.id },
    });
    if (existing) throw new ConflictException('Already following this tipster');

    await this.followRepo.save({ userId, tipsterId: tipster.id });

    if (tipster.userId && tipster.userId !== userId) {
      await this.notificationsService.create({
        userId: tipster.userId,
        type: 'new_follower',
        title: 'New Follower',
        message: 'Someone started following you on BetRollover.',
        link: `/tipsters/${tipster.username}`,
        icon: 'user-plus',
        sendEmail: true,
      }).catch(() => {});
    }

    return { success: true };
  }

  async unfollow(userId: number, username: string): Promise<{ success: boolean }> {
    const tipster = await this.tipsterRepo.findOne({ where: { username } });
    if (!tipster) throw new NotFoundException('Tipster not found');

    await this.followRepo.delete({ userId, tipsterId: tipster.id });
    return { success: true };
  }

  async isFollowing(userId: number, tipsterId: number): Promise<boolean> {
    const found = await this.followRepo.findOne({
      where: { userId, tipsterId },
    });
    return !!found;
  }

  async getFollowedTipsters(userId: number): Promise<{ id: number; username: string; displayName: string; avatarUrl: string | null }[]> {
    const follows = await this.followRepo.find({
      where: { userId },
      relations: ['tipster'],
      select: { tipster: { id: true, username: true, displayName: true, avatarUrl: true } },
    });
    return follows.map((f) => ({
      id: f.tipster.id,
      username: f.tipster.username,
      displayName: f.tipster.displayName,
      avatarUrl: f.tipster.avatarUrl,
    }));
  }
}
