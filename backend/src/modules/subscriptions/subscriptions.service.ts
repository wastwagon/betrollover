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
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Tipster } from '../predictions/entities/tipster.entity';
import { User } from '../users/entities/user.entity';
import { TipsterService } from '../tipster/tipster.service';

/** Same bar as paid marketplace coupons — tipsters below this ROI cannot sell VIP packages. */
const MIN_ROI_FOR_SUBSCRIPTION_PACKAGE = 20;

export interface CreatePackageDto {
  name: string;
  price: number;
  durationDays?: number;
  roiGuaranteeMin?: number | null;
  roiGuaranteeEnabled?: boolean;
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
    if (stats.roi < MIN_ROI_FOR_SUBSCRIPTION_PACKAGE) {
      throw new BadRequestException(
        `You need a minimum ROI of ${MIN_ROI_FOR_SUBSCRIPTION_PACKAGE}% to offer a VIP subscription package. Your current ROI is ${stats.roi.toFixed(2)}%.`,
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
      roiGuaranteeMin: dto.roiGuaranteeMin ?? null,
      roiGuaranteeEnabled: dto.roiGuaranteeEnabled ?? false,
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
}
