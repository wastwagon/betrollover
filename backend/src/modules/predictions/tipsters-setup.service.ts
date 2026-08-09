import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tipster } from './entities/tipster.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { TipsterSubscriptionPackage } from '../subscriptions/entities/tipster-subscription-package.entity';
import { AI_TIPSTERS } from '../../config/ai-tipsters.config';

const DEFAULT_AI_PACKAGE_NAME = 'AI VIP Monthly';
const DEFAULT_AI_PACKAGE_PRICE = 49;
const DEFAULT_AI_PACKAGE_DURATION_DAYS = 30;
const DEFAULT_AI_PACKAGE_ROI_GUARANTEE_MIN = 20;
const DEFAULT_AI_PACKAGE_ROI_GUARANTEE_ENABLED = true;

@Injectable()
export class TipstersSetupService {
  private readonly logger = new Logger(TipstersSetupService.name);

  constructor(
    @InjectRepository(Tipster)
    private tipsterRepo: Repository<Tipster>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(TipsterSubscriptionPackage)
    private packageRepo: Repository<TipsterSubscriptionPackage>,
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
   * Initialize/sync AI tipsters from config (25 distinct strategies).
   * Idempotent: upserts by username, preserves existing stats.
   * Deactivates AI tipsters no longer in config; re-activates those restored to config.
   * Creates User records for marketplace display.
   */
  async initializeAiTipsters(): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    let packagesCreated = 0;
    let packagesFound = 0;
    const activeUsernames = new Set(AI_TIPSTERS.map((c) => c.username));

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
          // Re-enable tipsters restored to config after a prior retirement.
          isActive: true,
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

      const packageResult = await this.ensureDefaultPackageForAiTipsterUser(user.id);
      if (packageResult === 'created') packagesCreated++;
      else packagesFound++;
    }

    const retired = await this.tipsterRepo.find({ where: { isAi: true } });
    let deactivated = 0;
    for (const tipster of retired) {
      if (activeUsernames.has(tipster.username)) continue;
      if (!tipster.isActive) continue;
      await this.tipsterRepo.update(tipster.id, { isActive: false });
      deactivated++;
      this.logger.log(`Deactivated retired AI tipster: ${tipster.username}`);
    }

    this.logger.log(
      `AI tipsters initialized: ${created} created, ${updated} updated, ${deactivated} deactivated, packages ${packagesCreated} created / ${packagesFound} existing`,
    );
    return { created, updated };
  }

  private async ensureDefaultPackageForAiTipsterUser(
    tipsterUserId: number,
  ): Promise<'created' | 'existing'> {
    const existing = await this.packageRepo.findOne({
      where: { tipsterUserId },
      order: { createdAt: 'ASC' },
    });
    if (existing) return 'existing';

    const pkg = this.packageRepo.create({
      tipsterUserId,
      name: DEFAULT_AI_PACKAGE_NAME,
      price: DEFAULT_AI_PACKAGE_PRICE,
      durationDays: DEFAULT_AI_PACKAGE_DURATION_DAYS,
      roiGuaranteeEnabled: DEFAULT_AI_PACKAGE_ROI_GUARANTEE_ENABLED,
      roiGuaranteeMin: DEFAULT_AI_PACKAGE_ROI_GUARANTEE_MIN,
      status: 'active',
    });
    await this.packageRepo.save(pkg);
    return 'created';
  }
}
