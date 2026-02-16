import { Controller, Get, Param, Post, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SmartCouponService } from './smart-coupon.service';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly smartCouponService: SmartCouponService) { }

  /** Get single coupon (public) */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const coupon = await this.smartCouponService.getById(parseInt(id, 10));
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  /** High-value coupons for dashboard (public - no auth required for viewing) */
  @Get('high-value')
  getHighValue(@Query('limit') limit?: string) {
    return this.smartCouponService.getHighValueCoupons(
      limit ? parseInt(limit, 10) : 8,
    );
  }

  /** Archive with filters */
  @Get('archive')
  getArchive(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.smartCouponService.getArchive({ from, to, status });
  }

  /** Archive stats (ROI, won/lost counts) */
  @Get('archive/stats')
  getArchiveStats() {
    return this.smartCouponService.getArchiveStats();
  }

  /** Generate coupons (admin only) - runs Smart Double Chance strategy */
  @Post('generate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  generate() {
    return this.smartCouponService.generateCoupons();
  }
}
