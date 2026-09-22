import { Injectable, Logger } from '@nestjs/common';
import { bookmakerLabelForKey } from '@betrollover/shared-types';
import {
  TELEGRAM_CHANNEL_SEO_DESCRIPTION,
  appendEngagementFooter,
  formatAdvicePost,
  formatCommunityAppealPost,
  formatGrowthPost,
  formatTipsterRecruitPost,
} from './telegram-copy';
import { telegramKickoffLabel, type TelegramSlipLeg } from './telegram-slip';
import { PUBLIC_CHANNEL_SURE_USERNAME } from '../../config/rollover-desk.config';

export type TelegramPickPostInput = {
  couponId: number;
  title: string;
  tipsterName?: string | null;
  totalOdds?: number | null;
  isFree: boolean;
  /** Marketplace price in GHS (paid teasers only). */
  priceGhs?: number | null;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  legs?: TelegramSlipLeg[];
};

export type TelegramWinPostInput = {
  couponId: number;
  title: string;
  tipsterName?: string | null;
  totalOdds?: number | null;
  isFree: boolean;
  legs?: TelegramSlipLeg[];
};

@Injectable()
export class TelegramChannelService {
  private readonly logger = new Logger(TelegramChannelService.name);

  isConfigured(): boolean {
    return Boolean(this.token() && this.channelId() && this.enabled());
  }

  status(): {
    enabled: boolean;
    configured: boolean;
    channelId: string | null;
    growthPostsEnabled: boolean;
    advicePostsEnabled: boolean;
    communityAppealEnabled: boolean;
    tipsterRecruitEnabled: boolean;
  } {
    const channelId = this.channelId();
    return {
      enabled: this.enabled(),
      configured: Boolean(this.token() && channelId),
      channelId,
      growthPostsEnabled: this.growthEnabled(),
      advicePostsEnabled: this.adviceEnabled(),
      communityAppealEnabled: this.communityAppealEnabled(),
      tipsterRecruitEnabled: this.tipsterRecruitEnabled(),
    };
  }

  /**
   * Free pick (optional booking code) or paid teaser (never includes booking code).
   * Always appends a soft react/share footer.
   */
  async postNewPick(input: TelegramPickPostInput): Promise<{ ok: boolean; error?: string }> {
    const core = input.isFree ? this.formatFreePick(input) : this.formatPaidPick(input);
    return this.sendMessage(appendEngagementFooter(core, input.couponId));
  }

  /** @deprecated use postNewPick */
  async postFreePick(input: TelegramPickPostInput): Promise<{ ok: boolean; error?: string }> {
    if (!input.isFree) {
      return { ok: false, error: 'skipped_paid' };
    }
    return this.postNewPick(input);
  }

  async postWin(input: TelegramWinPostInput): Promise<{ ok: boolean; error?: string }> {
    const core = this.formatWin(input);
    return this.sendMessage(appendEngagementFooter(core, `win-${input.couponId}`));
  }

  /**
   * AccaSure-focused digest (not full Acca Desk roster).
   * Prefer individual AccaSure1X2 posts; use this when batching Sure publishes.
   */
  async postAccaSureDigest(input: {
    deskDay: string;
    publishedCount: number;
  }): Promise<{ ok: boolean; error?: string }> {
    if (!(input.publishedCount > 0)) {
      return { ok: false, error: 'skipped_empty' };
    }
    const day = (input.deskDay || '').trim() || 'today';
    const n = input.publishedCount;
    const base = this.siteOrigin();
    const url = `${base}/tipsters/${PUBLIC_CHANNEL_SURE_USERNAME}?utm_source=telegram&utm_medium=social&utm_campaign=channel_acca_sure`;
    const core = [
      `AccaSure · ${day}`,
      `${n} new free Sure · 1X2 2-fold${n === 1 ? '' : 's'} on BetRollover.`,
      `View tips → ${url}`,
    ].join('\n');
    return this.sendMessage(appendEngagementFooter(core, `acca-sure-${day}-${n}`));
  }

  /** @deprecated Acca Desk full digest removed — Sure-first. */
  async postAccaDeskDigest(input: {
    deskDay: string;
    publishedCount: number;
  }): Promise<{ ok: boolean; error?: string }> {
    return this.postAccaSureDigest(input);
  }

  async postGrowthMessage(salt?: number | string): Promise<{ ok: boolean; error?: string }> {
    if (!this.growthEnabled()) {
      return { ok: false, error: 'growth_disabled' };
    }
    const text = formatGrowthPost(this.siteOrigin(), salt ?? Date.now());
    return this.sendMessage(text);
  }

  /** Daily bankroll / “stay in profit” strategy education (complete post — no extra footer). */
  async postAdviceMessage(salt?: number | string): Promise<{ ok: boolean; error?: string }> {
    if (!this.adviceEnabled()) {
      return { ok: false, error: 'advice_disabled' };
    }
    const s = salt ?? Date.now();
    return this.sendMessage(formatAdvicePost(this.siteOrigin(), s));
  }

  /**
   * Exact daily community appeal (react meanings + share join link).
   * No extra engagement footer — message is complete as written.
   */
  async postCommunityAppealMessage(): Promise<{ ok: boolean; error?: string }> {
    if (!this.communityAppealEnabled()) {
      return { ok: false, error: 'community_appeal_disabled' };
    }
    return this.sendMessage(formatCommunityAppealPost());
  }

  /**
   * Daily tipster recruit — website register + invite tipster friends.
   * Earning = creating paid picks, not sharing the link.
   */
  async postTipsterRecruitMessage(): Promise<{ ok: boolean; error?: string }> {
    if (!this.tipsterRecruitEnabled()) {
      return { ok: false, error: 'tipster_recruit_disabled' };
    }
    return this.sendMessage(formatTipsterRecruitPost(this.siteOrigin()));
  }

  async sendTestMessage(customText?: string): Promise<{ ok: boolean; error?: string }> {
    const text =
      customText?.trim() ||
      `BetRollover Telegram channel test ✅\n${new Date().toISOString()}\n${this.siteOrigin()}`;
    return this.sendMessage(appendEngagementFooter(text, 'test'));
  }

  /**
   * Sync channel About text (Telegram discovery / “SEO”).
   * Bot must be channel admin with change-info permission.
   */
  async syncChannelSeoDescription(custom?: string): Promise<{ ok: boolean; error?: string }> {
    const token = this.token();
    const chatId = this.channelId();
    if (!token || !chatId) return { ok: false, error: 'not_configured' };
    const description = (custom || process.env.TELEGRAM_CHANNEL_SEO_DESCRIPTION || TELEGRAM_CHANNEL_SEO_DESCRIPTION)
      .trim()
      .slice(0, 255);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/setChatDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, description }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; description?: string }
        | null;
      if (!res.ok || !json?.ok) {
        const err = json?.description || `HTTP ${res.status}`;
        this.logger.warn(`Telegram setChatDescription failed: ${err}`);
        return { ok: false, error: err };
      }
      this.logger.log('Telegram channel description synced (SEO about text)');
      return { ok: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Telegram setChatDescription error: ${err}`);
      return { ok: false, error: err };
    }
  }

  async sendMessage(text: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.enabled()) {
      return { ok: false, error: 'disabled' };
    }
    const token = this.token();
    const chatId = this.channelId();
    if (!token || !chatId) {
      return { ok: false, error: 'not_configured' };
    }
    const body = {
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    };
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; description?: string }
        | null;
      if (!res.ok || !json?.ok) {
        const err = json?.description || `HTTP ${res.status}`;
        this.logger.warn(`Telegram sendMessage failed: ${err}`);
        return { ok: false, error: err };
      }
      return { ok: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Telegram sendMessage error: ${err}`);
      return { ok: false, error: err };
    }
  }

  private formatFreePick(input: TelegramPickPostInput): string {
    const title = (input.title || '').trim() || 'Pick';
    const odds =
      input.totalOdds != null && Number.isFinite(Number(input.totalOdds))
        ? Number(input.totalOdds).toFixed(2)
        : '';
    const tipster = (input.tipsterName || '').trim();
    const code = (input.bookingCode || '').trim();
    const bookieKey = (input.bookmakerKey || '').trim();
    const bookie = bookieKey ? bookmakerLabelForKey(bookieKey) || bookieKey : '';
    const url = this.couponUrl(input.couponId, 'free');

    const lines = [`${title} · free${odds ? ` · ${odds} odds` : ''}`];
    if (tipster) lines.push(`Tipster: ${tipster}`);
    for (const leg of input.legs || []) {
      const match = (leg.matchDescription || '').trim();
      const pred = (leg.prediction || '').trim();
      const lo =
        leg.odds != null && Number.isFinite(Number(leg.odds)) ? ` @ ${Number(leg.odds).toFixed(2)}` : '';
      const when = telegramKickoffLabel(leg.matchDate);
      if (match || pred) {
        lines.push(`• ${match}${match && pred ? ' — ' : ''}${pred}${lo}${when ? ` · ${when}` : ''}`);
      }
    }
    if (code) {
      lines.push(bookie ? `${bookie} code: ${code}` : `Booking code: ${code}`);
    }
    lines.push('');
    lines.push(url);
    return lines.join('\n');
  }

  private formatPaidPick(input: TelegramPickPostInput): string {
    const title = (input.title || '').trim() || 'Pick';
    const odds =
      input.totalOdds != null && Number.isFinite(Number(input.totalOdds))
        ? Number(input.totalOdds).toFixed(2)
        : '';
    const tipster = (input.tipsterName || '').trim();
    const price =
      input.priceGhs != null && Number.isFinite(Number(input.priceGhs)) && Number(input.priceGhs) > 0
        ? Number(input.priceGhs).toFixed(2)
        : null;
    const url = this.couponUrl(input.couponId, 'paid');

    const head = `Paid pick 🔒 · ${title}${odds ? ` · ${odds} odds` : ''}${price ? ` · GHS ${price}` : ''}`;
    const lines = [head];
    if (tipster) lines.push(`Tipster: ${tipster}`);
    lines.push('Unlock on BetRollover — the pick price is refunded if it loses.');
    lines.push('');
    lines.push(url);
    return lines.join('\n');
  }

  private formatWin(input: TelegramWinPostInput): string {
    const title = (input.title || '').trim() || 'Pick';
    const odds =
      input.totalOdds != null && Number.isFinite(Number(input.totalOdds))
        ? Number(input.totalOdds).toFixed(2)
        : '';
    const tipster = (input.tipsterName || '').trim();
    const url = this.couponUrl(input.couponId, 'win');
    const priceBit = input.isFree ? 'free' : 'paid';
    const lines = [`Won ✅ · ${title}${odds ? ` · ${odds}` : ''} · ${priceBit}`];
    if (tipster) lines.push(`Tipster: ${tipster}`);
    for (const leg of input.legs || []) {
      const match = (leg.matchDescription || '').trim();
      const pred = (leg.prediction || '').trim();
      const mark = (leg.result || 'won').toUpperCase();
      const score =
        leg.homeScore != null && leg.awayScore != null ? ` FT ${leg.homeScore}-${leg.awayScore}` : '';
      if (match || pred) lines.push(`• ${match}${match && pred ? ' — ' : ''}${pred} · ${mark}${score}`);
    }
    lines.push('Won together — share the W.');
    lines.push('');
    lines.push(url);
    return lines.join('\n');
  }

  private couponUrl(couponId: number, campaign: 'free' | 'paid' | 'win'): string {
    const base = this.siteOrigin();
    const c =
      campaign === 'paid' ? 'channel_paid' : campaign === 'win' ? 'channel_win' : 'channel_auto';
    return `${base}/coupons/${couponId}?utm_source=telegram&utm_medium=social&utm_campaign=${c}`;
  }

  private siteOrigin(): string {
    const raw = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://betrollover.com').trim();
    return raw.replace(/\/$/, '') || 'https://betrollover.com';
  }

  private enabled(): boolean {
    const v = (process.env.TELEGRAM_CHANNEL_POSTS_ENABLED || 'true').trim().toLowerCase();
    return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
  }

  private growthEnabled(): boolean {
    const v = (process.env.TELEGRAM_GROWTH_POSTS_ENABLED || 'true').trim().toLowerCase();
    return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
  }

  private adviceEnabled(): boolean {
    const v = (process.env.TELEGRAM_ADVICE_POSTS_ENABLED || 'true').trim().toLowerCase();
    return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
  }

  private communityAppealEnabled(): boolean {
    const v = (process.env.TELEGRAM_COMMUNITY_APPEAL_ENABLED || 'true').trim().toLowerCase();
    return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
  }

  private tipsterRecruitEnabled(): boolean {
    const v = (process.env.TELEGRAM_TIPSTER_RECRUIT_ENABLED || 'true').trim().toLowerCase();
    return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
  }

  private token(): string | null {
    const t = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    return t || null;
  }

  private channelId(): string | null {
    const explicit = (process.env.TELEGRAM_CHANNEL_ID || '').trim();
    if (explicit) return explicit;
    const handle = (process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE || '').trim().replace(/^@/, '');
    if (handle) return `@${handle}`;
    return '@betrollovertips';
  }
}
