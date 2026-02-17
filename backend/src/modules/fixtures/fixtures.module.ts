import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fixture } from './entities/fixture.entity';
import { FixtureArchive } from './entities/fixture-archive.entity';
import { FixtureOdd } from './entities/fixture-odd.entity';
import { League } from './entities/league.entity';
import { EnabledLeague } from './entities/enabled-league.entity';
import { MarketConfig } from './entities/market-config.entity';
import { SyncStatus } from './entities/sync-status.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { FixturesController } from './fixtures.controller';
import { FixturesService } from './fixtures.service';
import { FootballSyncService } from './football-sync.service';
import { FixtureUpdateService } from './fixture-update.service';
import { FixtureSchedulerService } from './fixture-scheduler.service';
import { OddsSyncService } from './odds-sync.service';
import { MarketFilterService } from './market-filter.service';
import { ApiPredictionsService } from './api-predictions.service';
import { AccumulatorsModule } from '../accumulators/accumulators.module';
import { PredictionsModule } from '../predictions/predictions.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Fixture,
      FixtureArchive,
      FixtureOdd,
      League,
      EnabledLeague,
      MarketConfig,
      SyncStatus,
      ApiSettings,
    ]),
    forwardRef(() => AccumulatorsModule), // For SettlementService (avoid circular dependency)
    forwardRef(() => PredictionsModule), // For PredictionEngineService (automatic prediction generation)
  ],
  controllers: [FixturesController],
  providers: [
    FixturesService,
    FootballSyncService,
    FixtureUpdateService,
    FixtureSchedulerService,
    OddsSyncService,
    MarketFilterService,
    ApiPredictionsService,
  ],
  exports: [
    FixturesService,
    FixtureUpdateService,
    OddsSyncService,
    MarketFilterService,
    ApiPredictionsService,
  ],
})
export class FixturesModule { }
