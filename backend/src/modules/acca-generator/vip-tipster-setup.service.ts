import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  VIP_PACKAGE_DURATION_DAYS,
  VIP_PACKAGE_NAME,
  VIP_PACKAGE_PRICE,
  VIP_TIPSTER,
  VIP_TIPSTER_TYPE,
} from '../../config/vip-tipster.config';
import { Tipster } from '../predictions/entities/tipster.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { TipsterSubscriptionPackage } from '../subscriptions/entities/tipster-subscription-package.entity';

@Injectable()
export class VipTipsterSetupService {
  private readonly logger = new Logger(VipTipsterSetupService.name);

  constructor(
    @InjectRepository(Tipster)
    private readonly tipsterRepo: Repository<Tipster>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TipsterSubscriptionPackage)
    private readonly packageRepo: Repository<TipsterSubscriptionPackage>,
  ) {}

  /** Idempotent: VIP user + tipster row + monthly package. Does not touch Acca Desk. */
  async initializeVipTipster(): Promise<{
    created: boolean;
    updated: boolean;
    packageCreated: boolean;
    userId: number;
    packageId: number | null;
  }> {
    const config = VIP_TIPSTER;
    const user = await this.getOrCreateTipsterUser(
      config.username,
      config.display_name,
      config.avatar_url,
      config.bio,
    );

    const personalityProfile = {
      source: 'vip_desk',
      strategy_id: config.strategy_id,
      legs: config.legs,
      constructions: ['home_draw', 'brazil_over15'],
    };

    const existing = await this.tipsterRepo.findOne({ where: { username: config.username } });
    let created = false;
    let updated = false;
    if (existing) {
      await this.tipsterRepo.update(existing.id, {
        displayName: config.display_name,
        bio: config.bio,
        avatarUrl: config.avatar_url,
        isAi: true,
        tipsterType: VIP_TIPSTER_TYPE,
        personalityProfile: personalityProfile as any,
        isActive: true,
        userId: user.id,
      });
      updated = true;
    } else {
      await this.tipsterRepo.save({
        username: config.username,
        displayName: config.display_name,
        bio: config.bio,
        avatarUrl: config.avatar_url,
        isAi: true,
        tipsterType: VIP_TIPSTER_TYPE,
        personalityProfile,
        isActive: true,
        userId: user.id,
        joinDate: new Date(),
      });
      created = true;
    }

    const pkgResult = await this.ensurePackage(user.id);
    this.logger.log(
      `VIP tipster ${config.username}: created=${created} updated=${updated} package=${pkgResult.created ? 'created' : 'existing'} #${pkgResult.id}`,
    );
    return {
      created,
      updated,
      packageCreated: pkgResult.created,
      userId: user.id,
      packageId: pkgResult.id,
    };
  }

  private async ensurePackage(tipsterUserId: number): Promise<{ id: number; created: boolean }> {
    const existing = await this.packageRepo.findOne({
      where: { tipsterUserId },
      order: { createdAt: 'ASC' },
    });
    if (existing) {
      let dirty = false;
      if (existing.status !== 'active') {
        existing.status = 'active';
        dirty = true;
      }
      if (Number(existing.price) !== VIP_PACKAGE_PRICE) {
        existing.price = VIP_PACKAGE_PRICE;
        dirty = true;
      }
      if (existing.name !== VIP_PACKAGE_NAME) {
        existing.name = VIP_PACKAGE_NAME;
        dirty = true;
      }
      if (existing.durationDays !== VIP_PACKAGE_DURATION_DAYS) {
        existing.durationDays = VIP_PACKAGE_DURATION_DAYS;
        dirty = true;
      }
      if (existing.roiGuaranteeEnabled) {
        existing.roiGuaranteeEnabled = false;
        existing.roiGuaranteeMin = null;
        dirty = true;
      }
      if (dirty) await this.packageRepo.save(existing);
      return { id: existing.id, created: false };
    }
    const pkg = this.packageRepo.create({
      tipsterUserId,
      name: VIP_PACKAGE_NAME,
      price: VIP_PACKAGE_PRICE,
      durationDays: VIP_PACKAGE_DURATION_DAYS,
      roiGuaranteeEnabled: false,
      roiGuaranteeMin: null,
      status: 'active',
    });
    const saved = await this.packageRepo.save(pkg);
    return { id: saved.id, created: true };
  }

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
      if (user.role !== UserRole.TIPSTER) updates.role = UserRole.TIPSTER;
      if (Object.keys(updates).length > 0) {
        await this.userRepo.update(user.id, updates);
        Object.assign(user, updates);
      }
      return user;
    }

    const hashedPassword = await bcrypt.hash(`vip-desk-${username}-${Date.now()}`, 12);
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
}
