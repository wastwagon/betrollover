import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccumulatorsService, CreateAccumulatorDto } from './accumulators.service';
import { User } from '../users/entities/user.entity';

@Controller('accumulators')
export class AccumulatorsController {
  constructor(private readonly accumulatorsService: AccumulatorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateAccumulatorDto) {
    // All users can now create picks - no role restriction
    return this.accumulatorsService.create(user.id, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMy(@CurrentUser() user: { id: number }) {
    return this.accumulatorsService.getMyAccumulators(user.id);
  }

  @Get('purchased')
  @UseGuards(JwtAuthGuard)
  getPurchased(@CurrentUser() user: { id: number }) {
    return this.accumulatorsService.getPurchased(user.id);
  }

  @Get('subscription-feed')
  @UseGuards(JwtAuthGuard)
  getSubscriptionFeed(
    @CurrentUser() user: { id: number },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitVal = limit != null ? Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100) : undefined;
    const offsetVal = offset != null ? Math.max(parseInt(offset, 10) || 0, 0) : undefined;
    return this.accumulatorsService.getSubscriptionFeed(user.id, {
      limit: limitVal,
      offset: offsetVal,
    });
  }

  @Get('marketplace')
  @UseGuards(JwtAuthGuard)
  getMarketplace(
    @CurrentUser() user: User,
    @Query('includeAll') includeAll?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const isAdmin = user.role === 'admin';
    const includeAllListings = isAdmin && includeAll === 'true';
    const limitVal = limit != null ? Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100) : undefined;
    const offsetVal = offset != null ? Math.max(parseInt(offset, 10) || 0, 0) : undefined;
    return this.accumulatorsService.getMarketplace(user.id, includeAllListings, {
      limit: limitVal,
      offset: offsetVal,
    });
  }

  @Get('featured')
  getFeatured() {
    return this.accumulatorsService.getMarketplacePublic(8);
  }

  @Get('stats/public')
  getPublicStats() {
    return this.accumulatorsService.getPublicStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.accumulatorsService.getById(id);
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
