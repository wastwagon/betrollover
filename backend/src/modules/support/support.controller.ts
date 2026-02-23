import { Controller, Post, Get, Patch, Body, Param, UseGuards, ParseIntPipe, Query, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 tickets per minute per user
  create(@CurrentUser() user: User, @Body() body: { category: string; subject: string; message: string; relatedCouponId?: number }) {
    return this.supportService.create(user.id, body);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  myTickets(@CurrentUser() user: User) {
    return this.supportService.getMyTickets(user.id);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  myTicket(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.supportService.getMyTicket(user.id, id);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @Get('admin/list')
  @UseGuards(JwtAuthGuard)
  adminList(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.supportService.adminList({ status, page: page ? +page : 1, limit: limit ? +limit : 20 });
  }

  @Patch('admin/:id/resolve')
  @UseGuards(JwtAuthGuard)
  adminResolve(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { response: string; status: string },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.supportService.adminResolve(user.id, id, body);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  adminStats(@CurrentUser() user: User) {
    if (user.role !== 'admin') throw new ForbiddenException();
    return this.supportService.adminGetStats();
  }
}
