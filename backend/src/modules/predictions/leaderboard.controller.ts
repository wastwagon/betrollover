import { Controller, Get, Query } from '@nestjs/common';
import { TipstersApiService } from './tipsters-api.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly tipstersApi: TipstersApiService) {}

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
    const leaderboard = await this.tipstersApi.getLeaderboard({
      period: periodVal,
      limit: limitVal,
    });
    return { period: periodVal, leaderboard };
  }
}
