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

  @Get('marketplace')
  @UseGuards(JwtAuthGuard)
  getMarketplace(
    @CurrentUser() user: User,
    @Query('includeAll') includeAll?: string,
  ) {
    const isAdmin = user.role === 'admin';
    const includeAllListings = isAdmin && includeAll === 'true';
    return this.accumulatorsService.getMarketplace(user.id, includeAllListings);
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
}
