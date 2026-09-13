import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionEscrow } from './entities/subscription-escrow.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { clampPlatformCommissionPercent, splitGrossForTipsterPayout } from '../../common/platform-commission';

const PREDICTION_TIME_ZONE =
  process.env.PREDICTION_TIMEZONE || process.env.TIMEZONE || 'Africa/Accra';

@Injectable()
export class SubscriptionSettlementService {
  private readonly logger = new Logger(SubscriptionSettlementService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionEscrow)
    private readonly escrowRepo: Repository<SubscriptionEscrow>,
    @InjectRepository(ApiSettings)
    private readonly apiSettingsRepo: Repository<ApiSettings>,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Run daily: settle subscriptions that have ended.
   * Release escrow to the tipster minus the same platform commission as marketplace wins.
   */
  @Cron('0 3 * * *', { timeZone: PREDICTION_TIME_ZONE })
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

    const apiRow = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
    const liveRate = clampPlatformCommissionPercent(apiRow?.platformCommissionRate);
    const commissionRate =
      escrow.commissionRatePercentAtPurchase != null
        ? clampPlatformCommissionPercent(escrow.commissionRatePercentAtPurchase)
        : liveRate;
    const { commission, netPayout } = splitGrossForTipsterPayout(amount, commissionRate);

    await this.walletService.credit(
      tipsterUserId,
      netPayout,
      'subscription_payout',
      `sub-${sub.id}`,
      `Subscription payout: ${pkg.name} (gross GHS ${amount.toFixed(2)} − ${commissionRate}% platform fee)`,
    );
    if (commission > 0) {
      await this.walletService.recordTransaction(
        tipsterUserId,
        commission,
        'commission',
        `commission-sub-${sub.id}`,
        `Platform commission (${commissionRate}%) on subscription "${pkg.name}"`,
        {
          subscriptionId: sub.id,
          grossAmount: amount,
          commissionRate,
          netPayout,
        },
      );
    }
    escrow.status = 'released';
    escrow.releasedAt = new Date();
    escrow.releasedTipsterNet = netPayout;
    escrow.releasedPlatformFee = commission;
    escrow.releasedCommissionRatePercent = commissionRate;

    this.notificationsService
      .create({
        userId: tipsterUserId,
        type: 'subscription_payout',
        title: 'Subscription Payout',
        message:
          commission > 0
            ? `Subscription ${pkg.name} ended. GHS ${netPayout.toFixed(2)} credited (gross GHS ${amount.toFixed(2)} − ${commissionRate}% platform fee).`
            : `Subscription ${pkg.name} ended. GHS ${netPayout.toFixed(2)} released to wallet.`,
        link: '/dashboard',
        icon: 'wallet',
        sendEmail: true,
        metadata: {
          packageName: pkg.name,
          grossAmount: String(amount),
          netPayout: String(netPayout),
          commissionRate: String(commissionRate),
        },
      })
      .catch(() => {});

    await this.escrowRepo.save(escrow);
    sub.status = 'ended';
    await this.subRepo.save(sub);
  }
}
