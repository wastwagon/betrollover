import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  /**
   * Users who follow this tipster (newest first). Optional viewer id adds follow-back hints.
   */
  async getFollowersOfTipster(
    tipsterUsername: string,
    viewerUserId: number | undefined,
    limit: number,
    offset: number,
  ): Promise<{
    total: number;
    followers: Array<{
      user_id: number;
      display_name: string;
      username: string;
      avatar_url: string | null;
      tipster_username: string | null;
      tipster_id: number | null;
      you_follow_them: boolean;
      is_self: boolean;
      followed_at: string;
    }>;
  }> {
    const tipster = await this.tipsterRepo.findOne({ where: { username: tipsterUsername } });
    if (!tipster) throw new NotFoundException('Tipster not found');

    const [rows, total] = await this.followRepo.findAndCount({
      where: { tipsterId: tipster.id },
      relations: ['user'],
      order: { followedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const followerUserIds = rows.map((r) => r.userId);
    let tipsterByUserId = new Map<number, { id: number; username: string }>();
    if (followerUserIds.length > 0) {
      const tipstersForUsers = await this.tipsterRepo.find({
        where: { userId: In(followerUserIds) },
        select: { id: true, userId: true, username: true },
      });
      tipsterByUserId = new Map(
        tipstersForUsers.filter((t) => t.userId != null).map((t) => [t.userId as number, { id: t.id, username: t.username }]),
      );
    }

    let followingTipsterIds = new Set<number>();
    if (viewerUserId && tipsterByUserId.size > 0) {
      const tipsterIds = [...tipsterByUserId.values()].map((x) => x.id);
      const vf = await this.followRepo.find({
        where: { userId: viewerUserId, tipsterId: In(tipsterIds) },
        select: { tipsterId: true },
      });
      followingTipsterIds = new Set(vf.map((f) => f.tipsterId));
    }

    return {
      total,
      followers: rows.map((r) => {
        const tinfo = tipsterByUserId.get(r.userId);
        const tipsterId = tinfo?.id ?? null;
        const tipsterUsernameOut = tinfo?.username ?? null;
        const youFollow = tipsterId != null && followingTipsterIds.has(tipsterId);
        return {
          user_id: r.userId,
          display_name: r.user.displayName,
          username: r.user.username,
          avatar_url: r.user.avatar,
          tipster_username: tipsterUsernameOut,
          tipster_id: tipsterId,
          you_follow_them: youFollow,
          is_self: viewerUserId != null && r.userId === viewerUserId,
          followed_at: r.followedAt.toISOString(),
        };
      }),
    };
  }
}
