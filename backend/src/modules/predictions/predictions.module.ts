import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Tipster } from './entities/tipster.entity';
import { Prediction } from './entities/prediction.entity';
import { PredictionFixture } from './entities/prediction-fixture.entity';
import { TipsterPerformanceLog } from './entities/tipster-performance-log.entity';
import { TipsterFollow } from './entities/tipster-follow.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureOdd } from '../fixtures/entities/fixture-odd.entity';
import { User } from '../users/entities/user.entity';
import { FixturesModule } from '../fixtures/fixtures.module';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { PickMarketplace } from '../accumulators/entities/pick-marketplace.entity';
import { PredictionEngineService } from './prediction-engine.service';
import { PredictionMarketplaceSyncService } from './prediction-marketplace-sync.service';
import { ResultTrackerService } from './result-tracker.service';
import { TipstersApiService } from './tipsters-api.service';
import { TipsterFollowService } from './tipster-follow.service';
import { PredictionsApiService } from './predictions-api.service';
import { TipstersSetupService } from './tipsters-setup.service';
import { TipstersController } from './tipsters.controller';
import { PredictionsController } from './predictions.controller';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      Tipster,
      Prediction,
      PredictionFixture,
      TipsterPerformanceLog,
      TipsterFollow,
      Fixture,
      FixtureOdd,
      User,
      AccumulatorTicket,
      AccumulatorPick,
      PickMarketplace,
    ]),
    forwardRef(() => FixturesModule),
  ],
  controllers: [TipstersController, PredictionsController, LeaderboardController],
  providers: [
    PredictionEngineService,
    PredictionMarketplaceSyncService,
    ResultTrackerService,
    TipstersApiService,
    TipsterFollowService,
    PredictionsApiService,
    TipstersSetupService,
  ],
  exports: [PredictionEngineService, PredictionMarketplaceSyncService, ResultTrackerService, TipstersSetupService],
})
export class PredictionsModule {}
