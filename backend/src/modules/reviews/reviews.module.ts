import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponReview } from './entities/coupon-review.entity';
import { UserPurchasedPick } from '../accumulators/entities/user-purchased-pick.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CouponReview, UserPurchasedPick, AccumulatorTicket]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
