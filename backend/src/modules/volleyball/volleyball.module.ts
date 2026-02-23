import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { SportEventOdd } from '../sport-events/entities/sport-event-odd.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { VolleyballApiService } from './volleyball-api.service';
import { VolleyballSyncService } from './volleyball-sync.service';
import { VolleyballController } from './volleyball.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SportEvent, SportEventOdd, ApiSettings])],
  controllers: [VolleyballController],
  providers: [VolleyballApiService, VolleyballSyncService],
  exports: [VolleyballApiService, VolleyballSyncService],
})
export class VolleyballModule {}
