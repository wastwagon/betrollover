import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponReview } from './entities/coupon-review.entity';
import { UserPurchasedPick } from '../accumulators/entities/user-purchased-pick.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CouponReview)
    private reviewRepo: Repository<CouponReview>,
    @InjectRepository(UserPurchasedPick)
    private purchasedRepo: Repository<UserPurchasedPick>,
    @InjectRepository(AccumulatorTicket)
    private ticketRepo: Repository<AccumulatorTicket>,
  ) {}

  async submitReview(userId: number, data: { couponId: number; rating: number; comment?: string }) {
    if (data.rating < 1 || data.rating > 5) throw new BadRequestException('Rating must be 1–5');

    // Verify buyer purchased this coupon
    const purchase = await this.purchasedRepo.findOne({
      where: { userId, accumulatorId: data.couponId },
    });
    if (!purchase) throw new ForbiddenException('You can only review coupons you have purchased');

    // Verify coupon is settled (won or lost)
    const ticket = await this.ticketRepo.findOne({ where: { id: data.couponId } });
    if (!ticket) throw new BadRequestException('Coupon not found');
    if (ticket.result === 'pending' || !ticket.result) {
      throw new BadRequestException('You can only review settled coupons');
    }

    // Upsert review (one per buyer per coupon)
    const existing = await this.reviewRepo.findOne({
      where: { couponId: data.couponId, reviewerId: userId },
    });
    if (existing) {
      existing.rating = data.rating;
      existing.comment = data.comment ?? null;
      return this.reviewRepo.save(existing);
    }

    return this.reviewRepo.save(
      this.reviewRepo.create({
        couponId: data.couponId,
        reviewerId: userId,
        tipsterId: ticket.userId,
        rating: data.rating,
        comment: data.comment ?? null,
        isVerifiedPurchase: true,
      }),
    );
  }

  async getReviewsForCoupon(couponId: number) {
    const reviews = await this.reviewRepo.find({
      where: { couponId },
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return reviews.map((r) => this.format(r));
  }

  async getReviewsForTipster(tipsterId: number, limit = 20) {
    const reviews = await this.reviewRepo.find({
      where: { tipsterId },
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
    const total = await this.reviewRepo.count({ where: { tipsterId } });
    const avgRaw = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.tipster_id = :tipsterId', { tipsterId })
      .getRawOne<{ avg: string; count: string }>();

    return {
      avg: Number(Number(avgRaw?.avg ?? 0).toFixed(1)),
      total,
      items: reviews.map((r) => this.format(r)),
    };
  }

  async hasUserReviewed(userId: number, couponId: number) {
    const r = await this.reviewRepo.findOne({ where: { couponId, reviewerId: userId } });
    return { reviewed: !!r, review: r ? this.format(r) : null };
  }

  private format(r: CouponReview) {
    return {
      id: r.id,
      couponId: r.couponId,
      rating: r.rating,
      comment: r.comment,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt,
      reviewer: r.reviewer
        ? { id: r.reviewer.id, displayName: r.reviewer.displayName, username: r.reviewer.username }
        : null,
    };
  }
}
