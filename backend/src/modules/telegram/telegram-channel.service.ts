import { Injectable, Logger } from '@nestjs/common';
import { bookmakerLabelForKey } from '@betrollover/shared-types';

export type TelegramPickPostInput = {
  couponId: number;
  title: string;
  tipsterName?: string | null;
  totalOdds?: number | null;
  isFree: boolean;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
};

export type TelegramWinPostInput = {
  couponId: number;
  title: string;
  tipsterName?: string | null;
  totalOdds?: number | null;
  isFree: boolean;
};

@Injectable()
export class TelegramChannelService {
  private readonly logger = new Logger(TelegramChannelService.name);

  isConfigured(): boolean {
    return Boolean(this.token() && this.channelId() && this.enabled());
  }

  status(): { enabled: boolean; configured: boolean; channelId: string | null } {
    const channelId = this.channelId();
    return {
      enabled: this.enabled(),
      configured: Boolean(this.token() && channelId),
      channelId,
    };
  }

  /** Fire-and-forget safe: never throws to callers. */
  async postFreePick(input: TelegramPickPostInput): Promise<{ ok: boolean; error?: string }> {
    if (!input.isFree) {
      return { ok: false, error: 'skipped_paid' };
    }
    return this.sendMessage(this.formatFreePick(input));
  }

  async postWin(input: TelegramWinPostInput): Promise<{ ok: boolean; error?: string }> {
    return this.sendMessage(this.formatWin(input));
  }

  async sendTestMessage(customText?: string): Promise<{ ok: boolean; error?: string }> {
    const text =
      customText?.trim() ||
      `BetRollover Telegram channel test ✅\n${new Date().toISOString()}\n${this.siteOrigin()}`;
    return this.sendMessage(text);
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
    const url = this.couponUrl(input.couponId);

    const lines = [`${title} · free${odds ? ` · ${odds} odds` : ''}`];
    if (tipster) lines.push(`Tipster: ${tipster}`);
    if (code) {
      lines.push(bookie ? `${bookie} code: ${code}` : `Booking code: ${code}`);
    }
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
    const url = this.couponUrl(input.couponId);
    const priceBit = input.isFree ? 'free' : 'paid';
    const lines = [`Won ✅ · ${title}${odds ? ` · ${odds}` : ''} · ${priceBit}`];
    if (tipster) lines.push(`Tipster: ${tipster}`);
    lines.push('');
    lines.push(url);
    return lines.join('\n');
  }

  private couponUrl(couponId: number): string {
    const base = this.siteOrigin();
    return `${base}/coupons/${couponId}?utm_source=telegram&utm_medium=social&utm_campaign=channel_auto`;
  }

  private siteOrigin(): string {
    const raw = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://betrollover.com').trim();
    return raw.replace(/\/$/, '') || 'https://betrollover.com';
  }

  private enabled(): boolean {
    const v = (process.env.TELEGRAM_CHANNEL_POSTS_ENABLED || 'true').trim().toLowerCase();
    return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
  }

  private token(): string | null {
    const t = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    return t || null;
  }

  private channelId(): string | null {
    const explicit = (process.env.TELEGRAM_CHANNEL_ID || '').trim();
    if (explicit) return explicit;
    const handle = (process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE || 'betrollovertips').trim().replace(/^@/, '');
    return handle ? `@${handle}` : null;
  }
}
