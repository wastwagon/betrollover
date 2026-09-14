import { bookmakerLabelForKey } from '@betrollover/shared-types';

export type VipSlipLeg = {
  matchDescription?: string | null;
  prediction?: string | null;
  odds?: number | null;
  matchDate?: string | Date | null;
  result?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
};

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
  const lines = [`BETROLLOVER VIP · ${input.title.trim() || 'Two-Fold'}`];
  if (odds) lines.push(`Combined ${odds}`);
  for (const leg of input.legs || []) {
    const match = (leg.matchDescription || '').trim();
    const pred = (leg.prediction || '').trim();
    const lo =
      leg.odds != null && Number.isFinite(Number(leg.odds)) ? ` @ ${Number(leg.odds).toFixed(2)}` : '';
    if (match || pred) lines.push(`• ${match}${match && pred ? ' — ' : ''}${pred}${lo}`);
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
  const lines = [`VIP won ✅ · ${input.title.trim() || 'Two-Fold'}${odds ? ` · ${odds}` : ''}`];
  for (const leg of input.legs || []) {
    const match = (leg.matchDescription || '').trim();
    const pred = (leg.prediction || '').trim();
    const mark = (leg.result || 'won').toUpperCase();
    const score =
      leg.homeScore != null && leg.awayScore != null ? ` FT ${leg.homeScore}-${leg.awayScore}` : '';
    if (match || pred) lines.push(`• ${match}${match && pred ? ' — ' : ''}${pred} · ${mark}${score}`);
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
