import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getIapProduct, getIapProducts } from './iap-products.config';
import { InAppPurchase } from './entities/in-app-purchase.entity';
import { WalletService } from './wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface VerifyIapDto {
  platform: 'ios' | 'android';
  productId: string;
  transactionId: string;
  /** iOS: base64 receipt from App Store */
  receipt?: string;
  /** Android: purchase token from Google Play Billing */
  purchaseToken?: string;
}

@Injectable()
export class WalletIapService {
  constructor(
    @InjectRepository(InAppPurchase)
    private readonly iapRepo: Repository<InAppPurchase>,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getProducts(): { productId: string; amountGhs: number; label: string }[] {
    return getIapProducts();
  }

  async verifyAndCredit(userId: number, dto: VerifyIapDto): Promise<{ credited: boolean; amount: number }> {
    const product = getIapProduct(dto.productId);
    if (!product) {
      throw new BadRequestException('Invalid product ID');
    }
    if (!dto.transactionId?.trim()) {
      throw new BadRequestException('transactionId is required');
    }
    const txId = dto.transactionId.trim();

    const existing = await this.iapRepo.findOne({ where: { transactionId: txId } });
    if (existing) {
      return { credited: true, amount: Number(existing.amount) };
    }

    // Optional: server-side receipt verification when env is configured.
    // Apple: POST to https://buy.itunes.apple.com/verifyReceipt (or sandbox)
    // Google: androidpublisher.purchases.products.get with purchaseToken
    // For now we trust the client and record; add verification when APPLE_SHARED_SECRET / GOOGLE_SERVICE_ACCOUNT are set.
    const amount = product.amountGhs;

    const iap = this.iapRepo.create({
      userId,
      platform: dto.platform,
      productId: dto.productId,
      transactionId: txId,
      amount,
      status: 'completed',
    });
    await this.iapRepo.save(iap);

    await this.walletService.credit(
      userId,
      amount,
      'deposit',
      `iap_${txId}`,
      `Wallet top-up via ${dto.platform === 'ios' ? 'App Store' : 'Google Play'} (${product.label})`,
    );

    await this.notificationsService.create({
      userId,
      type: 'deposit_success',
      title: 'Wallet topped up',
      message: `GHS ${amount.toFixed(2)} has been added to your wallet.`,
      link: '/wallet',
      icon: 'wallet',
      sendEmail: false,
      metadata: { amount: amount.toFixed(2), source: 'iap' },
    }).catch(() => {});

    return { credited: true, amount };
  }
}
