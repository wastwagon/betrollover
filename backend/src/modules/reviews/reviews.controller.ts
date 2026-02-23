import { Controller, Post, Get, Body, Param, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 reviews per minute per user
  submit(
    @CurrentUser() user: { id: number },
    @Body() body: { couponId: number; rating: number; comment?: string },
  ) {
    return this.reviewsService.submitReview(user.id, body);
  }

  @Get('coupon/:couponId')
  getForCoupon(@Param('couponId', ParseIntPipe) couponId: number) {
    return this.reviewsService.getReviewsForCoupon(couponId);
  }

  @Get('tipster/:tipsterId')
  getForTipster(
    @Param('tipsterId', ParseIntPipe) tipsterId: number,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getReviewsForTipster(tipsterId, limit ? parseInt(limit, 10) : 20);
  }

  @Get('coupon/:couponId/my')
  @UseGuards(JwtAuthGuard)
  hasReviewed(
    @CurrentUser() user: { id: number },
    @Param('couponId', ParseIntPipe) couponId: number,
  ) {
    return this.reviewsService.hasUserReviewed(user.id, couponId);
  }
}
