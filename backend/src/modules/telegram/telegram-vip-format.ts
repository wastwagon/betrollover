import { bookmakerLabelForKey } from '@betrollover/shared-types';
import {
  formatTelegramLegLine,
  telegramHeadlineWhenLegsListed,
  telegramLegsHaveCopy,
  type TelegramSlipLeg,
} from './telegram-slip';

export type VipSlipLeg = TelegramSlipLeg;

export function formatVipCouponPost(input: {
  title: string;
  totalOdds?: number | null;
  legs?: VipSlipLeg[];
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  couponUrl: string;
}): string {
  const odds =
    input.totalOdds != null && Number.isFinite(Number(input.totalOdds))
      ? Number(input.totalOdds).toFixed(2)
      : '';
  const hasLegs = telegramLegsHaveCopy(input.legs);
  const label = hasLegs
    ? telegramHeadlineWhenLegsListed(input.title, 'Two-Fold')
    : input.title.trim() || 'Two-Fold';
  const lines = [`BETROLLOVER VIP · ${label}`];
  if (odds) lines.push(`Combined ${odds}`);
  for (const leg of input.legs || []) {
    const line = formatTelegramLegLine(leg, 'open');
    if (line) lines.push(line);
  }
  const code = (input.bookingCode || '').trim();
  if (code) {
    const bookieKey = (input.bookmakerKey || '').trim();
    const bookie = bookieKey ? bookmakerLabelForKey(bookieKey) || bookieKey : '';
    lines.push(bookie ? `${bookie}: ${code}` : `Code: ${code}`);
  }
  lines.push('');
  lines.push(input.couponUrl);
  lines.push('Members only · 18+ · Not a bookmaker');
  return lines.join('\n');
}

export function formatVipWinPost(input: {
  title: string;
  totalOdds?: number | null;
  couponUrl: string;
  legs?: VipSlipLeg[];
}): string {
  const odds =
    input.totalOdds != null && Number.isFinite(Number(input.totalOdds))
      ? Number(input.totalOdds).toFixed(2)
      : '';
  const hasLegs = telegramLegsHaveCopy(input.legs);
  const label = hasLegs
    ? telegramHeadlineWhenLegsListed(input.title, 'Two-Fold')
    : input.title.trim() || 'Two-Fold';
  const lines = [`VIP won ✅ · ${label}${odds ? ` · ${odds}` : ''}`];
  for (const leg of input.legs || []) {
    const line = formatTelegramLegLine(leg, 'settled');
    if (line) lines.push(line);
  }
  lines.push(input.couponUrl);
  return lines.join('\n');
}

export function vipBotStartUrl(botUsername: string | null | undefined, linkToken: string): string | null {
  const u = (botUsername || '').replace(/^@/, '').trim();
  if (!u || !linkToken) return null;
  return `https://t.me/${u}?start=${encodeURIComponent(`v${linkToken}`)}`;
}

export function parseVipStartPayload(text: string | null | undefined): string | null {
  const raw = (text || '').trim();
  const m = raw.match(/^\/start(?:@\w+)?(?:\s+v([A-Za-z0-9_-]{8,64}))?$/i);
  if (!m) return null;
  return m[1] || null;
}
