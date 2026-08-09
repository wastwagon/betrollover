import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SubscriptionsService, CreatePackageDto } from './subscriptions.service';
import { isSubscriptionsEnabled } from '../../common/subscriptions-enabled';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /** Compatibility envelope: keep camelCase and provide snake_case aliases. */
  private withPageAliases<T extends { items: unknown[]; total: number; hasMore: boolean }>(payload: T) {
    return {
      ...payload,
      has_more: payload.hasMore,
      total_count: payload.total,
    };
  }

  private assertSubscriptionsEnabled() {
    if (!isSubscriptionsEnabled()) {
      throw new ForbiddenException('VIP subscriptions are temporarily disabled.');
    }
  }

  @Post('packages')
  @UseGuards(JwtAuthGuard)
  createPackage(@CurrentUser() user: User, @Body() dto: CreatePackageDto) {
    this.assertSubscriptionsEnabled();
    return this.subscriptionsService.createPackage(user.id, dto);
  }

  /** Public: browse all active VIP packages (tipster performance included). */
  @Get('marketplace')
  async listMarketplace(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!isSubscriptionsEnabled()) {
      return this.withPageAliases({ items: [], total: 0, hasMore: false });
    }
    const l = limit ? parseInt(limit, 10) : undefined;
    const o = offset ? parseInt(offset, 10) : undefined;
    const data = await this.subscriptionsService.getMarketplacePackages({
      limit: Number.isFinite(l) ? l : undefined,
      offset: Number.isFinite(o) ? o : undefined,
    });
    return this.withPageAliases(data);
  }

  @Get('packages')
  getPackages(@Query('tipsterId') tipsterId?: string) {
    if (!isSubscriptionsEnabled()) return [];
    const id = tipsterId ? parseInt(tipsterId, 10) : null;
    if (!id || isNaN(id)) return [];
    return this.subscriptionsService.getPackagesByTipster(id);
  }

  @Get('packages/tipster/:tipsterId')
  getPackagesByTipsterId(@Param('tipsterId', ParseIntPipe) tipsterId: number) {
    if (!isSubscriptionsEnabled()) return [];
    return this.subscriptionsService.getPackagesByTipster(tipsterId);
  }

  @Get('packages/by-username/:username')
  getPackagesByUsername(@Param('username') username: string) {
    if (!isSubscriptionsEnabled()) return [];
    return this.subscriptionsService.getPackagesByTipsterUsername(username);
  }

  @Get('packages/package/:id')
  getPackage(@Param('id', ParseIntPipe) id: number) {
    this.assertSubscriptionsEnabled();
    return this.subscriptionsService.getPackage(id);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@CurrentUser() user: User, @Body() body: { packageId: number }) {
    this.assertSubscriptionsEnabled();
    return this.subscriptionsService.subscribe(user.id, body.packageId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMySubscriptions(@CurrentUser() user: User) {
    return this.subscriptionsService.getMySubscriptions(user.id);
  }

  @Get('me/coupons')
  @UseGuards(JwtAuthGuard)
  getMySubscriptionCoupons(@CurrentUser() user: User) {
    return this.subscriptionsService.getMySubscriptionCoupons(user.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.cancelAtPeriodEnd(user.id, id);
  }
}
