import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { TipsterSubscriptionPackage } from './entities/tipster-subscription-package.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionEscrow } from './entities/subscription-escrow.entity';
import { SubscriptionCouponAccess } from './entities/subscription-coupon-access.entity';
import { RoiGuaranteeRefund } from './entities/roi-guarantee-refund.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Tipster } from '../predictions/entities/tipster.entity';
import { User } from '../users/entities/user.entity';
import { TipsterService } from '../tipster/tipster.service';
import { ApiSettings } from '../admin/entities/api-settings.entity';

const DEFAULT_SUBSCRIPTION_ROI_GUARANTEE_MIN = 20;
const DEFAULT_SUBSCRIPTION_ROI_GUARANTEE_ENABLED = true;

export interface CreatePackageDto {
  name: string;
  price: number;
  durationDays?: number;
  roiGuaranteeMin?: number | null;
  roiGuaranteeEnabled?: boolean;
}

export interface UpdatePackageDto {
  name?: string;
  price?: number;
  durationDays?: number;
  roiGuaranteeMin?: number | null;
  roiGuaranteeEnabled?: boolean;
  status?: 'active' | 'inactive';
}

/** Max subscription-placement coupons per package per rolling window (window = package duration days). */
const MAX_SUBSCRIPTION_COUPONS_PER_WINDOW = 2;

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(TipsterSubscriptionPackage)
    private readonly packageRepo: Repository<TipsterSubscriptionPackage>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionEscrow)
    private readonly escrowRepo: Repository<SubscriptionEscrow>,
    @InjectRepository(SubscriptionCouponAccess)
    private readonly couponAccessRepo: Repository<SubscriptionCouponAccess>,
    @InjectRepository(Tipster)
    private readonly tipsterRepo: Repository<Tipster>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly tipsterService: TipsterService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(ApiSettings)
    private readonly apiSettingsRepo: Repository<ApiSettings>,
  ) {}

  async countSubscriptionCouponsInWindow(packageId: number, windowDays: number): Promise<number> {
    const days = Math.min(Math.max(windowDays, 1), 366);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    return this.couponAccessRepo
      .createQueryBuilder('sca')
      .innerJoin(AccumulatorTicket, 'at', 'at.id = sca.accumulatorId')
      .where('sca.subscriptionPackageId = :packageId', { packageId })
      .andWhere('at.createdAt >= :since', { since })
      .getCount();
  }

  /** Ensures tipster owns packages and has not exceeded rolling coupon cap per package. */
  async assertCanLinkCouponsToPackages(tipsterUserId: number, packageIds: number[]) {
    if (!packageIds?.length) return;
    for (const pkgId of packageIds) {
      const pkg = await this.getPackage(pkgId);
      if (pkg.tipsterUserId !== tipsterUserId) {
        throw new ForbiddenException('You can only link coupons to your own subscription packages');
      }
      if (pkg.status !== 'active') {
        throw new BadRequestException(`Subscription package "${pkg.name}" is not active`);
      }
      const n = await this.countSubscriptionCouponsInWindow(pkgId, pkg.durationDays);
      if (n >= MAX_SUBSCRIPTION_COUPONS_PER_WINDOW) {
        throw new BadRequestException(
          `You can add at most ${MAX_SUBSCRIPTION_COUPONS_PER_WINDOW} subscription coupons per ${pkg.durationDays}-day period for "${pkg.name}". Try again when older coupons fall outside the window.`,
        );
      }
    }
  }

  async createPackage(tipsterUserId: number, dto: CreatePackageDto) {
    const user = await this.usersRepo.findOne({ where: { id: tipsterUserId }, select: ['id', 'role'] });
    if (!user) throw new NotFoundException('User not found');
    const stats = await this.tipsterService.getStats(tipsterUserId, user.role);
    let minimumROI = 20.0;
    let minimumWinRate = 45.0;
    try {
      const row = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
      minimumROI = Number(row?.minimumROI ?? 20.0);
      minimumWinRate = Number(row?.minimumWinRate ?? 45.0);
    } catch {
      /* use defaults */
    }
    const roiOk = stats.roi >= minimumROI;
    const wrOk = stats.winRate >= minimumWinRate;
    if (!roiOk || !wrOk) {
      const parts: string[] = [];
      if (!roiOk) {
        parts.push(`ROI ${stats.roi.toFixed(2)}% (minimum ${minimumROI}%)`);
      }
      if (!wrOk) {
        parts.push(`win rate ${stats.winRate}% (minimum ${minimumWinRate}%)`);
      }
      throw new BadRequestException(
        `VIP packages require the same performance minimums as paid marketplace coupons. Current: ${parts.join('; ')}. Improve with free picks until both metrics qualify.`,
      );
    }

    const existingActive = await this.packageRepo.count({
      where: { tipsterUserId, status: 'active' },
    });
    if (existingActive > 0) {
      throw new BadRequestException(
        'You already have an active VIP package. Archive or deactivate it before creating another.',
      );
    }
    const pkg = this.packageRepo.create({
      tipsterUserId,
      name: dto.name,
      price: dto.price,
      durationDays: dto.durationDays ?? 30,
      roiGuaranteeMin: dto.roiGuaranteeMin ?? DEFAULT_SUBSCRIPTION_ROI_GUARANTEE_MIN,
      roiGuaranteeEnabled: dto.roiGuaranteeEnabled ?? DEFAULT_SUBSCRIPTION_ROI_GUARANTEE_ENABLED,
      status: 'active',
    });
    return this.packageRepo.save(pkg);
  }

  async getPackagesByTipsterUsername(username: string) {
    const tipster = await this.tipsterRepo.findOne({ where: { username } });
    if (!tipster?.userId) return [];
    return this.getPackagesByTipster(tipster.userId);
  }

  async getPackagesByTipster(tipsterUserId: number) {
    return this.packageRepo.find({
      where: { tipsterUserId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Public list: all active VIP packages with tipster profile + live ticket performance (for marketplace UI).
   */
  async getMarketplacePackages(options?: { limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(options?.limit ?? 24, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);
    const total = await this.packageRepo.count({ where: { status: 'active' } });
    const pkgs = await this.packageRepo.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    if (pkgs.length === 0) {
      return { items: [], total: 0, hasMore: false };
    }
    const tipsterUserIds = [...new Set(pkgs.map((p) => p.tipsterUserId))];
    const tipsters = await this.tipsterRepo.find({
      where: { userId: In(tipsterUserIds) },
      select: [
        'id',
        'userId',
        'username',
        'displayName',
        'avatarUrl',
        'bio',
        'isAi',
        'roi',
        'winRate',
        'totalPredictions',
        'totalWins',
        'totalLosses',
        'currentStreak',
        'bestStreak',
      ],
    });
    const userIdToTipster = new Map<number, Tipster>();
    for (const t of tipsters) {
      if (t.userId != null) userIdToTipster.set(t.userId, t);
    }
    const userRows =
      tipsterUserIds.length > 0
        ? await this.usersRepo.find({
            where: { id: In(tipsterUserIds) },
            select: ['id', 'role'],
          })
        : [];
    const roleByUserId = new Map(userRows.map((u) => [u.id, u.role]));
    const statsByUserId = new Map<number, Awaited<ReturnType<TipsterService['getStats']>>>();
    await Promise.all(
      tipsterUserIds.map(async (uid) => {
        const role = roleByUserId.get(uid) ?? 'user';
        statsByUserId.set(uid, await this.tipsterService.getStats(uid, role));
      }),
    );
    const items = pkgs.map((pkg) => {
      const t = userIdToTipster.get(pkg.tipsterUserId);
      const perf = statsByUserId.get(pkg.tipsterUserId);
      return {
        package: {
          id: pkg.id,
          name: pkg.name,
          price: Number(pkg.price),
          durationDays: pkg.durationDays,
          roiGuaranteeMin: pkg.roiGuaranteeMin != null ? Number(pkg.roiGuaranteeMin) : null,
          roiGuaranteeEnabled: pkg.roiGuaranteeEnabled,
        },
        tipster: t
          ? {
              id: t.id,
              username: t.username,
              displayName: t.displayName,
              avatarUrl: t.avatarUrl,
              bio: t.bio,
              isAi: !!t.isAi,
              profileRoi: t.roi != null ? Number(t.roi) : null,
              profileWinRate: t.winRate != null ? Number(t.winRate) : null,
              totalPredictions: t.totalPredictions,
              currentStreak: t.currentStreak ?? 0,
              bestStreak: t.bestStreak ?? 0,
            }
          : null,
        performance: perf
          ? {
              roi: perf.roi,
              winRate: perf.winRate,
              totalPicks: perf.totalPicks,
              wonPicks: perf.wonPicks,
              lostPicks: perf.lostPicks,
              totalEarnings: perf.totalEarnings,
            }
          : null,
      };
    });
    return { items, total, hasMore: offset + items.length < total };
  }

  async getPackage(id: number) {
    const pkg = await this.packageRepo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Subscription package not found');
    return pkg;
  }

  async getAdminAiPackages() {
    const aiTipsters = await this.tipsterRepo.find({
      where: { isAi: true },
      select: ['id', 'userId', 'username', 'displayName', 'avatarUrl', 'isActive'],
      order: { id: 'ASC' },
    });
    const userIds = aiTipsters.map((t) => t.userId).filter((id): id is number => typeof id === 'number');
    const pkgs = userIds.length
      ? await this.packageRepo.find({
          where: { tipsterUserId: In(userIds) },
          order: { createdAt: 'DESC' },
        })
      : [];
    const packageByUserId = new Map<number, TipsterSubscriptionPackage>();
    for (const p of pkgs) {
      if (!packageByUserId.has(p.tipsterUserId)) packageByUserId.set(p.tipsterUserId, p);
    }
    return aiTipsters.map((t) => ({
      tipster: {
        id: t.id,
        userId: t.userId,
        username: t.username,
        displayName: t.displayName,
        avatarUrl: t.avatarUrl,
        isActive: t.isActive,
      },
      package: t.userId ? packageByUserId.get(t.userId) ?? null : null,
    }));
  }

  /** Unpublish a VIP package (human or AI). Does not cancel existing subscriber periods. */
  async adminDeactivateSubscriptionPackage(packageId: number): Promise<{ ok: boolean; message: string }> {
    await this.updatePackageByAdmin(packageId, { status: 'inactive' });
    return {
      ok: true,
      message:
        'Package removed from the VIP marketplace. Existing subscribers keep access until their period ends. You can turn it back on from the tipster dashboard or Admin → AI tipster packages.',
    };
  }

  async updatePackageByAdmin(packageId: number, dto: UpdatePackageDto) {
    const pkg = await this.getPackage(packageId);
    if (dto.name !== undefined) pkg.name = dto.name.trim();
    if (dto.price !== undefined) pkg.price = dto.price;
    if (dto.durationDays !== undefined) pkg.durationDays = dto.durationDays;
    if (dto.roiGuaranteeEnabled !== undefined) pkg.roiGuaranteeEnabled = dto.roiGuaranteeEnabled;
    if (dto.roiGuaranteeMin !== undefined) pkg.roiGuaranteeMin = dto.roiGuaranteeMin;
    if (dto.status !== undefined) pkg.status = dto.status;
    if (pkg.status === 'active') {
      if (pkg.roiGuaranteeEnabled !== true) {
        throw new BadRequestException('Active subscription packages must have ROI commitment enabled');
      }
      if (pkg.roiGuaranteeMin == null) {
        pkg.roiGuaranteeMin = DEFAULT_SUBSCRIPTION_ROI_GUARANTEE_MIN;
      }
    }
    return this.packageRepo.save(pkg);
  }

  async setAllAiPackageStatuses(status: 'active' | 'inactive') {
    const aiTipsters = await this.tipsterRepo.find({
      where: { isAi: true },
      select: ['userId'],
    });
    const userIds = aiTipsters
      .map((t) => t.userId)
      .filter((id): id is number => typeof id === 'number');
    if (userIds.length === 0) {
      return { updated: 0 };
    }
    const result = await this.packageRepo
      .createQueryBuilder()
      .update(TipsterSubscriptionPackage)
      .set({ status })
      .where('tipster_user_id IN (:...userIds)', { userIds })
      .execute();
    return { updated: result.affected ?? 0 };
  }

  async subscribe(userId: number, packageId: number) {
    const pkg = await this.getPackage(packageId);
    if (pkg.status !== 'active') {
      throw new BadRequestException('This subscription package is not available');
    }
    if (pkg.tipsterUserId === userId) {
      throw new BadRequestException('You cannot subscribe to your own package');
    }

    const amount = Number(pkg.price);
    if (amount <= 0) throw new BadRequestException('Invalid package price');

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + pkg.durationDays);

    await this.walletService.debit(
      userId,
      amount,
      'subscription',
      `sub-${packageId}-${Date.now()}`,
      `Subscription: ${pkg.name}`,
    );

    const sub = this.subscriptionRepo.create({
      userId,
      packageId,
      startedAt: now,
      endsAt,
      amountPaid: amount,
      status: 'active',
    });
    const saved = await this.subscriptionRepo.save(sub);

    const escrow = this.escrowRepo.create({
      subscriptionId: saved.id,
      amount,
      status: 'held',
    });
    await this.escrowRepo.save(escrow);

    this.notificationsService
      .create({
        userId,
        type: 'subscription',
        title: 'Subscription Active',
        message: `You're now subscribed to ${pkg.name}. You can view the tipster's subscription coupons in your dashboard.`,
        link: '/dashboard/subscriptions',
        icon: 'star',
        sendEmail: true,
        metadata: { packageName: pkg.name },
      })
      .catch(() => {});

    return {
      subscription: saved,
      package: pkg,
      endsAt,
    };
  }

  async getMySubscriptionCoupons(userId: number) {
    const subs = await this.subscriptionRepo.find({
      where: { userId, status: 'active' },
      relations: ['package'],
    });
    if (subs.length === 0) return [];
    const packageIds = subs.map((s) => s.packageId);
    const accessRows = await this.couponAccessRepo.find({
      where: { subscriptionPackageId: In(packageIds) },
      relations: ['accumulator'],
    });
    const accumulatorIds = [...new Set(accessRows.map((a) => a.accumulatorId))];
    return accumulatorIds;
  }

  async getMySubscriptions(userId: number) {
    return this.subscriptionRepo.find({
      where: { userId },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Active subscriber user IDs for one or more packages (excludes expired/cancelled). */
  async getActiveSubscriberUserIdsForPackages(packageIds: number[]): Promise<number[]> {
    if (!packageIds?.length) return [];
    const now = new Date();
    const rows = await this.subscriptionRepo.find({
      where: {
        packageId: In(packageIds),
        status: 'active',
      },
      select: ['userId', 'endsAt'],
    });
    const activeIds = rows
      .filter((s) => !s.endsAt || new Date(s.endsAt) > now)
      .map((s) => s.userId);
    return [...new Set(activeIds)];
  }

  /** Add coupon to subscription packages (called when tipster creates coupon with subscription placement) */
  async addCouponToPackages(accumulatorId: number, packageIds: number[], tipsterUserId: number) {
    if (!packageIds?.length) return;
    await this.assertCanLinkCouponsToPackages(tipsterUserId, packageIds);
    for (const pkgId of packageIds) {
      await this.couponAccessRepo
        .createQueryBuilder()
        .insert()
        .values({ subscriptionPackageId: pkgId, accumulatorId })
        .orIgnore()
        .execute();
    }
  }

  async cancelAtPeriodEnd(userId: number, subscriptionId: number) {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, userId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status !== 'active') {
      throw new BadRequestException('Subscription is not active');
    }
    sub.status = 'cancelled';
    await this.subscriptionRepo.save(sub);
    return { ok: true, message: 'Subscription will end at period end. No further charges.' };
  }

  /** Tipsters who have at least one subscription package (for admin filters). */
  async listAdminSubscriptionTipsters(): Promise<
    Array<{ tipsterUserId: number; username: string; displayName: string; isAi: boolean }>
  > {
    const pkgs = await this.packageRepo.find({ select: ['tipsterUserId'] });
    const userIds = [...new Set(pkgs.map((p) => p.tipsterUserId).filter((id) => Number.isFinite(id)))];
    if (userIds.length === 0) return [];
    const tipsters = await this.tipsterRepo.find({
      where: { userId: In(userIds) },
      select: ['userId', 'username', 'displayName', 'isAi'],
      order: { displayName: 'ASC' },
    });
    return tipsters
      .filter((t) => t.userId != null)
      .map((t) => ({
        tipsterUserId: t.userId as number,
        username: t.username,
        displayName: t.displayName,
        isAi: !!t.isAi,
      }));
  }

  async listAdminSubscriptions(filters: {
    status?: string;
    tipsterUserId?: number;
    tipsterKind?: 'human' | 'ai' | 'all';
  }): Promise<
    Array<{
      id: number;
      status: string;
      startedAt: Date;
      endsAt: Date;
      amountPaid: number;
      createdAt: Date;
      escrowStatus: string | null;
      subscriber: { id: number; username: string; displayName: string };
      package: {
        id: number;
        name: string;
        price: number;
        durationDays: number;
        roiGuaranteeMin: number | null;
        roiGuaranteeEnabled: boolean;
        tipsterUserId: number;
      };
      tipster: {
        username: string;
        displayName: string;
        avatarUrl: string | null;
        isAi: boolean;
      } | null;
      /** Same settled-pick stats as VIP marketplace (per tipster). */
      performance: {
        roi: number;
        winRate: number;
        totalPicks: number;
        wonPicks: number;
        lostPicks: number;
        totalEarnings: number;
      } | null;
    }>
  > {
    const qb = this.subscriptionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'subscriber')
      .leftJoinAndSelect('s.package', 'pkg')
      .orderBy('s.createdAt', 'DESC')
      .take(500);
    if (filters.status && filters.status !== 'all') {
      qb.andWhere('s.status = :st', { st: filters.status });
    }
    if (filters.tipsterUserId != null && Number.isFinite(filters.tipsterUserId)) {
      qb.andWhere('pkg.tipsterUserId = :tid', { tid: filters.tipsterUserId });
    }
    const rows = await qb.getMany();
    const tipsterUserIds = [...new Set(rows.map((r) => r.package?.tipsterUserId).filter((id): id is number => typeof id === 'number'))];
    const tipsters =
      tipsterUserIds.length > 0
        ? await this.tipsterRepo.find({
            where: { userId: In(tipsterUserIds) },
            select: ['userId', 'username', 'displayName', 'avatarUrl', 'isAi'],
          })
        : [];
    const tipMap = new Map(tipsters.filter((t) => t.userId != null).map((t) => [t.userId as number, t]));
    const userRows =
      tipsterUserIds.length > 0
        ? await this.usersRepo.find({
            where: { id: In(tipsterUserIds) },
            select: ['id', 'role'],
          })
        : [];
    const roleByUserId = new Map(userRows.map((u) => [u.id, u.role]));
    const statsByUserId = new Map<number, Awaited<ReturnType<TipsterService['getStats']>>>();
    await Promise.all(
      tipsterUserIds.map(async (uid) => {
        const role = roleByUserId.get(uid) ?? 'user';
        statsByUserId.set(uid, await this.tipsterService.getStats(uid, role));
      }),
    );
    const subIds = rows.map((r) => r.id);
    const escrows =
      subIds.length > 0
        ? await this.escrowRepo.find({ where: { subscriptionId: In(subIds) } })
        : [];
    const escMap = new Map(escrows.map((e) => [e.subscriptionId, e]));
    const mapped = rows.map((s) => {
      const pkg = s.package;
      const tipsterUserId = pkg.tipsterUserId;
      const t = tipMap.get(tipsterUserId);
      const esc = escMap.get(s.id);
      const perf = statsByUserId.get(tipsterUserId);
      return {
        id: s.id,
        status: s.status,
        startedAt: s.startedAt,
        endsAt: s.endsAt,
        amountPaid: Number(s.amountPaid),
        createdAt: s.createdAt,
        escrowStatus: esc?.status ?? null,
        subscriber: {
          id: s.user.id,
          username: s.user.username,
          displayName: s.user.displayName,
        },
        package: {
          id: pkg.id,
          name: pkg.name,
          price: Number(pkg.price),
          durationDays: pkg.durationDays,
          roiGuaranteeMin: pkg.roiGuaranteeMin != null ? Number(pkg.roiGuaranteeMin) : null,
          roiGuaranteeEnabled: !!pkg.roiGuaranteeEnabled,
          tipsterUserId,
        },
        tipster: t
          ? {
              username: t.username,
              displayName: t.displayName,
              avatarUrl: t.avatarUrl ?? null,
              isAi: !!t.isAi,
            }
          : null,
        performance: perf
          ? {
              roi: perf.roi,
              winRate: perf.winRate,
              totalPicks: perf.totalPicks,
              wonPicks: perf.wonPicks,
              lostPicks: perf.lostPicks,
              totalEarnings: perf.totalEarnings,
            }
          : null,
      };
    });
    const kind = filters.tipsterKind ?? 'all';
    if (kind === 'human') {
      return mapped.filter((r) => r.tipster && !r.tipster.isAi);
    }
    if (kind === 'ai') {
      return mapped.filter((r) => r.tipster?.isAi === true);
    }
    return mapped;
  }

  /**
   * Remove a subscriber row. If escrow is still held, refunds the subscriber first.
   * If escrow was already released to the tipster, no wallet movement (payout already happened).
   */
  async adminDeleteSubscription(subscriptionId: number): Promise<{
    ok: boolean;
    refundedAmount: number | null;
    message: string;
  }> {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: ['package'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    const userId = sub.userId;
    const pkgName = sub.package?.name ?? 'VIP package';
    const escrow = await this.escrowRepo.findOne({ where: { subscriptionId } });
    let refundDue = 0;
    if (escrow?.status === 'held') {
      refundDue = Number(escrow.amount);
    }

    await this.subscriptionRepo.manager.transaction(async (em) => {
      await em.delete(RoiGuaranteeRefund, { subscriptionId });
      const row = await em.findOne(Subscription, { where: { id: subscriptionId } });
      if (row) await em.remove(row);
    });

    if (refundDue > 0) {
      await this.walletService.credit(
        userId,
        refundDue,
        'refund',
        `admin-sub-del-${subscriptionId}`,
        `Admin removed subscription: ${pkgName}`,
      );
    }

    return {
      ok: true,
      refundedAmount: refundDue > 0 ? refundDue : null,
      message:
        refundDue > 0
          ? `Subscription removed. GHS ${refundDue.toFixed(2)} refunded to the subscriber (held escrow).`
          : escrow?.status === 'released'
            ? 'Subscription removed. Escrow had already been released to the tipster; no refund issued.'
            : 'Subscription removed.',
    };
  }
}
