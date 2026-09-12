import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccumulatorsModule } from '../accumulators/accumulators.module';
import { FixturesModule } from '../fixtures/fixtures.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureOdd } from '../fixtures/entities/fixture-odd.entity';
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
      User,
      Tipster,
      AccumulatorTicket,
      AccumulatorPick,
      SyncStatus,
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
  ],
  exports: [AccaGeneratorService, AccaDeskSetupService, AccaDeskPublisherService, RolloverDeskService],
})
export class AccaGeneratorModule {}
