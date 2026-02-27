import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, ForbiddenException, NotFoundException, BadRequestException, ParseIntPipe, UsePipes, ValidationPipe, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { NewsService } from '../news/news.service';
import { TransfersSyncService } from '../news/transfers-sync.service';
import { InjuriesSyncService } from '../news/injuries-sync.service';
import { BasketballSyncService } from '../basketball/basketball-sync.service';
import { RugbySyncService } from '../rugby/rugby-sync.service';
import { MmaSyncService } from '../mma/mma-sync.service';
import { VolleyballSyncService } from '../volleyball/volleyball-sync.service';
import { HockeySyncService } from '../hockey/hockey-sync.service';
import { AmericanFootballSyncService } from '../american-football/american-football-sync.service';
import { TennisSyncService } from '../tennis/tennis-sync.service';
import { OddsApiSettlementService } from '../odds-api/odds-api-settlement.service';
import { SyncHealthService } from './sync-health.service';
import { ResourcesService } from '../resources/resources.service';
import { AdsService } from '../ads/ads.service';
import { AccumulatorsService } from '../accumulators/accumulators.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { UpdateApiSportsKeyDto, TestApiSportsConnectionDto } from './dto/api-sports.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
    private readonly analyticsService: AnalyticsService,
    private readonly migrationRunner: MigrationRunnerService,
    private readonly predictionEngine: PredictionEngineService,
    private readonly predictionMarketplaceSync: PredictionMarketplaceSyncService,
    private readonly resultTracker: ResultTrackerService,
    private readonly tipstersSetup: TipstersSetupService,
    private readonly newsService: NewsService,
    private readonly transfersSyncService: TransfersSyncService,
    private readonly injuriesSyncService: InjuriesSyncService,
    private readonly basketballSyncService: BasketballSyncService,
    private readonly rugbySyncService: RugbySyncService,
    private readonly mmaSyncService: MmaSyncService,
    private readonly volleyballSyncService: VolleyballSyncService,
    private readonly hockeySyncService: HockeySyncService,
    private readonly americanFootballSyncService: AmericanFootballSyncService,
    private readonly tennisSyncService: TennisSyncService,
    private readonly oddsApiSettlementService: OddsApiSettlementService,
    private readonly syncHealthService: SyncHealthService,
    private readonly resourcesService: ResourcesService,
    private readonly adsService: AdsService,
    private readonly accumulatorsService: AccumulatorsService,
    private readonly dataSource: DataSource,
  ) { }

  @Get('stats')
  async getStats(@CurrentUser() user: User) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.adminService.getStats();
  }

  @Get('marketplace')
  async getMarketplace(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getMarketplace();
  }

  @Get('marketplace/diagnostic')
  async getMarketplaceDiagnostic(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.accumulatorsService.getMarketplaceDiagnostic();
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

  /** Manually settle a sport event (e.g. when Odds API doesn't return it — matches >3 days old) */
  @Post('sport-events/:id/settle')
  async manuallySettleEvent(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { homeScore: number; awayScore: number },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const homeScore = Number(body?.homeScore);
    const awayScore = Number(body?.awayScore);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
      throw new BadRequestException('homeScore and awayScore must be non-negative numbers');
    }
    return this.adminService.manuallySettleSportEvent(id, homeScore, awayScore);
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
    try {
      this.predictionMarketplaceSync.syncAllPendingToMarketplace();
    } catch (e) {
      // this.logger.error('Marketplace sync failed after generation', e); // Assuming logger is available or needs to be injected
    }
    return result;
  }

  @Post('news/sync')
  async syncNews(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.transfersSyncService.sync();
  }

  @Post('news/sync/injuries')
  async syncInjuries(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.injuriesSyncService.sync();
  }

  @Post('sport-sync/all')
  async syncAllSports(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const results: Record<string, { success: boolean; count?: number; error?: string }> = {};
    const sports = [
      { key: 'basketball', fn: () => this.basketballSyncService.sync() },
      { key: 'rugby', fn: () => this.rugbySyncService.sync() },
      { key: 'mma', fn: () => this.mmaSyncService.sync() },
      { key: 'volleyball', fn: () => this.volleyballSyncService.sync() },
      { key: 'hockey', fn: () => this.hockeySyncService.sync() },
      { key: 'american-football', fn: () => this.americanFootballSyncService.sync() },
      { key: 'tennis', fn: () => this.tennisSyncService.sync() },
    ];
    for (const { key, fn } of sports) {
      try {
        const res = await fn();
        const count = (res as any)?.games ?? (res as any)?.synced ?? (res as any)?.count ?? (res as any)?.odds ?? 0;
        results[key] = { success: true, count };
      } catch (err: any) {
        results[key] = { success: false, error: err?.message ?? 'Unknown error' };
      }
    }
    return { results };
  }

  @Post('sport-sync/basketball')
  async syncBasketball(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.basketballSyncService.sync();
  }

  @Post('sport-sync/rugby')
  async syncRugby(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.rugbySyncService.sync();
  }

  @Post('sport-sync/mma')
  async syncMma(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.mmaSyncService.sync();
  }

  @Post('sport-sync/volleyball')
  async syncVolleyball(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.volleyballSyncService.sync();
  }

  @Post('sport-sync/hockey')
  async syncHockey(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.hockeySyncService.sync();
  }

  @Post('sport-sync/american-football')
  async syncAmericanFootball(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.americanFootballSyncService.sync();
  }

  @Post('sport-sync/tennis')
  async syncTennis(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.tennisSyncService.sync();
  }

  @Post('sport-sync/results')
  async syncSportResults(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.oddsApiSettlementService.syncResults();
  }

  @Get('sport-sync/health')
  async getSyncHealth(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.syncHealthService.getStatus();
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
    @Body() body: { role?: string; status?: string; avatar?: string | null },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updateUser(id, body);
  }

  @Post('users/:id/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error('Invalid file type.'), false);
    },
  }))
  async uploadUserAvatar(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (admin.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.usersService.uploadAvatar(id, file);
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

  @Post('users/:id/impersonate')
  async impersonateUser(@CurrentUser() admin: User, @Param('id', ParseIntPipe) userId: number) {
    if (admin.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.impersonateUser(userId, admin.id);
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

  @Patch('settings/commission-rate')
  async updateCommissionRate(
    @CurrentUser() user: User,
    @Body() body: { platformCommissionRate: number },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    if (body?.platformCommissionRate === undefined || body?.platformCommissionRate === null || typeof body.platformCommissionRate !== 'number') {
      throw new BadRequestException('platformCommissionRate (number 0–50) is required');
    }
    return this.adminService.updateCommissionRate(body.platformCommissionRate);
  }

  @Get('analytics/commission-revenue')
  async getCommissionRevenue(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getCommissionRevenue();
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

  @Get('settings/paystack')
  async getPaystackSettings(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.getPaystackSettings();
  }

  @Patch('settings/paystack')
  async updatePaystackSettings(
    @CurrentUser() user: User,
    @Body() body: { secretKey?: string; publicKey?: string; mode?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adminService.updatePaystackSettings(body);
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

  // News Management
  @Get('news')
  async getNewsArticles(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.newsService.adminList();
  }

  @Get('news/:id')
  async getNewsArticle(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const a = await this.newsService.findById(id);
    if (!a) throw new NotFoundException('Article not found');
    return a;
  }

  @Post('news')
  async createNewsArticle(
    @CurrentUser() user: User,
    @Body() body: { slug: string; title: string; excerpt?: string; content: string; category?: string; imageUrl?: string; sourceUrl?: string; featured?: boolean; metaDescription?: string; publishedAt?: string; language?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.newsService.create({
      ...body,
      category: body.category as any,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      language: body.language || 'en',
    });
  }

  @Patch('news/:id')
  async updateNewsArticle(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { slug?: string; title?: string; excerpt?: string; content?: string; category?: string; imageUrl?: string; sourceUrl?: string; featured?: boolean; metaDescription?: string; publishedAt?: string; language?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const update: any = { ...body, category: body.category as any, publishedAt: body.publishedAt !== undefined ? (body.publishedAt ? new Date(body.publishedAt) : null) : undefined };
    if (body.language !== undefined) update.language = body.language;
    return this.newsService.update(id, update);
  }

  @Delete('news/:id')
  async deleteNewsArticle(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    await this.newsService.delete(id);
    return { ok: true };
  }

  @Post('news/sync-transfers')
  async syncTransfers(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.transfersSyncService.sync();
  }

  // Resources Management
  @Get('resources/categories')
  async getResourceCategories(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.resourcesService.adminListCategories();
  }

  @Get('resources/categories/:id')
  async getResourceCategory(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const cat = await this.resourcesService.adminGetCategory(id);
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  @Post('resources/categories')
  async createResourceCategory(
    @CurrentUser() user: User,
    @Body() body: { slug: string; name: string; description?: string; level?: string; sortOrder?: number; language?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.resourcesService.adminCreateCategory({ ...body, language: body.language || 'en' } as any);
  }

  @Patch('resources/categories/:id')
  async updateResourceCategory(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { slug?: string; name?: string; description?: string; level?: string; sortOrder?: number; language?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.resourcesService.adminUpdateCategory(id, body as any);
  }

  @Get('resources/items/:id')
  async getResourceItem(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const item = await this.resourcesService.adminGetItem(id);
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  @Post('resources/items')
  async createResourceItem(
    @CurrentUser() user: User,
    @Body() body: { categoryId: number; slug: string; title: string; excerpt?: string; content: string; type?: string; durationMinutes?: number; toolConfig?: object; featured?: boolean; sortOrder?: number; publishedAt?: string; language?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.resourcesService.adminCreateItem({
      ...body,
      type: body.type as any,
      toolConfig: body.toolConfig as any,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      language: body.language || 'en',
    } as any);
  }

  @Patch('resources/items/:id')
  async updateResourceItem(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { slug?: string; title?: string; excerpt?: string; content?: string; type?: string; durationMinutes?: number; toolConfig?: object; featured?: boolean; sortOrder?: number; publishedAt?: string; language?: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const update: any = { ...body, type: body.type as any, toolConfig: body.toolConfig as any, publishedAt: body.publishedAt !== undefined ? (body.publishedAt ? new Date(body.publishedAt) : null) : undefined };
    if (body.language !== undefined) update.language = body.language;
    return this.resourcesService.adminUpdateItem(id, update);
  }

  @Delete('resources/items/:id')
  async deleteResourceItem(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    await this.resourcesService.adminDeleteItem(id);
    return { ok: true };
  }

  // Ads Management
  @Get('ads/zones')
  async getAdZones(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adsService.adminGetZones();
  }

  @Get('ads/campaigns')
  async getAdCampaigns(@CurrentUser() user: User, @Query('zoneId') zoneId?: string) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adsService.adminGetCampaigns(zoneId ? parseInt(zoneId, 10) : undefined);
  }

  @Post('ads/campaigns')
  async createAdCampaign(
    @CurrentUser() user: User,
    @Body() body: { zoneId: number; advertiserName: string; imageUrl: string; targetUrl: string; startDate: string; endDate: string; status?: string; costPerClick?: number; costPerMille?: number },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adsService.adminCreateCampaign({
      ...body,
      status: body.status as any,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      costPerClick: body.costPerClick ?? 0,
      costPerMille: body.costPerMille ?? 0,
    });
  }

  @Patch('ads/campaigns/:id')
  async updateAdCampaign(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { advertiserName?: string; imageUrl?: string; targetUrl?: string; startDate?: string; endDate?: string; status?: string; costPerClick?: number; costPerMille?: number },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    const data: any = { ...body };
    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate) data.endDate = new Date(body.endDate);
    return this.adsService.adminUpdateCampaign(id, data);
  }

  @Delete('ads/campaigns/:id')
  async deleteAdCampaign(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    await this.adsService.adminDeleteCampaign(id);
    return { ok: true };
  }

  @Post('ads/upload')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error('Invalid file type. Use JPEG, PNG, GIF or WebP.'), false);
    },
  }))
  async uploadAdImage(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.adsService.uploadAdImage(file);
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

  @Get('analytics/sport-breakdown')
  async getSportBreakdown(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getSportBreakdown();
  }

  @Get('analytics/revenue-trend')
  async getRevenueTrend(
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getRevenueTrend(days ? parseInt(days, 10) : 30);
  }

  @Get('analytics/top-tipsters-by-sport')
  async getTopTipstersBySport(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
    return this.analyticsService.getTopTipstersBySport(limit ? parseInt(limit, 10) : 5);
  }
}
