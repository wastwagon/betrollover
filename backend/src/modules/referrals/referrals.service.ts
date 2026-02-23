import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralConversion } from './entities/referral-conversion.entity';
import { WalletService } from '../wallet/wallet.service';

const REWARD_AMOUNT = 5.0; // GHS credited to referrer on first purchase by referee
const CODE_LENGTH   = 8;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(ReferralCode)    private codeRepo: Repository<ReferralCode>,
    @InjectRepository(ReferralConversion) private convRepo: Repository<ReferralConversion>,
    private readonly walletService: WalletService,
  ) {}

  /** Get or create a referral code for a user. */
  async getOrCreate(userId: number): Promise<ReferralCode> {
    let code = await this.codeRepo.findOne({ where: { userId } });
    if (!code) {
      const raw = this.generate();
      code = await this.codeRepo.save(this.codeRepo.create({ userId, code: raw }));
    }
    return code;
  }

  /** Register a new signup against a referral code (called at registration). */
  async registerSignup(referredUserId: number, rawCode: string): Promise<void> {
    const codeRow = await this.codeRepo.findOne({ where: { code: rawCode.toUpperCase() } });
    if (!codeRow) return;
    if (codeRow.userId === referredUserId) return; // can't refer yourself
    const existing = await this.convRepo.findOne({ where: { referredUserId } });
    if (existing) return; // already referred
    await this.convRepo.save(this.convRepo.create({ referralCodeId: codeRow.id, referredUserId, rewardAmount: REWARD_AMOUNT }));
    await this.codeRepo.increment({ id: codeRow.id }, 'totalReferrals', 1);
  }

  /** Credit the referrer when their referee makes their first purchase. */
  async creditOnFirstPurchase(referredUserId: number): Promise<void> {
    const conv = await this.convRepo.findOne({ where: { referredUserId, rewardCredited: false } });
    if (!conv) return;
    conv.rewardCredited = true;
    conv.firstPurchaseAt = new Date();
    await this.convRepo.save(conv);

    const codeRow = await this.codeRepo.findOne({ where: { id: conv.referralCodeId } });
    if (!codeRow) return;

    await this.walletService.credit(
      codeRow.userId,
      Number(conv.rewardAmount),
      'credit',
      `referral-${conv.id}`,
      `Referral reward — friend made their first purchase`,
    );
    await this.codeRepo.increment({ id: codeRow.id }, 'totalCredited', Number(conv.rewardAmount));
    this.logger.log(`Referral reward GHS ${conv.rewardAmount} credited to user ${codeRow.userId}`);
  }

  async getMyReferralStats(userId: number) {
    const codeRow = await this.getOrCreate(userId);
    const conversions = await this.convRepo.find({
      where: { referralCodeId: codeRow.id },
      relations: ['referredUser'],
      order: { createdAt: 'DESC' },
    });
    return {
      code: codeRow.code,
      totalReferrals: codeRow.totalReferrals,
      totalCredited: Number(codeRow.totalCredited),
      rewardPerReferral: REWARD_AMOUNT,
      conversions: conversions.map((c) => ({
        id: c.id,
        referredUser: c.referredUser
          ? { displayName: c.referredUser.displayName, username: c.referredUser.username }
          : null,
        rewardAmount: Number(c.rewardAmount),
        rewardCredited: c.rewardCredited,
        firstPurchaseAt: c.firstPurchaseAt,
        joinedAt: c.createdAt,
      })),
    };
  }

  private generate(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
