import * as sharp from 'sharp';
import { bookmakerLabelForKey, formatFootballOutcomeLabel } from '@betrollover/shared-types';

export type TelegramCouponCardLeg = {
  matchDescription?: string | null;
  prediction?: string | null;
  odds?: number | null;
  matchDate?: string | Date | null;
  result?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
};

export type TelegramCouponCardInput = {
  title: string;
  tipsterName?: string | null;
  totalOdds?: number | null;
  totalPicks?: number;
  /** vip = private desk; free = public channel; paid = teaser without legs */
  channel: 'vip' | 'free' | 'paid';
  variant: 'live' | 'won';
  legs?: TelegramCouponCardLeg[];
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  priceGhs?: number | null;
};

const W = 720;
const PRIMARY = '#10b981';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const BG = '#ffffff';
const WON_BG = '#d1fae5';
const WON_FG = '#047857';
const LOST_BG = '#fee2e2';
const LOST_FG = '#b91c1c';

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clip(raw: string, max: number): string {
  const t = raw.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function fmtOdds(n: number | null | undefined): string {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : '—';
}

function kickoffLabel(raw: string | Date | null | undefined): string {
  if (!raw) return '';
  const d = raw instanceof Date ? raw : new Date(raw);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Accra',
  });
}

function resultChip(result?: string | null): { bg: string; fg: string; label: string } | null {
  const r = (result || '').toLowerCase();
  if (r === 'won') return { bg: WON_BG, fg: WON_FG, label: 'WON' };
  if (r === 'lost') return { bg: LOST_BG, fg: LOST_FG, label: 'LOST' };
  if (r === 'void') return { bg: LINE, fg: MUTED, label: 'VOID' };
  return null;
}

export function buildCouponCardSvg(input: TelegramCouponCardInput): string {
  const won = input.variant === 'won';
  const showLegs = won || input.channel !== 'paid';
  const legs = showLegs ? (input.legs || []).slice(0, 8) : [];
  const headerH = 72;
  const titleH = 56;
  const legH = 78;
  const footerH = 52;
  const pad = 24;
  const H = headerH + titleH + (showLegs ? Math.max(legs.length, 1) * legH : 64) + footerH + pad;

  const badge = won ? 'WON' : input.channel === 'vip' ? 'VIP' : input.channel === 'paid' ? 'PAID' : 'FREE';
  const badgeBg = won ? WON_FG : PRIMARY;
  const tipster = clip(input.tipsterName || (input.channel === 'vip' ? 'VIP · Two-Fold' : 'BetRollover'), 28);
  const title = clip(input.title || 'Pick', 56);
  const picks = input.totalPicks || legs.length || 2;
  const combined = fmtOdds(input.totalOdds);
  const code = input.channel === 'paid' ? '' : (input.bookingCode || '').trim();
  const bookieKey = (input.bookmakerKey || '').trim();
  const bookie = bookieKey ? bookmakerLabelForKey(bookieKey) || bookieKey : '';

  const legBlocks = showLegs
    ? legs
        .map((leg, i) => {
          const y = headerH + titleH + i * legH;
          const match = clip(leg.matchDescription || 'Match', 42);
          const pred = clip(formatFootballOutcomeLabel(leg.prediction || '') || 'Pick', 28);
          const chip = won ? resultChip(leg.result) || { bg: WON_BG, fg: WON_FG, label: 'WON' } : resultChip(leg.result);
          const score =
            leg.homeScore != null && leg.awayScore != null ? `FT ${leg.homeScore}-${leg.awayScore}` : '';
          const when = kickoffLabel(leg.matchDate);
          const chipXml = chip
            ? `<rect x="612" y="${y + 18}" width="72" height="22" rx="6" fill="${chip.bg}"/>
               <text x="648" y="${y + 34}" text-anchor="middle" font-size="11" font-weight="700" fill="${chip.fg}" font-family="Arial, Helvetica, sans-serif">${chip.label}</text>`
            : '';
          return `<g>
  <rect x="24" y="${y + 8}" width="672" height="${legH - 12}" rx="12" fill="#f8fafc" stroke="${LINE}"/>
  <text x="40" y="${y + 32}" font-size="15" font-weight="700" fill="${INK}" font-family="Arial, Helvetica, sans-serif">${esc(match)}</text>
  <text x="40" y="${y + 54}" font-size="13" fill="${MUTED}" font-family="Arial, Helvetica, sans-serif">${esc(pred)}  ·  @ ${fmtOdds(leg.odds)}${score ? `  ·  ${esc(score)}` : when ? `  ·  ${esc(when)}` : ''}</text>
  ${chipXml}
</g>`;
        })
        .join('\n')
    : `<rect x="24" y="${headerH + titleH + 8}" width="672" height="48" rx="12" fill="#ecfdf5" stroke="${PRIMARY}"/>
       <text x="360" y="${headerH + titleH + 38}" text-anchor="middle" font-size="15" font-weight="700" fill="${PRIMARY}" font-family="Arial, Helvetica, sans-serif">Unlock this pick on BetRollover</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="28" fill="${BG}"/>
  <rect x="0" y="0" width="${W}" height="${headerH}" rx="28" fill="${won ? WON_BG : '#ecfdf5'}"/>
  <rect x="0" y="44" width="${W}" height="28" fill="${won ? WON_BG : '#ecfdf5'}"/>
  <text x="28" y="44" font-size="20" font-weight="800" fill="${INK}" font-family="Arial, Helvetica, sans-serif">BetRollover</text>
  <rect x="600" y="20" width="92" height="28" rx="14" fill="${badgeBg}"/>
  <text x="646" y="39" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff" font-family="Arial, Helvetica, sans-serif">${badge}</text>
  <text x="28" y="${headerH + 28}" font-size="13" fill="${MUTED}" font-family="Arial, Helvetica, sans-serif">${esc(tipster)}</text>
  <text x="28" y="${headerH + 50}" font-size="16" font-weight="700" fill="${INK}" font-family="Arial, Helvetica, sans-serif">${esc(title)}</text>
  <text x="692" y="${headerH + 50}" text-anchor="end" font-size="14" font-weight="700" fill="${PRIMARY}" font-family="Arial, Helvetica, sans-serif">${picks} picks · ${combined}</text>
  ${legBlocks}
  <text x="28" y="${H - 22}" font-size="12" fill="${MUTED}" font-family="Arial, Helvetica, sans-serif">${
    code ? esc(`${bookie ? `${bookie}: ` : ''}${code}  ·  `) : ''
  }18+ · Information only · Not a bookmaker</text>
</svg>`;
}

export async function renderCouponCardPng(input: TelegramCouponCardInput): Promise<Buffer> {
  const svg = buildCouponCardSvg(input);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function couponCardCaption(input: {
  headline: string;
  couponUrl: string;
  extraLines?: string[];
}): string {
  const lines = [input.headline, ...(input.extraLines || []), '', input.couponUrl, '18+ · Information only · Not a bookmaker'];
  return lines.join('\n').slice(0, 1024);
}
