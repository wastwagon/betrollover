import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionEscrow } from './entities/subscription-escrow.entity';
import { RoiGuaranteeRefund } from './entities/roi-guarantee-refund.entity';
import { TipsterSubscriptionPackage } from './entities/tipster-subscription-package.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DataSource } from 'typeorm';

@Injectable()
export class SubscriptionSettlementService {
  private readonly logger = new Logger(SubscriptionSettlementService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionEscrow)
    private readonly escrowRepo: Repository<SubscriptionEscrow>,
    @InjectRepository(RoiGuaranteeRefund)
    private readonly refundRepo: Repository<RoiGuaranteeRefund>,
    @InjectRepository(TipsterSubscriptionPackage)
    private readonly packageRepo: Repository<TipsterSubscriptionPackage>,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Run daily: settle subscriptions that have ended.
   * Release escrow to tipster or refund user (ROI guarantee).
   */
  @Cron('0 3 * * *') // Every day at 3 AM
  async runPeriodEndSettlement() {
    const ended = await this.subRepo.find({
      where: { status: 'active', endsAt: LessThanOrEqual(new Date()) },
      relations: ['package'],
    });
    if (ended.length === 0) return;
    this.logger.log(`Settling ${ended.length} ended subscription(s)`);

    for (const sub of ended) {
      try {
        await this.settleOne(sub);
      } catch (err: any) {
        this.logger.error(`Subscription ${sub.id} settlement failed: ${err?.message || err}`);
      }
    }
  }

  private async settleOne(sub: Subscription) {
    const escrow = await this.escrowRepo.findOne({
      where: { subscriptionId: sub.id, status: 'held' },
    });
    if (!escrow) {
      sub.status = 'ended';
      await this.subRepo.save(sub);
      return;
    }

    const pkg = sub.package;
    const tipsterUserId = pkg.tipsterUserId;
    const amount = Number(escrow.amount);
    const userId = sub.userId;

    let refund = false;
    let roiAchieved: number | null = null;

    if (pkg.roiGuaranteeEnabled && pkg.roiGuaranteeMin != null) {
      roiAchieved = await this.computeRoiForPeriod(tipsterUserId, sub.startedAt, sub.endsAt);
      if (roiAchieved < Number(pkg.roiGuaranteeMin)) {
        refund = true;
      }
    }

    if (refund) {
      await this.walletService.credit(
        userId,
        amount,
        'refund',
        `sub-${sub.id}-roi-refund`,
        `ROI guarantee refund: ${pkg.name}`,
      );
      escrow.status = 'refunded';
      escrow.refundReason = `ROI ${roiAchieved}% below threshold ${pkg.roiGuaranteeMin}%`;
      escrow.releasedAt = new Date();

      await this.refundRepo.save(
        this.refundRepo.create({
          subscriptionId: sub.id,
          userId,
          amount,
          roiAchieved: roiAchieved ?? null,
          roiThreshold: pkg.roiGuaranteeMin ?? null,
        }),
      );

      this.notificationsService
        .create({
          userId,
          type: 'subscription_refund',
          title: 'Subscription Refunded',
          message: `Your subscription to ${pkg.name} was refunded (ROI guarantee). GHS ${amount.toFixed(2)} credited.`,
          link: '/dashboard/subscriptions',
          icon: 'refund',
          sendEmail: true,
        })
        .catch(() => {});
    } else {
      await this.walletService.credit(
        tipsterUserId,
        amount,
        'subscription_payout',
        `sub-${sub.id}`,
        `Subscription payout: ${pkg.name}`,
      );
      escrow.status = 'released';
      escrow.releasedAt = new Date();

      this.notificationsService
        .create({
          userId: tipsterUserId,
          type: 'subscription_payout',
          title: 'Subscription Payout',
          message: `Subscription ${pkg.name} ended. GHS ${amount.toFixed(2)} released to wallet.`,
          link: '/dashboard',
          icon: 'wallet',
          sendEmail: true,
        })
        .catch(() => {});
    }

    await this.escrowRepo.save(escrow);
    sub.status = 'ended';
    await this.subRepo.save(sub);
  }

  /** Win rate (0-100) for tipster's settled marketplace picks in period. Used for ROI guarantee. */
  private async computeRoiForPeriod(tipsterUserId: number, start: Date, end: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT
        COALESCE(
          (SUM(CASE WHEN t.result = 'won' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100,
          -100
        ) as win_rate
      FROM accumulator_tickets t
      WHERE t.user_id = $1
        AND t.is_marketplace = true
        AND t.result IN ('won', 'lost')
        AND t.updated_at >= $2
        AND t.updated_at <= $3
      `,
      [tipsterUserId, start, end],
    );
    const row = Array.isArray(result) && result.length > 0 ? result[0] : null;
    return row && typeof row === 'object' && 'win_rate' in row ? Number(row.win_rate) : -100;
  }
}
