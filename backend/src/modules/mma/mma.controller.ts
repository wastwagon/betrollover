import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { SportEvent } from '../sport-events/entities/sport-event.entity';
import { isSportEnabled } from '../../config/sports.config';

@Controller('mma')
export class MmaController {
  constructor(
    @InjectRepository(SportEvent)
    private sportEventRepo: Repository<SportEvent>,
  ) {}

  @Get('events')
  @UseGuards(JwtAuthGuard)
  async getEvents(@Query('days') days?: string) {
    if (!isSportEnabled('mma')) return { events: [] };
    const now = new Date();
    const daysAhead = Math.min(parseInt(days || '7', 10) || 7, 14);
    const end = new Date(now);
    end.setDate(end.getDate() + daysAhead);

    const events = await this.sportEventRepo.find({
      where: { sport: 'mma', status: 'NS', eventDate: MoreThanOrEqual(now) },
      relations: ['odds'],
      order: { eventDate: 'ASC' },
      take: 200,
    });

    const filtered = events
      .filter((e) => e.eventDate <= end && (e.odds?.length ?? 0) > 0);
    return { events: filtered };
  }
}
