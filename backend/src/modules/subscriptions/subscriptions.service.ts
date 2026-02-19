import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TipsterSubscriptionPackage } from './entities/tipster-subscription-package.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionEscrow } from './entities/subscription-escrow.entity';
import { SubscriptionCouponAccess } from './entities/subscription-coupon-access.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Tipster } from '../predictions/entities/tipster.entity';

export interface CreatePackageDto {
  name: string;
  price: number;
  durationDays?: number;
  roiGuaranteeMin?: number | null;
  roiGuaranteeEnabled?: boolean;
}

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
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createPackage(tipsterUserId: number, dto: CreatePackageDto) {
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
  async addCouponToPackages(accumulatorId: number, packageIds: number[]) {
    if (!packageIds?.length) return;
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
