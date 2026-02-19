import { Body, Controller, Get, Param, Post, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgeVerifiedGuard } from '../auth/guards/age-verified.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SubscriptionsService, CreatePackageDto } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('packages')
  @UseGuards(JwtAuthGuard, AgeVerifiedGuard)
  createPackage(@CurrentUser() user: User, @Body() dto: CreatePackageDto) {
    return this.subscriptionsService.createPackage(user.id, dto);
  }

  @Get('packages')
  getPackages(@Query('tipsterId') tipsterId?: string) {
    const id = tipsterId ? parseInt(tipsterId, 10) : null;
    if (!id || isNaN(id)) return [];
    return this.subscriptionsService.getPackagesByTipster(id);
  }

  @Get('packages/tipster/:tipsterId')
  getPackagesByTipsterId(@Param('tipsterId', ParseIntPipe) tipsterId: number) {
    return this.subscriptionsService.getPackagesByTipster(tipsterId);
  }

  @Get('packages/by-username/:username')
  getPackagesByUsername(@Param('username') username: string) {
    return this.subscriptionsService.getPackagesByTipsterUsername(username);
  }

  @Get('packages/package/:id')
  getPackage(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.getPackage(id);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard, AgeVerifiedGuard)
  subscribe(@CurrentUser() user: User, @Body() body: { packageId: number }) {
    return this.subscriptionsService.subscribe(user.id, body.packageId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AgeVerifiedGuard)
  getMySubscriptions(@CurrentUser() user: User) {
    return this.subscriptionsService.getMySubscriptions(user.id);
  }

  @Get('me/coupons')
  @UseGuards(JwtAuthGuard, AgeVerifiedGuard)
  getMySubscriptionCoupons(@CurrentUser() user: User) {
    return this.subscriptionsService.getMySubscriptionCoupons(user.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, AgeVerifiedGuard)
  cancel(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.cancelAtPeriodEnd(user.id, id);
  }
}
