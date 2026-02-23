import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '../users/entities/user.entity';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ─── Public (read-only) ──────────────────────────────────────────────────

  @Get('presence')
  getPresence() {
    return this.chatService.getTotalActiveOnline().then((totalOnline) => ({ totalOnline }));
  }

  @Get('rooms')
  getRooms() {
    return this.chatService.getRooms();
  }

  @Get('rooms/:slug')
  getRoom(@Param('slug') slug: string) {
    return this.chatService.getRoom(slug);
  }

  @Get('rooms/:slug/messages')
  getMessages(
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
    @Query('before_id') beforeId?: string,
  ) {
    return this.chatService.getMessages(
      slug,
      limit ? parseInt(limit) : 100,
      beforeId ? parseInt(beforeId) : undefined,
    );
  }

  @Get('rooms/:slug/poll')
  pollNewMessages(
    @Param('slug') slug: string,
    @Query('after_id') afterId: string,
  ) {
    return this.chatService.getNewMessages(slug, parseInt(afterId) || 0);
  }

  // ─── Authenticated ───────────────────────────────────────────────────────

  @Post('rooms/:slug/messages')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 10000, limit: 5 } })
  sendMessage(
    @Param('slug') slug: string,
    @Body('content') content: string,
    @Request() req: any,
  ) {
    return this.chatService.sendMessage(req.user.id, slug, content);
  }

  @Post('messages/:id/react')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 5000, limit: 10 } })
  react(
    @Param('id') id: string,
    @Body('emoji') emoji: string,
    @Request() req: any,
  ) {
    return this.chatService.toggleReaction(req.user.id, parseInt(id), emoji);
  }

  @Post('messages/:id/report')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  report(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.chatService.reportMessage(req.user.id, parseInt(id), reason || 'spam');
  }

  // ─── Admin ───────────────────────────────────────────────────────────────

  @Delete('admin/messages/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  adminDelete(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.chatService.adminDeleteMessage(req.user.id, parseInt(id), reason);
  }

  @Post('admin/rooms/:slug/pin/:messageId')
  @UseGuards(JwtAuthGuard)
  pinMessage(
    @Param('slug') slug: string,
    @Param('messageId') messageId: string,
    @Request() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.chatService.pinMessage(req.user.id, slug, parseInt(messageId));
  }

  @Delete('admin/rooms/:slug/pin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  unpinMessage(@Param('slug') slug: string, @Request() req: any) {
    this.assertAdmin(req.user);
    return this.chatService.unpinMessage(req.user.id, slug);
  }

  @Post('admin/users/:userId/ban')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  banUser(
    @Param('userId') userId: string,
    @Body() body: { type: 'mute' | 'ban'; duration?: number; reason?: string },
    @Request() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.chatService.issueBan(
      parseInt(userId),
      body.type,
      body.duration ?? null,
      body.reason || 'Admin action',
      req.user.id,
    );
  }

  @Delete('admin/users/:userId/ban')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  liftBan(@Param('userId') userId: string, @Request() req: any) {
    this.assertAdmin(req.user);
    return this.chatService.liftBan(parseInt(userId));
  }

  @Get('admin/flagged')
  @UseGuards(JwtAuthGuard)
  getFlagged(@Query('page') page: string, @Request() req: any) {
    this.assertAdmin(req.user);
    return this.chatService.getAdminFlaggedMessages(page ? parseInt(page) : 1);
  }

  @Get('admin/bans')
  @UseGuards(JwtAuthGuard)
  getBans(@Query('page') page: string, @Request() req: any) {
    this.assertAdmin(req.user);
    return this.chatService.getAdminBans(page ? parseInt(page) : 1);
  }

  @Patch('admin/rooms/:id')
  @UseGuards(JwtAuthGuard)
  updateRoom(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; isActive?: boolean },
    @Request() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.chatService.updateRoom(req.user.id, parseInt(id), body);
  }

  // ─── Helper ──────────────────────────────────────────────────────────────

  private assertAdmin(user: any) {
    if (user.role !== UserRole.ADMIN) {
      throw new Error('Admin access required');
    }
  }
}
