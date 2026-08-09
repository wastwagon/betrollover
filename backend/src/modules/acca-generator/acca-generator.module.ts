import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccumulatorsModule } from '../accumulators/accumulators.module';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureOdd } from '../fixtures/entities/fixture-odd.entity';
import { User } from '../users/entities/user.entity';
import { AccaGeneratorController } from './acca-generator.controller';
import { AccaGeneratorService } from './acca-generator.service';
import { AccaGeneratorRun } from './entities/acca-generator-run.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccaGeneratorRun, ApiSettings, Fixture, FixtureOdd, User]),
    AccumulatorsModule,
  ],
  controllers: [AccaGeneratorController],
  providers: [AccaGeneratorService],
  exports: [AccaGeneratorService],
})
export class AccaGeneratorModule {}
