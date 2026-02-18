import { Controller, Get, Query } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TipstersApiService } from './tipsters-api.service';

const LEADERBOARD_CACHE_TTL = 300; // 5 minutes

@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly tipstersApi: TipstersApiService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get()
  async getLeaderboard(
    @Query('period') period?: 'all_time' | 'monthly' | 'weekly',
    @Query('limit') limit?: string,
  ) {
    const periodVal = ['all_time', 'monthly', 'weekly'].includes(period || '')
      ? (period as 'all_time' | 'monthly' | 'weekly')
      : 'all_time';
    const limitVal = Math.min(
      Math.max(parseInt(limit || '25', 10) || 25, 1),
      100,
    );
    const cacheKey = `leaderboard:${periodVal}:${limitVal}`;
    const cached = await this.cacheManager.get<{ period: string; leaderboard: unknown[] }>(cacheKey);
    if (cached) return cached;
    const leaderboard = await this.tipstersApi.getLeaderboard({
      period: periodVal,
      limit: limitVal,
    });
    const result = { period: periodVal, leaderboard };
    await this.cacheManager.set(cacheKey, result, LEADERBOARD_CACHE_TTL * 1000);
    return result;
  }
}
