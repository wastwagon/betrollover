import { Injectable, Logger } from '@nestjs/common';
import { bookmakerLabelForKey } from '@betrollover/shared-types';

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

  /**
   * Free pick (optional booking code) or paid teaser (never includes booking code).
   * Fire-and-forget safe: never throws to callers.
   */
  async postNewPick(input: TelegramPickPostInput): Promise<{ ok: boolean; error?: string }> {
    const text = input.isFree ? this.formatFreePick(input) : this.formatPaidPick(input);
    return this.sendMessage(text);
  }

  /** @deprecated use postNewPick — kept for callers/tests that only post free. */
  async postFreePick(input: TelegramPickPostInput): Promise<{ ok: boolean; error?: string }> {
    if (!input.isFree) {
      return { ok: false, error: 'skipped_paid' };
    }
    return this.postNewPick(input);
  }

  async postWin(input: TelegramWinPostInput): Promise<{ ok: boolean; error?: string }> {
    return this.sendMessage(this.formatWin(input));
  }

  /** One message after Acca Desk batch publish — avoids N channel posts per desk day. */
  async postAccaDeskDigest(input: {
    deskDay: string;
    publishedCount: number;
  }): Promise<{ ok: boolean; error?: string }> {
    if (!(input.publishedCount > 0)) {
      return { ok: false, error: 'skipped_empty' };
    }
    const day = (input.deskDay || '').trim() || 'today';
    const n = input.publishedCount;
    const base = this.siteOrigin();
    const url = `${base}/marketplace?utm_source=telegram&utm_medium=social&utm_campaign=channel_acca_digest`;
    const text = [
      `Acca Desk · ${day}`,
      `${n} new free 2-fold${n === 1 ? '' : 's'} just published.`,
      'Open BetRollover marketplace to view & share.',
      '',
      url,
    ].join('\n');
    return this.sendMessage(text);
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
    const url = this.couponUrl(input.couponId, 'free');

    const lines = [`${title} · free${odds ? ` · ${odds} odds` : ''}`];
    if (tipster) lines.push(`Tipster: ${tipster}`);
    if (code) {
      lines.push(bookie ? `${bookie} code: ${code}` : `Booking code: ${code}`);
    }
    lines.push('');
    lines.push(url);
    return lines.join('\n');
  }

  /** Paid alert — teaser only; unlock on BetRollover (escrow if it loses). */
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
    lines.push('Unlock on BetRollover — escrow refunds the pick price if it loses.');
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

  private token(): string | null {
    const t = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    return t || null;
  }

  private channelId(): string | null {
    const explicit = (process.env.TELEGRAM_CHANNEL_ID || '').trim();
    if (explicit) return explicit;
    const handle = (process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE || '')
      .trim()
      .replace(/^@/, '');
    if (handle) return `@${handle}`;
    return '@betrollovertips';
  }
}
