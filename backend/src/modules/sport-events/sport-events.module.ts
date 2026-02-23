import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEvent } from './entities/sport-event.entity';
import { SportEventOdd } from './entities/sport-event-odd.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SportEvent, SportEventOdd]),
  ],
  exports: [TypeOrmModule],
})
export class SportEventsModule {}
