import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, ForbiddenException, BadRequestException, ParseIntPipe, UsePipes, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { AnalyticsService } from './analytics.service';
import { MigrationRunnerService } from './migration-runner.service';
import { PredictionEngineService } from '../predictions/prediction-engine.service';
import { PredictionMarketplaceSyncService } from '../predictions/prediction-marketplace-sync.service';
import { ResultTrackerService } from '../predictions/result-tracker.service';
import { TipstersSetupService } from '../predictions/tipsters-setup.service';
import { User } from '../users/entities/user.entity';
import { UpdateApiSportsKeyDto, TestApiSportsConnectionDto } from './dto/api-sports.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AnalyticsService,
    private readonly migrationRunner: MigrationRunnerService,
    private readonly predictionEngine: PredictionEngineService,
    private readonly predictionMarketplaceSync: PredictionMarketplaceSyncService,
    private readonly resultTracker: ResultTrackerService,
    private readonly tipstersSetup: TipstersSetupService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('stats')
  async getStats(@CurrentUser() user: User) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.adminService.getStats();
  }

  @Get('picks')
  async getPendingPicks(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getPendingPicks();
  }

  @Post('picks/:id/approve')
  async approvePick(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.approvePick(id);
  }

  @Post('picks/:id/reject')
  async rejectPick(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.rejectPick(id);
  }

  @Get('marketplace')
  async getMarketplace(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getMarketplace();
  }

  @Post('setup/ai-tipsters')
  async initializeAiTipsters(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.tipstersSetup.initializeAiTipsters();
  }

  @Post('predictions/sync-to-marketplace')
  async syncPredictionsToMarketplace(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.predictionMarketplaceSync.syncAllPendingToMarketplace();
  }

  @Post('predictions/fix-marketplace')
  async fixMarketplaceTitlesAndDedupe(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.predictionMarketplaceSync.fixMarketplaceTitlesAndDedupe();
  }

  @Post('settlement/run')
  async runSettlement(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.runSettlement();
  }

  @Post('predictions/generate')
  async generateAiPredictions(
    @CurrentUser() user: User,
    @Query('date') date?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const result = await this.predictionEngine.runNow(date || undefined);
    try {
      await this.dataSource.query(
        `INSERT INTO admin_actions (action_type, entity_type, admin_user, notes) VALUES ($1, $2, $3, $4)`,
        ['generate_predictions', 'system', user.email || user.username, `Generated ${result.count} predictions`],
      );
    } catch {
      // admin_actions table may not exist yet
    }
    return result;
  }

  @Get('predictions/today')
  async getTodaysPredictionsWithPrices(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getTodaysPredictionsWithPrices();
  }

  @Get('predictions/generation-logs')
  async getGenerationLogs(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    try {
      const rows = await this.dataSource.query(
        `SELECT * FROM generation_logs ORDER BY created_at DESC LIMIT $1`,
        [Math.min(parseInt(limit || '50', 10) || 50, 100)],
      );
      return { logs: rows };
    } catch {
      return { logs: [] };
    }
  }

  @Patch('predictions/:id/price')
  async setPredictionPrice(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { price: number },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.setPredictionMarketplacePrice(id, Number(body.price ?? 0));
  }

  @Post('predictions/update-leaderboard')
  async updateLeaderboard(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.resultTracker.updateLeaderboardNow();
  }

  @Post('predictions/daily-snapshot')
  async takeDailySnapshot(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.resultTracker.takePerformanceSnapshot();
  }

  @Get('users')
  async getUsers(
    @CurrentUser() user: User,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getUsers({
      role,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch('users/:id')
  async updateUser(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role?: string; status?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updateUser(id, body);
  }

  @Get('tipster-requests')
  async getTipsterRequests(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getTipsterRequests();
  }

  @Post('users/:id/approve-tipster')
  async approveTipster(@CurrentUser() admin: User, @Param('id', ParseIntPipe) id: number) {
    if (admin.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.approveTipsterRequest(id, admin.id);
  }

  @Post('users/:id/reject-tipster')
  async rejectTipster(@CurrentUser() admin: User, @Param('id', ParseIntPipe) id: number) {
    if (admin.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.rejectTipsterRequest(id, admin.id);
  }

  @Get('escrow')
  async getEscrow(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getEscrow();
  }

  @Get('wallets')
  async getWallets(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getWallets();
  }

  @Get('wallet-transactions')
  async getWalletTransactions(
    @CurrentUser() user: User,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getWalletTransactions({
      userId: userId ? parseInt(userId, 10) : undefined,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('migrations/status')
  async getMigrationsStatus(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.migrationRunner.getStatus();
  }

  @Post('migrations/mark-all-applied')
  async markMigrationsApplied(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.migrationRunner.markAllAsApplied();
  }

  @Post('migrations/run')
  async runMigrations(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const result = await this.migrationRunner.runPending();
    return {
      applied: result.applied,
      skipped: result.skipped,
      errors: result.errors,
      message:
        result.errors.length > 0
          ? `Stopped with errors: ${result.errors.join('; ')}`
          : result.applied.length > 0
            ? `Applied ${result.applied.length} migration(s): ${result.applied.join(', ')}`
            : 'No pending migrations.',
    };
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getSettings();
  }

  @Patch('settings/api-sports')
  async updateApiSportsKey(
    @CurrentUser() user: User,
    @Body() body: any,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    // Extract apiKey from body - handle both DTO and raw body formats
    const apiKey = body?.apiKey;
    if (!apiKey || typeof apiKey !== 'string') {
      throw new BadRequestException('API key is required');
    }
    return this.adminService.updateApiSportsKey(apiKey.trim());
  }

  @Post('settings/api-sports/test')
  async testApiSportsConnection(
    @CurrentUser() user: User,
    @Body() body: any,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    // Extract apiKey from body - handle both DTO and raw body formats
    const apiKey = body?.apiKey;
    return this.adminService.testApiSportsConnection(apiKey);
  }

  @Get('settings/api-sports/usage')
  async getApiSportsUsage(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getApiSportsUsage();
  }

  @Patch('settings/minimum-roi')
  async updateMinimumROI(
    @CurrentUser() user: User,
    @Body() body: { minimumROI: number },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    if (!body?.minimumROI || typeof body.minimumROI !== 'number') {
      throw new BadRequestException('Minimum ROI is required');
    }
    return this.adminService.updateMinimumROI(body.minimumROI);
  }

  @Get('content-pages')
  async getContentPages(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getContentPages();
  }

  @Get('smtp-settings')
  async getSmtpSettings(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getSmtpSettings();
  }

  @Patch('smtp-settings')
  async updateSmtpSettings(
    @CurrentUser() user: User,
    @Body() body: { host?: string; port?: number; username?: string; password?: string; encryption?: string; fromEmail?: string; fromName?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updateSmtpSettings(body);
  }

  @Post('test-email')
  async sendTestEmail(@CurrentUser() user: User, @Body() body: { to: string }) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.sendTestEmail(body.to);
  }

  @Patch('content-pages/:slug')
  async updateContentPage(
    @CurrentUser() user: User,
    @Param('slug') slug: string,
    @Body() body: { title?: string; content?: string; metaDescription?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updateContentPage(slug, body);
  }

  // Notifications Management
  @Get('notifications')
  async getAllNotifications(
    @CurrentUser() user: User,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getAllNotifications({
      userId: userId ? parseInt(userId, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Delete('notifications/:id')
  async deleteNotification(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.deleteNotification(id);
  }

  // Purchases Management
  @Get('purchases')
  async getAllPurchases(
    @CurrentUser() user: User,
    @Query('userId') userId?: string,
    @Query('accumulatorId') accumulatorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getAllPurchases({
      userId: userId ? parseInt(userId, 10) : undefined,
      accumulatorId: accumulatorId ? parseInt(accumulatorId, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Deposits Management
  @Get('deposits')
  async getAllDeposits(
    @CurrentUser() user: User,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getAllDeposits({
      userId: userId ? parseInt(userId, 10) : undefined,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch('deposits/:id/status')
  async updateDepositStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updateDepositStatus(id, body.status);
  }

  // Withdrawals Management
  @Get('withdrawals')
  async getAllWithdrawals(
    @CurrentUser() user: User,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getAllWithdrawals({
      userId: userId ? parseInt(userId, 10) : undefined,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch('withdrawals/:id/status')
  async updateWithdrawalStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; failureReason?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updateWithdrawalStatus(id, body.status, body.failureReason);
  }

  // Payout Methods Management
  @Get('payout-methods')
  async getAllPayoutMethods(
    @CurrentUser() user: User,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getAllPayoutMethods({
      userId: userId ? parseInt(userId, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Pick Management
  @Patch('picks/:id/status')
  async updatePickStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updatePickStatus(id, body.status);
  }

  @Delete('picks/:id')
  async deletePick(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.deletePick(id);
  }

  // Marketplace Management
  @Patch('marketplace/:accumulatorId')
  async updateMarketplaceListing(
    @CurrentUser() user: User,
    @Param('accumulatorId', ParseIntPipe) accumulatorId: number,
    @Body() body: { price?: number; status?: string; maxPurchases?: number },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updateMarketplaceListing(accumulatorId, body);
  }

  @Post('marketplace/:accumulatorId/remove')
  async removeMarketplaceListing(
    @CurrentUser() user: User,
    @Param('accumulatorId', ParseIntPipe) accumulatorId: number,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.removeMarketplaceListing(accumulatorId);
  }

  // Escrow Management
  @Patch('escrow/:id/status')
  async updateEscrowStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updateEscrowStatus(id, body.status);
  }

  // Wallet Management
  @Post('wallets/:userId/adjust')
  async adjustWalletBalance(
    @CurrentUser() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { amount: number; reason: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.adjustWalletBalance(userId, body.amount, body.reason);
  }

  @Patch('wallets/:userId/freeze')
  async freezeWallet(
    @CurrentUser() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { freeze: boolean },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.freezeWallet(userId, body.freeze);
  }

  // Advanced Analytics Endpoints
  @Get('analytics/time-series')
  async getTimeSeries(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('interval') interval?: 'day' | 'week' | 'month',
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.analyticsService.getTimeSeriesData(start, end, interval || 'day');
  }

  @Get('analytics/conversion-funnel')
  async getConversionFunnel(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getConversionFunnel();
  }

  @Get('analytics/user-behavior')
  async getUserBehavior(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getUserBehaviorAnalytics();
  }

  @Get('analytics/revenue')
  async getRevenueAnalytics(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getRevenueAnalytics(start, end);
  }

  @Get('analytics/pick-performance')
  async getPickPerformance(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getPickPerformanceAnalytics();
  }

  @Get('analytics/engagement')
  async getEngagement(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getEngagementMetrics();
  }

  @Get('analytics/real-time')
  async getRealTimeStats(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getRealTimeStats();
  }

  @Get('analytics/ai-dashboard')
  async getAiDashboardMetrics(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getAiDashboardMetrics();
  }

  @Get('analytics/cohorts')
  async getUserCohorts(
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getUserCohorts(days ? parseInt(days, 10) : 90);
  }

  @Get('analytics/retention')
  async getRetention(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getRetentionMetrics();
  }

  @Get('analytics/visitors')
  async getVisitorStats(
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getVisitorStats(days ? parseInt(days, 10) : 7);
  }
}
