import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccumulatorsService, CreateAccumulatorDto } from './accumulators.service';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('accumulators')
export class AccumulatorsController {
  constructor(private readonly accumulatorsService: AccumulatorsService) {}

  /** Compatibility envelope: keep camelCase and provide snake_case aliases. */
  private withPageAliases<T extends { items: unknown[]; total: number; hasMore: boolean }>(payload: T) {
    return {
      ...payload,
      has_more: payload.hasMore,
      total_count: payload.total,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateAccumulatorDto) {
    // All users can now create picks - no role restriction
    return this.accumulatorsService.create(user.id, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMy(@CurrentUser() user: { id: number }, @Query('sport') sport?: string) {
    return this.accumulatorsService.getMyAccumulators(user.id, sport || undefined);
  }

  /** Coupons created today (UTC) vs admin daily cap; remaining = null when unlimited / exempt. */
  @Get('daily-coupon-quota')
  @UseGuards(JwtAuthGuard)
  getDailyCouponQuota(@CurrentUser() user: { id: number }) {
    return this.accumulatorsService.getDailyCouponQuota(user.id);
  }

  @Get('purchased')
  @UseGuards(JwtAuthGuard)
  getPurchased(@CurrentUser() user: { id: number }) {
    return this.accumulatorsService.getPurchased(user.id);
  }

  @Get('subscription-feed')
  @UseGuards(JwtAuthGuard)
  async getSubscriptionFeed(
    @CurrentUser() user: { id: number },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitVal = limit != null ? Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100) : undefined;
    const offsetVal = offset != null ? Math.max(parseInt(offset, 10) || 0, 0) : undefined;
    const data = await this.accumulatorsService.getSubscriptionFeed(user.id, {
      limit: limitVal,
      offset: offsetVal,
    });
    return this.withPageAliases(data);
  }

  @Get('marketplace/public')
  async getMarketplacePublic(
    @Query('sport') sport?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('freeOnly') freeOnly?: string,
    @Query('priceFilter') priceFilter?: string,
    @Query('tipsterSearch') tipsterSearch?: string,
  ) {
    const limitVal = limit != null ? Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100) : undefined;
    const offsetVal = offset != null ? Math.max(parseInt(offset, 10) || 0, 0) : undefined;
    const tipQ = tipsterSearch?.trim();
    const priceFilterVal =
      priceFilter === 'free' || priceFilter === 'paid' || priceFilter === 'sold'
        ? priceFilter
        : freeOnly === 'true'
          ? 'free'
          : undefined;
    const data = await this.accumulatorsService.getMarketplacePublicList({
      limit: limitVal,
      offset: offsetVal,
      sport: sport || undefined,
      freeOnly: freeOnly === 'true',
      priceFilter: priceFilterVal,
      tipsterSearch: tipQ || undefined,
    });
    return this.withPageAliases(data);
  }

  @Get('marketplace')
  @UseGuards(JwtAuthGuard)
  async getMarketplace(
    @CurrentUser() user: User,
    @Query('includeAll') includeAll?: string,
    @Query('showPending') showPending?: string,
    @Query('showNotStated') showNotStated?: string,
    @Query('showSettled') showSettled?: string,
    @Query('sport') sport?: string,
    @Query('tipsterUsername') tipsterUsername?: string,
    @Query('tipsterSearch') tipsterSearch?: string,
    @Query('priceFilter') priceFilter?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const isAdmin = user.role === 'admin';
    const includeAllListings = isAdmin && includeAll === 'true' && showPending === undefined && showNotStated === undefined && showSettled === undefined;
    const limitVal = limit != null ? Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100) : undefined;
    const offsetVal = offset != null ? Math.max(parseInt(offset, 10) || 0, 0) : undefined;
    const tipQ = tipsterSearch?.trim();
    const priceFilterVal =
      priceFilter === 'free' || priceFilter === 'paid' || priceFilter === 'sold' || priceFilter === 'all'
        ? priceFilter
        : undefined;
    const opts: Parameters<typeof this.accumulatorsService.getMarketplace>[2] = {
      limit: limitVal,
      offset: offsetVal,
      sport: sport || undefined,
      tipsterUsername: isAdmin ? tipsterUsername || undefined : undefined,
      tipsterSearch: tipQ || undefined,
      priceFilter: priceFilterVal,
      viewerIsAdmin: isAdmin,
    };
    if (isAdmin) {
      opts.showPending = showPending === undefined ? true : showPending !== 'false';
      opts.showNotStated = showNotStated === undefined ? true : showNotStated !== 'false';
      opts.showSettled = showSettled === 'true';
    }
    const data = await this.accumulatorsService.getMarketplace(user.id, includeAllListings, opts);
    return this.withPageAliases(data);
  }

  @Get('featured')
  getFeatured() {
    return this.accumulatorsService.getMarketplacePublic(8);
  }

  @Get('stats/public')
  getPublicStats() {
    return this.accumulatorsService.getPublicStats();
  }

  @Get('free-tip-of-the-day')
  getFreeTipOfTheDay() {
    return this.accumulatorsService.getFreeTipOfTheDay();
  }

  @Get('popular-events')
  getPopularEvents(@Query('limit') limit?: string) {
    const limitVal = Math.min(Math.max(parseInt(limit || '6', 10) || 6, 1), 20);
    return this.accumulatorsService.getPopularEvents(limitVal);
  }

  @Get('archive')
  getArchive(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const limitVal = limit != null ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : undefined;
    const offsetVal = offset != null ? Math.max(parseInt(offset, 10) || 0, 0) : undefined;
    return this.accumulatorsService.getMarketplaceArchive({
      limit: limitVal,
      offset: offsetVal,
      from: from?.trim(),
      to: to?.trim(),
    });
  }

  @Get(':id/public')
  async getByIdPublic(@Param('id', ParseIntPipe) id: number) {
    const coupon = await this.accumulatorsService.getByIdPublic(id);
    if (!coupon) throw new NotFoundException('Pick not found or not available without login');
    return coupon;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.accumulatorsService.getById(id, user.id, {
      viewerIsAdmin: user.role === UserRole.ADMIN,
    });
  }

  @Post(':id/purchase')
  @UseGuards(JwtAuthGuard)
  purchase(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.accumulatorsService.purchase(user.id, id);
  }

  @Post(':id/react')
  @UseGuards(JwtAuthGuard)
  react(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.accumulatorsService.react(user.id, id);
  }

  @Post(':id/unreact')
  @UseGuards(JwtAuthGuard)
  unreact(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.accumulatorsService.unreact(user.id, id);
  }

  @Post(':id/view')
  recordView(@Param('id', ParseIntPipe) id: number) {
    return this.accumulatorsService.recordView(id);
  }
}
