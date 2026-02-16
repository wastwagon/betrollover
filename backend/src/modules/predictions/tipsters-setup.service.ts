import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tipster } from './entities/tipster.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { AI_TIPSTERS } from '../../config/ai-tipsters.config';

@Injectable()
export class TipstersSetupService {
  private readonly logger = new Logger(TipstersSetupService.name);

  constructor(
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Ensure a tipster has a linked User (for marketplace). Creates one if missing.
   * Syncs avatar, bio, isVerified so User profile qualifies as real tipster.
   */
  async ensureTipsterHasUser(tipster: Tipster): Promise<User | null> {
    const user = await this.getOrCreateTipsterUser(tipster.username, tipster.displayName, tipster.avatarUrl, tipster.bio);
    if (!tipster.userId) {
      await this.tipsterRepo.update(tipster.id, { userId: user.id });
      tipster.userId = user.id;
      this.logger.debug(`Linked tipster ${tipster.username} to user ${user.id}`);
    }
    return user;
  }

  /**
   * Get or create a User for a tipster (marketplace display).
   * Sets all fields to qualify as real tipster: avatar, bio, isVerified, status.
   */
  private async getOrCreateTipsterUser(
    username: string,
    displayName: string,
    avatarUrl?: string | null,
    bio?: string | null,
  ): Promise<User> {
    const email = `${username.toLowerCase()}@betrollover.internal`;
    let user = await this.userRepo.findOne({ where: { email } });
    if (user) {
      const updates: Partial<User> = {};
      if (displayName !== undefined) updates.displayName = displayName;
      if (avatarUrl !== undefined) updates.avatar = avatarUrl || null;
      if (bio !== undefined) updates.bio = bio || null;
      if (!user.isVerified) updates.isVerified = true;
      if (user.status !== UserStatus.ACTIVE) updates.status = UserStatus.ACTIVE;
      if (Object.keys(updates).length > 0) {
        await this.userRepo.update(user.id, updates);
        Object.assign(user, updates);
      }
      return user;
    }

    const hashedPassword = await bcrypt.hash(`tipster-${username}-${Date.now()}`, 12);
    user = this.userRepo.create({
      email,
      username,
      password: hashedPassword,
      displayName,
      avatar: avatarUrl || null,
      bio: bio || null,
      role: UserRole.TIPSTER,
      status: UserStatus.ACTIVE,
      isVerified: true,
    });
    return this.userRepo.save(user);
  }

  /**
   * Initialize/sync 25 AI tipsters from config.
   * Idempotent: upserts by username, preserves existing stats.
   * Creates User records for marketplace display.
   */
  async initializeAiTipsters(): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const config of AI_TIPSTERS) {
      const existing = await this.tipsterRepo.findOne({
        where: { username: config.username },
      });

      const user = await this.getOrCreateTipsterUser(
        config.username,
        config.display_name,
        config.avatar_url,
        config.bio,
      );

      const personalityProfile = JSON.parse(
        JSON.stringify(config.personality),
      ) as Record<string, unknown>;

      const payload = {
        username: config.username,
        displayName: config.display_name,
        bio: config.bio,
        avatarUrl: config.avatar_url,
        isAi: true,
        tipsterType: 'ai',
        personalityProfile,
        isActive: true,
        userId: user.id,
      };

      if (existing) {
        await this.tipsterRepo.update(existing.id, {
          displayName: payload.displayName,
          bio: payload.bio,
          avatarUrl: payload.avatarUrl,
          isAi: payload.isAi,
          tipsterType: payload.tipsterType,
          personalityProfile: personalityProfile as any,
          isActive: payload.isActive,
          userId: payload.userId,
        });
        updated++;
        this.logger.debug(`Updated: ${config.display_name}`);
      } else {
        await this.tipsterRepo.save({
          ...payload,
          joinDate: new Date(),
        });
        created++;
        this.logger.debug(`Created: ${config.display_name}`);
      }
    }

    this.logger.log(`AI tipsters initialized: ${created} created, ${updated} updated`);
    return { created, updated };
  }
}
