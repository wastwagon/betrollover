import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  ACCA_DESK_TIPSTERS,
  ACCA_DESK_TIPSTER_TYPE,
} from '../../config/acca-desk-tipsters.config';
import { Tipster } from '../predictions/entities/tipster.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';

@Injectable()
export class AccaDeskSetupService {
  private readonly logger = new Logger(AccaDeskSetupService.name);

  constructor(
    @InjectRepository(Tipster)
    private readonly tipsterRepo: Repository<Tipster>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Idempotent upsert of the 15 Acca Desk tipsters + linked tipster users.
   * Does not touch classic AI tipsters (tipsterType=ai).
   */
  async initializeAccaDeskTipsters(): Promise<{ created: number; updated: number; total: number }> {
    let created = 0;
    let updated = 0;
    const activeUsernames = new Set(ACCA_DESK_TIPSTERS.map((c) => c.username));

    for (const config of ACCA_DESK_TIPSTERS) {
      const user = await this.getOrCreateTipsterUser(
        config.username,
        config.display_name,
        config.avatar_url,
        config.bio,
      );

      const personalityProfile = {
        source: 'acca_desk',
        strategy_id: config.strategy_id,
        riskLevel: config.riskLevel,
        markets: config.markets,
        legs: config.legs,
      };

      const existing = await this.tipsterRepo.findOne({ where: { username: config.username } });
      const payload = {
        username: config.username,
        displayName: config.display_name,
        bio: config.bio,
        avatarUrl: config.avatar_url,
        isAi: true,
        tipsterType: ACCA_DESK_TIPSTER_TYPE,
        personalityProfile,
        isActive: true,
        userId: user.id,
      };

      if (existing) {
        await this.tipsterRepo.update(existing.id, {
          displayName: payload.displayName,
          bio: payload.bio,
          avatarUrl: payload.avatarUrl,
          isAi: true,
          tipsterType: ACCA_DESK_TIPSTER_TYPE,
          personalityProfile: personalityProfile as any,
          isActive: true,
          userId: user.id,
        });
        updated++;
      } else {
        await this.tipsterRepo.save({
          ...payload,
          joinDate: new Date(),
        });
        created++;
      }
    }

    const deskRows = await this.tipsterRepo.find({ where: { tipsterType: ACCA_DESK_TIPSTER_TYPE } });
    let deactivated = 0;
    for (const tipster of deskRows) {
      if (activeUsernames.has(tipster.username)) continue;
      if (!tipster.isActive) continue;
      await this.tipsterRepo.update(tipster.id, { isActive: false });
      deactivated++;
      this.logger.log(`Deactivated retired Acca Desk tipster: ${tipster.username}`);
    }

    this.logger.log(
      `Acca Desk tipsters: ${created} created, ${updated} updated, ${deactivated} deactivated (roster ${ACCA_DESK_TIPSTERS.length})`,
    );
    return { created, updated, total: ACCA_DESK_TIPSTERS.length };
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

    const hashedPassword = await bcrypt.hash(`acca-desk-${username}-${Date.now()}`, 12);
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
