import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { VIP_TIPSTER, VIP_TIPSTER_TYPE } from '../../config/vip-tipster.config';
import { NotificationsService } from '../notifications/notifications.service';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { AccumulatorPick } from '../accumulators/entities/accumulator-pick.entity';
import { Tipster } from '../predictions/entities/tipster.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { TelegramVipMembership } from './entities/telegram-vip-membership.entity';
import {
  telegramApi,
  telegramBotUsername,
  telegramSendPhoto,
  telegramVipChatId,
  telegramVipEnabled,
  telegramWebhookSecret,
  telegramWebhookUrl,
} from './telegram-api';
import {
  couponCardCaption,
  renderCouponCardPng,
  type TelegramCouponCardLeg,
} from './telegram-coupon-card';
import {
  formatVipCouponPost,
  formatVipWinPost,
  parseVipStartPayload,
  vipBotStartUrl,
  type VipSlipLeg,
} from './telegram-vip-format';

const PREDICTION_TIME_ZONE =
  process.env.PREDICTION_TIMEZONE || process.env.TIMEZONE || 'Africa/Accra';

@Injectable()
export class TelegramVipService {
  private readonly logger = new Logger(TelegramVipService.name);

  constructor(
    @InjectRepository(TelegramVipMembership)
    private readonly membershipRepo: Repository<TelegramVipMembership>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Tipster)
    private readonly tipsterRepo: Repository<Tipster>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(AccumulatorTicket)
    private readonly ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(AccumulatorPick)
    private readonly pickRepo: Repository<AccumulatorPick>,
    private readonly notifications: NotificationsService,
  ) {}

  status() {
    const chatId = telegramVipChatId();
    return {
      enabled: telegramVipEnabled(),
      configured: telegramVipEnabled(),
      chatId,
      botUsername: telegramBotUsername(),
      webhookUrl: telegramWebhookUrl(),
      webhookSecretSet: Boolean(telegramWebhookSecret()),
    };
  }

  async houseVipTipsterUserId(): Promise<number | null> {
    const tipster = await this.tipsterRepo.findOne({
      where: { username: VIP_TIPSTER.username, tipsterType: VIP_TIPSTER_TYPE },
      select: ['userId'],
    });
    return tipster?.userId ?? null;
  }

  async isHouseVipUserId(userId: number | null | undefined): Promise<boolean> {
    if (userId == null) return false;
    const houseId = await this.houseVipTipsterUserId();
    return houseId != null && houseId === userId;
  }

  async hasActiveHouseVip(userId: number): Promise<boolean> {
    const houseId = await this.houseVipTipsterUserId();
    if (!houseId) return false;
    const now = new Date();
    const count = await this.subRepo
      .createQueryBuilder('s')
      .innerJoin('s.package', 'pkg')
      .where('s.userId = :userId', { userId })
      .andWhere('s.status = :status', { status: 'active' })
      .andWhere('pkg.tipsterUserId = :houseId', { houseId })
      .andWhere('(s.endsAt IS NULL OR s.endsAt > :now)', { now })
      .getCount();
    return count > 0;
  }

  async accessForUser(userId: number): Promise<{
    configured: boolean;
    joinUrl: string | null;
    inviteUrl: string | null;
    botUrl: string | null;
    status: string | null;
  } | null> {
    if (!(await this.hasActiveHouseVip(userId))) return null;
    const membership = await this.membershipRepo.findOne({ where: { userId } });
    const botUrl = membership ? vipBotStartUrl(telegramBotUsername(), membership.linkToken) : null;
    const inviteUrl = membership?.inviteLink || null;
    return {
      configured: telegramVipEnabled(),
      joinUrl: botUrl || inviteUrl,
      inviteUrl,
      botUrl,
      status: membership?.status ?? null,
    };
  }

  async grantAccessForSubscription(userId: number, subscription: Subscription): Promise<void> {
    if (!telegramVipEnabled()) return;
    const pkg = subscription.package;
    const houseId = await this.houseVipTipsterUserId();
    if (!houseId || !pkg || pkg.tipsterUserId !== houseId) return;

    const membership = await this.upsertMembership(userId, subscription.id);
    const invite = await this.refreshInviteLink(membership, subscription.endsAt);
    if (invite.ok && invite.link) {
      membership.inviteLink = invite.link;
      await this.membershipRepo.save(membership);
    } else if (!invite.ok) {
      this.logger.warn(`VIP invite link failed for user ${userId}: ${invite.error}`);
    }

    const botUrl = vipBotStartUrl(telegramBotUsername(), membership.linkToken);
    const joinUrl = botUrl || membership.inviteLink;
    const how =
      botUrl
        ? `Open the VIP bot to join the private Telegram: ${botUrl}`
        : membership.inviteLink
          ? `Join the private VIP Telegram: ${membership.inviteLink}`
          : 'VIP Telegram will be ready after the bot is configured.';
    this.notifications
      .create({
        userId,
        type: 'subscription',
        title: 'VIP Telegram access',
        message: `${how} Access lasts until your plan ends.`,
        link: '/subscriptions',
        icon: 'star',
        sendEmail: true,
        metadata: { packageName: pkg.name, telegramJoin: joinUrl || '' },
      })
      .catch(() => {});
  }

  async refreshAccess(userId: number): Promise<{
    joinUrl: string | null;
    inviteUrl: string | null;
    botUrl: string | null;
  }> {
    if (!telegramVipEnabled()) {
      return { joinUrl: null, inviteUrl: null, botUrl: null };
    }
    const sub = await this.activeHouseSubscription(userId);
    if (!sub) {
      return { joinUrl: null, inviteUrl: null, botUrl: null };
    }
    const membership = await this.upsertMembership(userId, sub.id);
    const invite = await this.refreshInviteLink(membership, sub.endsAt);
    if (invite.ok && invite.link) {
      membership.inviteLink = invite.link;
      membership.status = membership.status === 'kicked' ? 'invited' : membership.status;
      await this.membershipRepo.save(membership);
    }
    const botUrl = vipBotStartUrl(telegramBotUsername(), membership.linkToken);
    return {
      joinUrl: botUrl || membership.inviteLink,
      inviteUrl: membership.inviteLink,
      botUrl,
    };
  }

  async handleWebhookUpdate(update: Record<string, unknown>): Promise<void> {
    const message = update.message as
      | { text?: string; chat?: { type?: string; id?: number }; from?: { id?: number; username?: string } }
      | undefined;
    if (message?.text && (message.chat?.type === 'private' || !message.chat?.type)) {
      await this.handleStart(message.text, message.from);
    }
    const member = (update.chat_member || update.my_chat_member) as
      | {
          chat?: { id?: number };
          new_chat_member?: { status?: string; user?: { id?: number; username?: string } };
        }
      | undefined;
    if (member?.chat?.id != null) {
      await this.handleChatMember(String(member.chat.id), member.new_chat_member);
    }
  }

  async sendTestMessage(customText?: string): Promise<{ ok: boolean; error?: string }> {
    if (!telegramVipEnabled()) return { ok: false, error: 'not_configured' };
    const text =
      customText?.trim() ||
      `BETROLLOVER VIP bot test ✅\n${new Date().toISOString()}`;
    return telegramApi('sendMessage', {
      chat_id: telegramVipChatId(),
      text,
      disable_web_page_preview: true,
    });
  }

  async setupWebhook(): Promise<{ ok: boolean; error?: string; url?: string }> {
    const url = telegramWebhookUrl();
    if (!url) return { ok: false, error: 'Set TELEGRAM_WEBHOOK_URL (https://api.betrollover.com/telegram/webhook)' };
    const secret = telegramWebhookSecret();
    const body: Record<string, unknown> = {
      url,
      allowed_updates: ['message', 'chat_member', 'my_chat_member'],
    };
    if (secret) body.secret_token = secret;
    const res = await telegramApi('setWebhook', body);
    if (!res.ok) return res;
    return { ok: true, url };
  }

  /**
   * Post the VIP slip (or win card) again. Use when the Telegram message was deleted.
   * Creates a new chat message — Telegram cannot restore the old one.
   */
  async repostHouseVipCoupon(ticketId: number): Promise<{ ok: boolean; error?: string; couponId: number }> {
    if (!telegramVipEnabled()) return { ok: false, error: 'not_configured', couponId: ticketId };
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) return { ok: false, error: 'not_found', couponId: ticketId };
    if (!(await this.isHouseVipUserId(ticket.userId))) {
      return { ok: false, error: 'not_vip_coupon', couponId: ticketId };
    }
    const picks = await this.pickRepo.find({
      where: { accumulatorId: ticket.id },
      order: { id: 'ASC' },
    });
    const legs = picks.map((p) => ({
      matchDescription: p.matchDescription,
      prediction: p.prediction,
      odds: Number(p.odds),
      matchDate: p.matchDate,
      result: p.result,
    }));
    const won = (ticket.result || '').toLowerCase() === 'won';
    const posted = won
      ? await this.postVipWin({
          couponId: ticket.id,
          title: ticket.title || 'Two-Fold',
          totalOdds: ticket.totalOdds != null ? Number(ticket.totalOdds) : null,
          tipsterName: 'VIP · Two-Fold',
          legs,
        })
      : await this.postVipCoupon({
          couponId: ticket.id,
          title: ticket.title || 'Two-Fold',
          totalOdds: ticket.totalOdds != null ? Number(ticket.totalOdds) : null,
          tipsterName: 'VIP · Two-Fold',
          bookmakerKey: ticket.bookmakerKey,
          bookingCode: ticket.bookingCode,
          legs,
        });
    if (posted.ok) {
      this.logger.log(`VIP coupon #${ticket.id} resent to Telegram (${won ? 'win' : 'slip'})`);
    }
    return { ...posted, couponId: ticket.id };
  }

  async postVipCoupon(input: {
    couponId: number;
    title: string;
    totalOdds?: number | null;
    legs?: VipSlipLeg[];
    bookmakerKey?: string | null;
    bookingCode?: string | null;
    tipsterName?: string | null;
  }): Promise<{ ok: boolean; error?: string }> {
    if (!telegramVipEnabled()) return { ok: false, error: 'not_configured' };
    const couponUrl = this.couponUrl(input.couponId);
    const caption = couponCardCaption({
      headline: `BETROLLOVER VIP · ${(input.title || 'Two-Fold').trim()}${
        input.totalOdds != null ? ` · ${Number(input.totalOdds).toFixed(2)}` : ''
      }`,
      couponUrl,
    });
    try {
      const png = await renderCouponCardPng({
        title: input.title,
        tipsterName: input.tipsterName || 'VIP · Two-Fold',
        totalOdds: input.totalOdds,
        channel: 'vip',
        variant: 'live',
        legs: input.legs,
        bookmakerKey: input.bookmakerKey,
        bookingCode: input.bookingCode,
      });
      const photo = await telegramSendPhoto({
        chatId: telegramVipChatId()!,
        png,
        caption,
      });
      if (photo.ok) return photo;
    } catch (e) {
      this.logger.warn(`VIP coupon card render failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    const text = formatVipCouponPost({
      ...input,
      couponUrl,
    });
    return telegramApi('sendMessage', {
      chat_id: telegramVipChatId(),
      text,
      disable_web_page_preview: false,
    });
  }

  async postVipWin(input: {
    couponId: number;
    title: string;
    totalOdds?: number | null;
    legs?: TelegramCouponCardLeg[];
    tipsterName?: string | null;
  }): Promise<{ ok: boolean; error?: string }> {
    if (!telegramVipEnabled()) return { ok: false, error: 'not_configured' };
    const couponUrl = this.couponUrl(input.couponId);
    const caption = couponCardCaption({
      headline: `VIP won ✅ · ${(input.title || 'Two-Fold').trim()}${
        input.totalOdds != null ? ` · ${Number(input.totalOdds).toFixed(2)}` : ''
      }`,
      couponUrl,
    });
    try {
      const png = await renderCouponCardPng({
        title: input.title,
        tipsterName: input.tipsterName || 'VIP · Two-Fold',
        totalOdds: input.totalOdds,
        channel: 'vip',
        variant: 'won',
        legs: input.legs,
      });
      const photo = await telegramSendPhoto({
        chatId: telegramVipChatId()!,
        png,
        caption,
      });
      if (photo.ok) return photo;
    } catch (e) {
      this.logger.warn(`VIP won card render failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    const text = formatVipWinPost({
      ...input,
      couponUrl,
    });
    return telegramApi('sendMessage', {
      chat_id: telegramVipChatId(),
      text,
      disable_web_page_preview: false,
    });
  }

  async kickExpired(): Promise<{ kicked: number; errors: number }> {
    if (!telegramVipEnabled()) return { kicked: 0, errors: 0 };
    const now = new Date();
    const rows = await this.membershipRepo.find();
    let kicked = 0;
    let errors = 0;
    for (const row of rows) {
      if (row.status === 'kicked' || row.status === 'expired') continue;
      const stillActive = await this.hasActiveHouseVip(row.userId);
      if (stillActive) continue;
      if (row.telegramUserId) {
        const ban = await telegramApi('banChatMember', {
          chat_id: telegramVipChatId(),
          user_id: Number(row.telegramUserId),
          until_date: Math.floor(Date.now() / 1000) + 45,
        });
        if (!ban.ok) {
          this.logger.warn(`VIP kick failed user ${row.userId}: ${ban.error}`);
          errors++;
          continue;
        }
        await telegramApi('unbanChatMember', {
          chat_id: telegramVipChatId(),
          user_id: Number(row.telegramUserId),
          only_if_banned: true,
        });
      }
      row.status = 'kicked';
      row.kickedAt = now;
      await this.membershipRepo.save(row);
      kicked++;
    }
    return { kicked, errors };
  }

  predictionTimeZone(): string {
    return PREDICTION_TIME_ZONE;
  }

  private async handleStart(
    text: string,
    from?: { id?: number; username?: string },
  ): Promise<void> {
    if (!from?.id) return;
    const tgId = String(from.id);
    const username = from.username || null;
    const token = parseVipStartPayload(text);

    let membership = token
      ? await this.membershipRepo.findOne({ where: { linkToken: token } })
      : await this.membershipRepo.findOne({ where: { telegramUserId: tgId } });

    await this.usersRepo
      .createQueryBuilder()
      .update()
      .set({ telegramUserId: null, telegramUsername: null })
      .where('telegram_user_id = :id', { id: tgId })
      .execute();
    if (membership) {
      await this.usersRepo.update(membership.userId, {
        telegramUserId: tgId,
        telegramUsername: username,
      });
      membership.telegramUserId = tgId;
      membership.telegramUsername = username;
      await this.membershipRepo.save(membership);
    }

    const chatId = from.id;
    if (!membership) {
      await telegramApi('sendMessage', {
        chat_id: chatId,
        text: 'Subscribe to VIP · Two-Fold on BetRollover, then open this bot from your subscriptions page to join the private VIP Telegram.',
      });
      return;
    }

    const active = await this.hasActiveHouseVip(membership.userId);
    if (!active) {
      await telegramApi('sendMessage', {
        chat_id: chatId,
        text: 'This Telegram is for active VIP · Two-Fold members. Renew on BetRollover, then tap Start again.',
      });
      return;
    }

    const sub = await this.activeHouseSubscription(membership.userId);
    if (sub) {
      const invite = await this.refreshInviteLink(membership, sub.endsAt);
      if (invite.ok && invite.link) {
        membership.inviteLink = invite.link;
        await this.membershipRepo.save(membership);
      }
    }
    const link = membership.inviteLink;
    await telegramApi('sendMessage', {
      chat_id: chatId,
      text: link
        ? `Welcome to BETROLLOVER VIP.\nTap to join (one-time link, lasts until your plan ends):\n${link}`
        : 'Your VIP is active. The invite link is not ready yet — ask admin to check TELEGRAM_VIP_CHAT_ID and bot admin rights.',
      disable_web_page_preview: true,
    });
  }

  private async handleChatMember(
    chatId: string,
    member?: { status?: string; user?: { id?: number; username?: string } },
  ): Promise<void> {
    const vipChat = telegramVipChatId();
    if (!vipChat || String(chatId) !== String(vipChat)) return;
    const tgId = member?.user?.id != null ? String(member.user.id) : null;
    if (!tgId) return;
    const membership = await this.membershipRepo.findOne({ where: { telegramUserId: tgId } });
    if (!membership) return;
    const status = (member?.status || '').toLowerCase();
    if (status === 'member' || status === 'administrator' || status === 'creator') {
      membership.status = 'joined';
      membership.joinedAt = membership.joinedAt || new Date();
      membership.telegramUsername = member?.user?.username || membership.telegramUsername;
      await this.membershipRepo.save(membership);
    } else if (status === 'left' || status === 'kicked') {
      if (membership.status === 'joined') {
        membership.status = 'expired';
        await this.membershipRepo.save(membership);
      }
    }
  }

  private async activeHouseSubscription(userId: number): Promise<Subscription | null> {
    const houseId = await this.houseVipTipsterUserId();
    if (!houseId) return null;
    const now = new Date();
    return this.subRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.package', 'pkg')
      .where('s.userId = :userId', { userId })
      .andWhere('s.status = :status', { status: 'active' })
      .andWhere('pkg.tipsterUserId = :houseId', { houseId })
      .andWhere('(s.endsAt IS NULL OR s.endsAt > :now)', { now })
      .orderBy('s.endsAt', 'DESC')
      .getOne();
  }

  private async upsertMembership(userId: number, subscriptionId: number): Promise<TelegramVipMembership> {
    let row = await this.membershipRepo.findOne({ where: { userId } });
    if (!row) {
      row = this.membershipRepo.create({
        userId,
        subscriptionId,
        linkToken: randomBytes(16).toString('hex'),
        status: 'invited',
      });
      return this.membershipRepo.save(row);
    }
    row.subscriptionId = subscriptionId;
    if (!row.linkToken) row.linkToken = randomBytes(16).toString('hex');
    if (row.status === 'kicked' || row.status === 'expired') row.status = 'invited';
    return this.membershipRepo.save(row);
  }

  private async refreshInviteLink(
    membership: TelegramVipMembership,
    endsAt: Date,
  ): Promise<{ ok: boolean; link?: string; error?: string }> {
    const expire = Math.max(Math.floor(new Date(endsAt).getTime() / 1000), Math.floor(Date.now() / 1000) + 3600);
    const res = await telegramApi<{ invite_link?: string }>('createChatInviteLink', {
      chat_id: telegramVipChatId(),
      name: `vip-${membership.userId}`.slice(0, 32),
      expire_date: expire,
      member_limit: 1,
    });
    if (!res.ok) return res;
    return { ok: true, link: res.result?.invite_link };
  }

  private couponUrl(couponId: number): string {
    const raw = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://betrollover.com').trim();
    const base = raw.replace(/\/$/, '') || 'https://betrollover.com';
    return `${base}/coupons/${couponId}?utm_source=telegram&utm_medium=social&utm_campaign=vip_channel`;
  }
}
