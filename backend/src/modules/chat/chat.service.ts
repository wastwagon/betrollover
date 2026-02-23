import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EmailService } from '../email/email.service';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatReaction } from './entities/chat-reaction.entity';
import { ChatReport } from './entities/chat-report.entity';
import { ChatBan } from './entities/chat-ban.entity';
import { filterMessageContent, isAllowedReaction } from './chat-filter.util';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)    private roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMessage) private msgRepo: Repository<ChatMessage>,
    @InjectRepository(ChatReaction) private reactionRepo: Repository<ChatReaction>,
    @InjectRepository(ChatReport)  private reportRepo: Repository<ChatReport>,
    @InjectRepository(ChatBan)     private banRepo: Repository<ChatBan>,
    private dataSource: DataSource,
    private emailService: EmailService,
  ) {}

  /** Users who sent a message in last N minutes are considered "active" */
  private readonly ACTIVE_WINDOW_MINUTES = 15;

  // ─── Rooms ───────────────────────────────────────────────────────────────

  async getRooms(): Promise<any[]> {
    const rooms = await this.roomRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeSince = new Date(Date.now() - this.ACTIVE_WINDOW_MINUTES * 60 * 1000);

    const [todayCounts, activePerRoom] = await Promise.all([
      this.dataSource.query(`
        SELECT room_id, COUNT(*) as count
        FROM chat_messages
        WHERE is_deleted = FALSE AND created_at >= $1
        GROUP BY room_id
      `, [today]),
      this.dataSource.query(`
        SELECT room_id, COUNT(DISTINCT user_id) as count
        FROM chat_messages
        WHERE is_deleted = FALSE AND created_at >= $1 AND user_id IS NOT NULL
        GROUP BY room_id
      `, [activeSince]),
    ]);

    const todayMap = Object.fromEntries(todayCounts.map((r: any) => [r.room_id, parseInt(r.count)]));
    const activeMap = Object.fromEntries(activePerRoom.map((r: any) => [r.room_id, parseInt(r.count)]));

    return rooms.map((r) => ({
      ...r,
      todayMessages: todayMap[r.id] || 0,
      activeInRoom: activeMap[r.id] || 0,
    }));
  }

  /** Total distinct users who sent a message in any room in the last N minutes */
  async getTotalActiveOnline(): Promise<number> {
    const activeSince = new Date(Date.now() - this.ACTIVE_WINDOW_MINUTES * 60 * 1000);
    const [row] = await this.dataSource.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM chat_messages
      WHERE is_deleted = FALSE AND created_at >= $1 AND user_id IS NOT NULL
    `, [activeSince]);
    return row ? parseInt(row.count) : 0;
  }

  async getRoom(idOrSlug: string): Promise<ChatRoom> {
    const isNum = /^\d+$/.test(idOrSlug);
    const where = isNum ? { id: parseInt(idOrSlug) } : { slug: idOrSlug };
    const room = await this.roomRepo.findOne({ where });
    if (!room) throw new NotFoundException('This chat room does not exist.');
    return room;
  }

  // ─── Messages ────────────────────────────────────────────────────────────

  async getMessages(roomIdOrSlug: string, limit = 100, beforeId?: number): Promise<any[]> {
    const room = await this.getRoom(roomIdOrSlug);

    let query = this.dataSource
      .createQueryBuilder(ChatMessage, 'm')
      .leftJoin('m.user', 'u')
      .addSelect(['u.id', 'u.username', 'u.role', 'u.avatar', 'u.countryCode', 'u.flagEmoji'])
      .where('m.room_id = :roomId AND m.is_deleted = false', { roomId: room.id });

    if (beforeId) {
      query = query.andWhere('m.id < :beforeId', { beforeId });
    }

    const messages = await query
      .orderBy('m.id', 'DESC')
      .take(Math.min(limit, 100))
      .getMany();

    // Get reaction summaries in one query
    const msgIds = messages.map((m) => m.id);
    if (msgIds.length === 0) return [];

    const reactions = await this.dataSource.query(`
      SELECT message_id, emoji, COUNT(*) as count
      FROM chat_reactions
      WHERE message_id = ANY($1)
      GROUP BY message_id, emoji
    `, [msgIds]);

    const reactionMap: Record<number, Record<string, number>> = {};
    for (const r of reactions) {
      if (!reactionMap[r.message_id]) reactionMap[r.message_id] = {};
      reactionMap[r.message_id][r.emoji] = parseInt(r.count);
    }

    return messages
      .reverse()
      .map((m) => ({
        id: m.id,
        roomId: m.roomId,
        content: m.content,
        isFlagged: m.isFlagged,
        createdAt: m.createdAt,
        user: {
          id: m.user?.id,
          username: m.user?.username,
          role: m.user?.role,
          avatar: m.user?.avatar,
          countryCode: m.user?.countryCode,
          flagEmoji: m.user?.flagEmoji,
        },
        reactions: reactionMap[m.id] || {},
      }));
  }

  async getNewMessages(roomIdOrSlug: string, afterId: number): Promise<any[]> {
    const room = await this.getRoom(roomIdOrSlug);

    const messages = await this.dataSource
      .createQueryBuilder(ChatMessage, 'm')
      .leftJoin('m.user', 'u')
      .addSelect(['u.id', 'u.username', 'u.role', 'u.avatar', 'u.countryCode', 'u.flagEmoji'])
      .where('m.room_id = :roomId AND m.is_deleted = false AND m.id > :afterId', {
        roomId: room.id,
        afterId,
      })
      .orderBy('m.id', 'ASC')
      .take(50)
      .getMany();

    const msgIds = messages.map((m) => m.id);
    if (msgIds.length === 0) return [];

    const reactions = await this.dataSource.query(`
      SELECT message_id, emoji, COUNT(*) as count
      FROM chat_reactions WHERE message_id = ANY($1) GROUP BY message_id, emoji
    `, [msgIds]);
    const reactionMap: Record<number, Record<string, number>> = {};
    for (const r of reactions) {
      if (!reactionMap[r.message_id]) reactionMap[r.message_id] = {};
      reactionMap[r.message_id][r.emoji] = parseInt(r.count);
    }

    return messages.map((m) => ({
      id: m.id, roomId: m.roomId, content: m.content,
      isFlagged: m.isFlagged, createdAt: m.createdAt,
      user: {
        id: m.user?.id, username: m.user?.username, role: m.user?.role, avatar: m.user?.avatar,
        countryCode: m.user?.countryCode, flagEmoji: m.user?.flagEmoji,
      },
      reactions: reactionMap[m.id] || {},
    }));
  }

  async sendMessage(userId: number, roomIdOrSlug: string, content: string): Promise<any> {
    const room = await this.getRoom(roomIdOrSlug);
    if (!room.isActive) throw new ForbiddenException('This chat room is currently closed. Please try again later.');

    // Check ban/mute
    await this.assertNotBanned(userId);

    // Rate limit: max 5 messages per 10 seconds
    const recentCount = await this.msgRepo.count({
      where: { userId, roomId: room.id },
    });
    const tooFast = await this.dataSource.query(`
      SELECT COUNT(*) as c FROM chat_messages
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '10 seconds'
    `, [userId]);
    if (parseInt(tooFast[0].c) >= 5) {
      throw new ForbiddenException('You\'re sending messages too quickly. Please wait a moment before sending another.');
    }

    const check = filterMessageContent(content);
    if (check.blocked) {
      // Track warning
      await this.dataSource.query(
        `UPDATE users SET chat_warnings = chat_warnings + 1 WHERE id = $1`,
        [userId],
      );
      // Auto-mute after 3 violations
      const [user] = await this.dataSource.query(
        `SELECT chat_warnings FROM users WHERE id = $1`, [userId],
      );
      if (user && parseInt(user.chat_warnings) >= 3) {
        await this.issueBan(userId, 'mute', 60, 'Auto-muted: repeated content violations', null);
      }
      throw new BadRequestException(check.reason || 'Your message was blocked. Please remove any links, contact details, or prohibited content.');
    }

    const message = this.msgRepo.create({ roomId: room.id, userId, content: content.trim() });
    const saved = await this.msgRepo.save(message);

    const [userRow] = await this.dataSource.query(
      `SELECT id, username, role, avatar, country_code as "countryCode", flag_emoji as "flagEmoji" FROM users WHERE id = $1`, [userId],
    );

    return {
      id: saved.id, roomId: room.id, content: saved.content,
      isFlagged: false, createdAt: saved.createdAt,
      user: userRow, reactions: {},
    };
  }

  // ─── Reactions ───────────────────────────────────────────────────────────

  async toggleReaction(userId: number, messageId: number, emoji: string): Promise<any> {
    if (!isAllowedReaction(emoji)) {
      throw new BadRequestException('Only 👍 ❤️ 😂 🔥 reactions are allowed.');
    }

    const existing = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji },
    });

    if (existing) {
      await this.reactionRepo.delete(existing.id);
    } else {
      await this.reactionRepo.save(this.reactionRepo.create({ messageId, userId, emoji }));
    }

    const rows = await this.dataSource.query(`
      SELECT emoji, COUNT(*) as count FROM chat_reactions
      WHERE message_id = $1 GROUP BY emoji
    `, [messageId]);

    return Object.fromEntries(rows.map((r: any) => [r.emoji, parseInt(r.count)]));
  }

  // ─── Reports ─────────────────────────────────────────────────────────────

  async reportMessage(userId: number, messageId: number, reason: string): Promise<void> {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('This message could not be found.');

    try {
      await this.reportRepo.save(this.reportRepo.create({ messageId, reporterId: userId, reason }));
    } catch {
      // Already reported by this user — ignore
    }

    // Increment flagged_count; auto-flag at threshold 3
    const [updated] = await this.dataSource.query(
      `UPDATE chat_messages SET flagged_count = flagged_count + 1,
       is_flagged = CASE WHEN flagged_count + 1 >= 3 THEN TRUE ELSE is_flagged END
       WHERE id = $1
       RETURNING flagged_count, is_flagged, content, user_id`,
      [messageId],
    );

    // Notify admins when message becomes flagged
    if (updated?.is_flagged) {
      this.emailService.sendAdminNotification({
        subject: '🚩 Chat message auto-flagged for review',
        message: `A chat message has been reported ${updated.flagged_count} times and flagged for review.\n\nMessage: "${updated.content}"\n\nPlease review it in the Admin Chat panel.`,
        link: `${process.env.APP_URL || 'http://localhost:6002'}/admin/chat`,
      }).catch(() => {});
    }
  }

  // ─── Admin actions ───────────────────────────────────────────────────────

  async adminDeleteMessage(adminId: number, messageId: number, reason?: string): Promise<void> {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('This message could not be found.');
    await this.msgRepo.update(messageId, {
      isDeleted: true,
      deletedBy: adminId,
      deletedReason: reason || 'Removed by admin',
    });
  }

  async pinMessage(adminId: number, roomIdOrSlug: string, messageId: number): Promise<void> {
    const room = await this.getRoom(roomIdOrSlug);
    await this.roomRepo.update(room.id, { pinnedMessageId: messageId });
  }

  async unpinMessage(adminId: number, roomIdOrSlug: string): Promise<void> {
    const room = await this.getRoom(roomIdOrSlug);
    await this.dataSource.query(`UPDATE chat_rooms SET pinned_message_id = NULL WHERE id = $1`, [room.id]);
  }

  async issueBan(
    userId: number,
    type: 'mute' | 'ban',
    durationMinutes: number | null,
    reason: string,
    adminId: number | null,
  ): Promise<void> {
    // Expire existing active bans of same type
    await this.dataSource.query(
      `UPDATE chat_bans SET is_active = FALSE WHERE user_id = $1 AND ban_type = $2 AND is_active = TRUE`,
      [userId, type],
    );

    const expiresAt = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000)
      : null;

    const ban = new ChatBan();
    ban.userId = userId;
    ban.banType = type;
    ban.reason = reason;
    ban.expiresAt = expiresAt ?? undefined;
    ban.bannedBy = adminId ?? undefined;
    ban.isActive = true;
    await this.banRepo.save(ban);
  }

  async liftBan(userId: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE chat_bans SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE`,
      [userId],
    );
  }

  async getAdminFlaggedMessages(page = 1): Promise<any> {
    const limit = 20;
    const offset = (page - 1) * limit;

    const rows = await this.dataSource.query(`
      SELECT m.id, m.content, m.flagged_count, m.created_at, m.room_id,
             u.id as user_id, u.username, u.chat_warnings,
             r.name as room_name,
             (SELECT COUNT(*) FROM chat_reports cr WHERE cr.message_id = m.id AND cr.is_reviewed = FALSE) as report_count
      FROM chat_messages m
      JOIN users u ON u.id = m.user_id
      JOIN chat_rooms r ON r.id = m.room_id
      WHERE m.is_flagged = TRUE AND m.is_deleted = FALSE
      ORDER BY m.flagged_count DESC, m.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const [{ total }] = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM chat_messages WHERE is_flagged = TRUE AND is_deleted = FALSE`,
    );

    return { data: rows, total: parseInt(total), page, pages: Math.ceil(parseInt(total) / limit) };
  }

  async getAdminBans(page = 1): Promise<any> {
    const limit = 20;
    const offset = (page - 1) * limit;

    const rows = await this.dataSource.query(`
      SELECT b.id, b.ban_type, b.reason, b.expires_at, b.is_active, b.created_at,
             u.id as user_id, u.username
      FROM chat_bans b
      JOIN users u ON u.id = b.user_id
      WHERE b.is_active = TRUE
      ORDER BY b.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return { data: rows, total: rows.length, page };
  }

  async updateRoom(adminId: number, roomId: number, dto: Partial<ChatRoom>): Promise<ChatRoom | null> {
    await this.roomRepo.update(roomId, dto);
    return this.roomRepo.findOne({ where: { id: roomId } });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async assertNotBanned(userId: number): Promise<void> {
    const [ban] = await this.dataSource.query(`
      SELECT ban_type, expires_at FROM chat_bans
      WHERE user_id = $1 AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `, [userId]);

    if (ban) {
      const expiry = ban.expires_at
        ? `until ${new Date(ban.expires_at).toLocaleString()}`
        : 'permanently';
      if (ban.ban_type === 'mute') {
        throw new ForbiddenException(`You are temporarily muted from this chat. ${expiry}`);
      } else {
        throw new ForbiddenException(`Your chat access has been suspended. ${expiry}`);
      }
    }

    // Auto-expire past bans in background
    this.dataSource.query(
      `UPDATE chat_bans SET is_active = FALSE WHERE user_id = $1 AND expires_at < NOW() AND is_active = TRUE`,
      [userId],
    ).catch(() => {});
  }
}
