import { LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING } from '@betrollover/shared-types';
import { PUBLIC_CHANNEL_SURE_USERNAME } from '../../config/rollover-desk.config';

/**
 * BetRollover Telegram voice — one job per post type.
 *
 * Monthly cadence (Africa/Accra) — scheduled promo posts, day 1 only:
 *  08:00  Growth        → VIP join / purchase protection (rotates)
 *  12:00  Advice        → bankroll, ROI, or withdraw (rotates)
 *  17:00  Community     → react meanings + share channel (exact ask)
 *
 * Off by default: 10:00 tipster recruit, 19:00 second growth post.
 * Tip and win alerts stay event-driven (Acca Sure on the free channel).
 * VIP Two-Fold slips stay event-/desk-driven in BETROLLOVER VIP (not throttled here).
 *
 * Tip & win alerts (event-driven): product first + short engagement footer.
 * Reaction legend lives ONLY on the community appeal (not every tip).
 *
 * Placeholders: {channel} = public tips channel · {contact} = private DM (@wastwagon)
 *               {site} = web origin · {register} = register URL
 */

const LEGAL_LINE = '18+ · Information only · Not a bookmaker';

/** Short footer on tip/win alerts — no reaction legend (that is the 17:00 post). */
export const TELEGRAM_ENGAGEMENT_FOOTERS = [
  `🔥 React · ↗️ Forward to a friend\n👉 {channel}`,
  `Support free tips: react · forward\n👉 {channel}`,
  `👍 Useful? React · ↗️ Share the channel\n👉 {channel}`,
  `We grow when you forward\n👉 {channel}`,
  `React if you’re on it · invite one friend\n👉 {channel}`,
] as const;

/** Monthly discovery — VIP join, free tips, purchase protection. */
export const TELEGRAM_GROWTH_POSTS = [
  `📌 Rollover VIP

Don't buy fake "fixed" tickets on Telegram — there are no real fixed matches.
You lose twice: the ticket fee and your stake.

Join Rollover VIP. We post one max-bet slip a day.
Message @{contact} to join

${LEGAL_LINE}`,

  `📌 Discover · Free tips + VIP

Free Acca picks stay on this channel.
Want the daily VIP max-bet slip? Message @{contact}.

👉 {channel}
{site}?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth

${LEGAL_LINE}`,

  `📌 Discover · Purchase-protected tips

Paid pick loses → tip price returns to your BetRollover wallet.
Free tips stay free here. VIP slips: message @{contact}.

↗️ Forward · 👉 Join: {channel}

{site}?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth

${LEGAL_LINE}`,
] as const;

/**
 * Tipster recruit (off unless enabled) — register on the website; invite tipster friends.
 * Earning comes from publishing paid picks (not from sharing the link).
 */
export const TELEGRAM_TIPSTER_RECRUIT_POST = `💼 Tipsters · Join BetRollover & earn

Know someone who posts solid football tips? Or ready to tip yourself?

On BetRollover tipsters:
• Create a free account
• Publish free picks to build a public record
• Create paid picks when they meet the ROI / win-rate bar
• Earn when those paid picks win (buyers have purchase protection)

Register here:
👉 {register}

Share this link with tipster friends so they can register too — then they earn by creating paid picks on the marketplace (not by sharing the link).

Buyers can use the same link to register and follow tipsters.
Free tips stay on this channel: {channel}

${LEGAL_LINE}`;

/**
 * Monthly community appeal — exact subscriber ask (react meanings + share join link).
 * Sent on day 1; do not append engagement footer (message is complete).
 */
export const TELEGRAM_COMMUNITY_APPEAL_POST = `👋 Community · Quick ask from the BetRollover team

These tips are completely free. We don’t charge for this channel — we only ask for one small thing.

A quiet channel feels empty. When you react on a tip, it shows you’re here with us and keeps the community warm.

Please react on the coupons using:

🔥 — I’m on it
👍 — solid pick
❤️ — support the free tips
👏 — well done / W

And please share our Telegram with a friend who loves football tips:

👉 Join here: {channel}

It costs nothing, takes a second, and means a lot. Thank you for supporting free tips 🙏`;

/**
 * Monthly strategy / bankroll advice — education only.
 * Soft channel CTA; no react legend (community post owns that).
 */
export const TELEGRAM_ADVICE_POSTS = [
  `💡 Advice · Staying in profit starts with bankroll rules

• Only stake money you can afford to lose
• Never use school fees, rent, or housekeeping money
• Small % of bank per day — never chase a loss
• Track results — emotion fades, numbers don’t
• When ahead at the bookie: withdraw some profit — don’t leave it all as “play balance”

BetRollover: tipster ROI + purchase protection on paid picks (tip price refunded if it loses).

Learn more: {site}/learn?utm_source=telegram&utm_campaign=channel_advice
Channel: {channel}

${LEGAL_LINE}`,

  `💡 Advice · How tipsters stay relevant (and you stay solvent)

• Win rate without ROI can still lose money
• Sample size matters — ignore 2-pick “gods”
• BetRollover leaderboard needs settled volume for a reason
• Real life first: school fees, rent, housekeeping stay untouched

Stay patient. Stay selective. Stay in profit.

{site}/leaderboard?utm_source=telegram&utm_campaign=channel_advice
Channel: {channel}

${LEGAL_LINE}`,

  `💡 Advice · Withdraw from the bookie & keep your profit

Winning on SportyBet / Betway / etc. is only half — locking cash is the other half.

1. When you’re ahead, withdraw a portion from the bookmaker to your MoMo / bank
2. Don’t leave full winnings as “available balance” to chase the next Acca
3. Move withdrawn cash to life first — school fees, rent, housekeeping
4. Only keep a small stake bankroll in the bookie app
5. BetRollover tips are research — bookie withdrawal is how you stay in profit in real life

Rule: bookie balance is not savings. Withdraw. Protect. Then tip selectively.

{site}/responsible-gambling?utm_source=telegram&utm_campaign=channel_advice
Channel: {channel}

${LEGAL_LINE}`,
] as const;

/**
 * Channel About / description — Telegram “SEO” is mostly title + @username + this text.
 * Bot can sync via setChatDescription when admin.
 */
export function telegramChannelSeoDescription(): string {
  return applyTelegramCopyVars(
    'Football tips & Rollover VIP | Free Acca picks daily | One VIP max-bet slip a day — message @{contact} | Refund if paid pick loses | 18+ education only',
    '',
  );
}

/** @deprecated Prefer telegramChannelSeoDescription() so @{contact} stays correct. */
export const TELEGRAM_CHANNEL_SEO_DESCRIPTION = telegramChannelSeoDescription();

/**
 * Public channel @handle (no @) — join link / channel posts.
 * Defaults to betrollovertips. Override with NEXT_PUBLIC_TELEGRAM_ADS_HANDLE.
 */
export function telegramAdsHandle(): string {
  const fromAds = (process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE || '').trim().replace(/^@/, '');
  if (fromAds && !/^-?\d+$/.test(fromAds)) return fromAds;
  const channelId = (process.env.TELEGRAM_CHANNEL_ID || '').trim().replace(/^@/, '');
  // Channel IDs are often numeric (-100…); only treat @username forms as a public handle.
  if (channelId && !/^-?\d+$/.test(channelId)) return channelId;
  return 'betrollovertips';
}

/**
 * Private DM @handle (no @) for VIP join / support.
 * Defaults to wastwagon. Override with TELEGRAM_CONTACT_HANDLE.
 * Kept separate from the public channel so people message you directly.
 */
export function telegramContactHandle(): string {
  const fromEnv = (process.env.TELEGRAM_CONTACT_HANDLE || '').trim().replace(/^@/, '');
  if (fromEnv && !/^-?\d+$/.test(fromEnv)) return fromEnv;
  return 'wastwagon';
}

/** Public join URL for the tips channel (defaults to @betrollovertips). */
export function telegramChannelJoinUrl(): string {
  return `https://t.me/${telegramAdsHandle()}`;
}

export function telegramRegisterUrl(siteOrigin: string): string {
  const site = siteOrigin.replace(/\/$/, '') || 'https://betrollover.com';
  return `${site}/register?utm_source=telegram&utm_medium=social&utm_campaign=channel_tipster_recruit`;
}

export function pickRotatingLine(lines: readonly string[], salt: number | string): string {
  if (!lines.length) return '';
  const n = typeof salt === 'number' ? salt : hashString(salt);
  return lines[Math.abs(n) % lines.length]!;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function applyTelegramCopyVars(template: string, siteOrigin: string): string {
  const site = siteOrigin.replace(/\/$/, '') || 'https://betrollover.com';
  return template
    .replace(/\{site\}/g, site)
    .replace(/\{channel\}/g, telegramChannelJoinUrl())
    .replace(/\{contact\}/g, telegramContactHandle())
    .replace(/\{register\}/g, telegramRegisterUrl(site));
}

/** Free-channel teaser when VIP posts a slip — no legs / codes (members-only). */
export function formatVipPublicSlipTeaser(input: {
  siteOrigin: string;
  totalOdds?: number | null;
}): string {
  const odds =
    input.totalOdds != null && Number.isFinite(Number(input.totalOdds))
      ? Number(input.totalOdds).toFixed(2)
      : '';
  const site = input.siteOrigin.replace(/\/$/, '') || 'https://betrollover.com';
  return applyTelegramCopyVars(
    [
      `VIP · Two-Fold · new max-bet slip${odds ? ` · ${odds}` : ''}`,
      '',
      'Full slip is in BETROLLOVER VIP (members only).',
      'Want in? Message @{contact}',
      '👉 {channel}',
      '',
      `Board: ${site}/rollover?utm_source=telegram&utm_medium=social&utm_campaign=channel_vip`,
      '',
      LEGAL_LINE,
    ].join('\n'),
    site,
  );
}

/** Free-channel win alert for VIP — settled legs OK; CTA to message contact. */
export function formatVipPublicWinPost(input: {
  siteOrigin: string;
  title: string;
  totalOdds?: number | null;
  legs?: { matchDescription?: string | null; prediction?: string | null; result?: string | null; homeScore?: number | null; awayScore?: number | null }[];
}): string {
  const odds =
    input.totalOdds != null && Number.isFinite(Number(input.totalOdds))
      ? Number(input.totalOdds).toFixed(2)
      : '';
  const lines = [
    `VIP won ✅ · ${(input.title || 'Two-Fold').trim()}${odds ? ` · ${odds}` : ''}`,
  ];
  for (const leg of input.legs || []) {
    const match = (leg.matchDescription || '').trim();
    const pred = (leg.prediction || '').trim();
    const mark = (leg.result || 'won').toUpperCase();
    const score =
      leg.homeScore != null && leg.awayScore != null ? ` FT ${leg.homeScore}-${leg.awayScore}` : '';
    if (match || pred) lines.push(`• ${match}${match && pred ? ' — ' : ''}${pred} · ${mark}${score}`);
  }
  lines.push('');
  lines.push('Join Rollover VIP — message @{contact}');
  lines.push('👉 {channel}');
  lines.push('');
  lines.push(LEGAL_LINE);
  return applyTelegramCopyVars(lines.join('\n'), input.siteOrigin);
}

export function appendEngagementFooter(body: string, salt: number | string): string {
  const footer = applyTelegramCopyVars(pickRotatingLine(TELEGRAM_ENGAGEMENT_FOOTERS, salt), '');
  const trimmed = body.trimEnd();
  return `${trimmed}\n\n${footer}`;
}

export function formatGrowthPost(siteOrigin: string, salt: number | string): string {
  return applyTelegramCopyVars(pickRotatingLine(TELEGRAM_GROWTH_POSTS, salt), siteOrigin);
}

export function formatCommunityAppealPost(): string {
  return applyTelegramCopyVars(TELEGRAM_COMMUNITY_APPEAL_POST, '');
}

export function formatTipsterRecruitPost(siteOrigin: string): string {
  return applyTelegramCopyVars(TELEGRAM_TIPSTER_RECRUIT_POST, siteOrigin);
}

export function formatAdvicePost(siteOrigin: string, salt: number | string): string {
  return applyTelegramCopyVars(pickRotatingLine(TELEGRAM_ADVICE_POSTS, salt), siteOrigin);
}

export function telegramAlwaysAllowUsernames(): string[] {
  const extra = (process.env.TELEGRAM_TIPSTER_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set<string>([PUBLIC_CHANNEL_SURE_USERNAME, ...extra]);
  return [...set];
}

export function telegramMinSettled(): number {
  const n = parseInt(process.env.TELEGRAM_MIN_SETTLED || '', 10);
  return Number.isFinite(n) && n >= 0 ? n : LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING;
}

export function telegramMinWinRate(fallback: number): number {
  const n = parseFloat(process.env.TELEGRAM_MIN_WIN_RATE || '');
  return Number.isFinite(n) ? n : fallback;
}

export function telegramMinRoi(_fallback?: number): number {
  const n = parseFloat(process.env.TELEGRAM_MIN_ROI || '');
  // Default 0 — paid-pick ROI (often 20%) is too strict for channel alerts; settled + WR gate quality.
  if (Number.isFinite(n)) return n;
  return 0;
}
