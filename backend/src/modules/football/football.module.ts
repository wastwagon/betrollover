import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FootballController } from './football.controller';
import { FootballService } from './football.service';
import { ApiSettings } from '../admin/entities/api-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiSettings])],
  controllers: [FootballController],
  providers: [FootballService],
  exports: [FootballService],
})
export class FootballModule {}
