import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccumulatorsModule } from '../accumulators/accumulators.module';
import { FixturesModule } from '../fixtures/fixtures.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureOdd } from '../fixtures/entities/fixture-odd.entity';
import { League } from '../fixtures/entities/league.entity';
import { SyncStatus } from '../fixtures/entities/sync-status.entity';
import { User } from '../users/entities/user.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { AccaGeneratorController } from './acca-generator.controller';
import { AccaGeneratorService } from './acca-generator.service';
import { AccaGeneratorRun } from './entities/acca-generator-run.entity';
import { AccaGeneratorEvent } from './entities/acca-generator-event.entity';
import { AccaDeskSetupService } from './acca-desk-setup.service';
import { AccaDeskPublisherService } from './acca-desk-publisher.service';
import { AccaDeskSchedulerService } from './acca-desk-scheduler.service';
import { RolloverRun } from './entities/rollover-run.entity';
import { RolloverDay } from './entities/rollover-day.entity';
import { RolloverSettings } from './entities/rollover-settings.entity';
import { RolloverDeskService } from './rollover-desk.service';
import { RolloverDeskController } from './rollover-desk.controller';
import { TipsterSubscriptionPackage } from '../subscriptions/entities/tipster-subscription-package.entity';
import { VipTipsterSetupService } from './vip-tipster-setup.service';
import { VipTipsterPublisherService } from './vip-tipster-publisher.service';
import { VipTipsterSchedulerService } from './vip-tipster-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccaGeneratorRun,
      AccaGeneratorEvent,
      RolloverRun,
      RolloverDay,
      RolloverSettings,
      ApiSettings,
      Fixture,
      FixtureOdd,
      League,
      User,
      Tipster,
      AccumulatorTicket,
      AccumulatorPick,
      SyncStatus,
      TipsterSubscriptionPackage,
    ]),
    AccumulatorsModule,
    NotificationsModule,
    forwardRef(() => FixturesModule),
  ],
  controllers: [AccaGeneratorController, RolloverDeskController],
  providers: [
    AccaGeneratorService,
    AccaDeskSetupService,
    AccaDeskPublisherService,
    AccaDeskSchedulerService,
    RolloverDeskService,
    VipTipsterSetupService,
    VipTipsterPublisherService,
    VipTipsterSchedulerService,
  ],
  exports: [
    AccaGeneratorService,
    AccaDeskSetupService,
    AccaDeskPublisherService,
    RolloverDeskService,
    VipTipsterSetupService,
    VipTipsterPublisherService,
  ],
})
export class AccaGeneratorModule {}
