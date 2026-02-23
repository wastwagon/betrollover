import { Controller, Get, Post, Delete, Param, Query, NotFoundException, UseGuards } from '@nestjs/common';
import { TipstersApiService } from './tipsters-api.service';
import { TipsterFollowService } from './tipster-follow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

const SORT_OPTIONS = ['roi', 'win_rate', 'total_profit', 'total_predictions', 'follower_count'] as const;
const ORDER_OPTIONS = ['asc', 'desc'] as const;

@Controller('tipsters')
export class TipstersController {
  constructor(
    private readonly tipstersApi: TipstersApiService,
    private readonly followService: TipsterFollowService,
  ) {}

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  async getFeed(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitVal = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 50);
    const offsetVal = Math.max(parseInt(offset || '0', 10) || 0, 0);
    return this.tipstersApi.getFeedFromFollowedTipsters(user.id, limitVal, offsetVal);
  }

  @Get('me/following')
  @UseGuards(JwtAuthGuard)
  async getFollowing(@CurrentUser() user: User) {
    return this.followService.getFollowedTipsters(user.id);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  async getTipsters(
    @Query('limit') limit?: string,
    @Query('sort_by') sortBy?: string,
    @Query('order') order?: string,
    @Query('is_ai') isAi?: string,
    @Query('search') search?: string,
    @Query('sport') sport?: string,
    @CurrentUser() user?: User | null,
  ) {
    const limitVal = Math.min(Math.max(parseInt(limit || '25', 10) || 25, 1), 100);
    const sortByVal = SORT_OPTIONS.includes(sortBy as any) ? sortBy! : 'roi';
    const orderVal = ORDER_OPTIONS.includes(order as any) ? order! : 'desc';
    const isAiVal = isAi === 'true' ? true : isAi === 'false' ? false : undefined;
    const sportVal = sport && sport !== 'all' ? sport.toLowerCase() : undefined;

    const tipsters = await this.tipstersApi.getTipsters({
      limit: limitVal,
      sortBy: sortByVal,
      order: orderVal as 'asc' | 'desc',
      isAi: isAiVal,
      userId: user?.id,
      search: search?.trim() || undefined,
      sport: sportVal,
    });
    return { total: tipsters.length, tipsters };
  }

  @Get(':username')
  @UseGuards(OptionalJwtGuard)
  async getTipsterProfile(
    @Param('username') username: string,
    @CurrentUser() user: User | null,
  ) {
    const profile = await this.tipstersApi.getTipsterProfile(username);
    if (!profile) {
      throw new NotFoundException('Tipster not found');
    }
    if (user) {
      const isFollowing = await this.followService.isFollowing(user.id, profile.tipster.id);
      return { ...profile, is_following: isFollowing };
    }
    return { ...profile, is_following: false };
  }

  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  async followTipster(
    @Param('username') username: string,
    @CurrentUser() user: User,
  ) {
    return this.followService.follow(user.id, username);
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  async unfollowTipster(
    @Param('username') username: string,
    @CurrentUser() user: User,
  ) {
    return this.followService.unfollow(user.id, username);
  }
}
