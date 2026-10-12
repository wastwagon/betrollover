import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  VIP_PACKAGE_DURATION_DAYS,
  VIP_PACKAGE_NAME,
  VIP_PACKAGE_PRICE,
  FORMER_FREE_DESK_USERNAMES,
  VIP_TIPSTER,
  VIP_TIPSTER_TYPE,
} from '../../config/vip-tipster.config';
import { VIP_PACKAGE_OWNER_USERNAME, VIP_ROSTER_USERNAMES } from '../../config/vip-roster.config';
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
    await this.renameFormerFreeDesk(config.username);
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
      constructions: ['home_win'],
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

    const owner = await this.tipsterRepo.findOne({
      where: { username: VIP_PACKAGE_OWNER_USERNAME },
      select: ['userId', 'username'],
    });
    const pkgResult = owner?.userId
      ? await this.ensureHouseVipPackage(owner.userId, user.id)
      : await this.ensurePackage(user.id);
    if (owner?.userId && pkgResult.id) {
      await this.applyAccessSwap(pkgResult.id, user.id);
    }
    this.logger.log(
      `VIP plan owner ${owner?.username || config.username}: package #${pkgResult.id} (free desk ${config.username} created=${created} updated=${updated})`,
    );
    return {
      created,
      updated,
      packageCreated: pkgResult.created,
      userId: user.id,
      packageId: pkgResult.id,
    };
  }

  /**
   * Keep the existing VIP package row (subscribers stay on the same id) and point it at AccaSure1X2.
   */
  private async ensureHouseVipPackage(
    ownerUserId: number,
    previousOwnerUserId: number,
  ): Promise<{ id: number; created: boolean }> {
    const freePkg = await this.packageRepo.findOne({
      where: { tipsterUserId: previousOwnerUserId },
      order: { createdAt: 'ASC' },
    });
    const ownerPkg = await this.packageRepo.findOne({
      where: { tipsterUserId: ownerUserId, status: 'active' },
      order: { createdAt: 'ASC' },
    });
    if (freePkg && freePkg.tipsterUserId !== ownerUserId) {
      freePkg.tipsterUserId = ownerUserId;
      freePkg.status = 'active';
      await this.normalizePackage(freePkg);
      if (ownerPkg && ownerPkg.id !== freePkg.id) {
        ownerPkg.status = 'inactive';
        await this.packageRepo.save(ownerPkg);
      }
      this.logger.log(`VIP package #${freePkg.id} now belongs to user ${ownerUserId}`);
      return { id: freePkg.id, created: false };
    }
    if (ownerPkg) {
      await this.normalizePackage(ownerPkg);
      return { id: ownerPkg.id, created: false };
    }
    return this.ensurePackage(ownerUserId);
  }

  /** Pending slips follow the swap. Settled archive stays public either way. */
  private async applyAccessSwap(packageId: number, freeUserId: number): Promise<void> {
    await this.packageRepo.manager.query(
      `UPDATE pick_marketplace pm
       SET placement = 'marketplace', subscription_package_id = NULL, price = 0, updated_at = NOW()
       FROM accumulator_tickets t
       WHERE pm.accumulator_id = t.id
         AND t.user_id = $1
         AND LOWER(COALESCE(t.result, 'pending')) = 'pending'`,
      [freeUserId],
    );
    await this.packageRepo.manager.query(
      `DELETE FROM subscription_coupon_access sca
       USING accumulator_tickets t
       WHERE sca.accumulator_id = t.id
         AND t.user_id = $1
         AND LOWER(COALESCE(t.result, 'pending')) = 'pending'`,
      [freeUserId],
    );
    await this.packageRepo.manager.query(
      `UPDATE accumulator_tickets
       SET price = 0, is_marketplace = true
       WHERE user_id = $1 AND LOWER(COALESCE(result, 'pending')) = 'pending'`,
      [freeUserId],
    );

    const roster = await this.tipsterRepo.find({
      where: VIP_ROSTER_USERNAMES.map((username) => ({ username })),
      select: ['userId'],
    });
    const rosterUserIds = roster.map((t) => t.userId).filter((id): id is number => id != null);
    if (!rosterUserIds.length) return;

    await this.packageRepo.manager.query(
      `UPDATE pick_marketplace pm
       SET placement = 'both', subscription_package_id = $1, price = 0, updated_at = NOW()
       FROM accumulator_tickets t
       WHERE pm.accumulator_id = t.id
         AND t.user_id = ANY($2::int[])
         AND LOWER(COALESCE(t.result, 'pending')) = 'pending'`,
      [packageId, rosterUserIds],
    );
    await this.packageRepo.manager.query(
      `UPDATE accumulator_tickets
       SET price = 0
       WHERE user_id = ANY($1::int[]) AND LOWER(COALESCE(result, 'pending')) = 'pending'`,
      [rosterUserIds],
    );
    await this.packageRepo.manager.query(
      `INSERT INTO subscription_coupon_access (subscription_package_id, accumulator_id)
       SELECT $1, t.id
       FROM accumulator_tickets t
       WHERE t.user_id = ANY($2::int[])
         AND LOWER(COALESCE(t.result, 'pending')) = 'pending'
       ON CONFLICT DO NOTHING`,
      [packageId, rosterUserIds],
    );
  }

  private async normalizePackage(existing: TipsterSubscriptionPackage): Promise<void> {
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

  /** Keep coupons on the same user when the free desk joins the Sure family name. */
  private async renameFormerFreeDesk(nextUsername: string): Promise<void> {
    const next = nextUsername.toLowerCase();
    for (const former of FORMER_FREE_DESK_USERNAMES) {
      if (former.toLowerCase() === next) continue;
      const oldTipster = await this.tipsterRepo
        .createQueryBuilder('t')
        .where('LOWER(t.username) = :oldName', { oldName: former.toLowerCase() })
        .getOne();
      if (!oldTipster) continue;
      const taken = await this.tipsterRepo
        .createQueryBuilder('t')
        .where('LOWER(t.username) = :nextName', { nextName: next })
        .andWhere('t.id <> :id', { id: oldTipster.id })
        .getOne();
      if (taken) {
        this.logger.warn(`Free desk rename skipped: ${nextUsername} already exists`);
        return;
      }
      await this.tipsterRepo.update(oldTipster.id, { username: nextUsername });
      if (oldTipster.userId) {
        const user = await this.userRepo.findOne({ where: { id: oldTipster.userId } });
        if (user) {
          const updates: Partial<User> = {};
          const formerNames = new Set(FORMER_FREE_DESK_USERNAMES.map((name) => name.toLowerCase()));
          if (formerNames.has((user.username || '').toLowerCase())) {
            updates.username = nextUsername;
          }
          const oldEmails = new Set(
            FORMER_FREE_DESK_USERNAMES.map((name) => `${name.toLowerCase()}@betrollover.internal`),
          );
          if (oldEmails.has((user.email || '').toLowerCase())) {
            updates.email = `${next}@betrollover.internal`;
          }
          if (Object.keys(updates).length > 0) {
            await this.userRepo.update(user.id, updates);
          }
        }
      }
      this.logger.log(`Renamed free desk ${former} → ${nextUsername}`);
      return;
    }
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
