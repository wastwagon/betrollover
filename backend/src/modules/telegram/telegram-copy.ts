import { LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING } from '@betrollover/shared-types';
import { ROLLOVER_OWNER_USERNAME } from '../../config/rollover-desk.config';

/**
 * BetRollover Telegram voice — one job per post type.
 *
 * Daily cadence (Africa/Accra):
 *  08:00  Growth        → discover free tips + join channel
 *  10:00  Tipster recruit → register on site; invite tipster friends (earn via paid picks)
 *  12:00  Advice        → bankroll / stay-in-profit education
 *  17:00  Community     → react meanings + share channel (exact ask)
 *  19:00  Growth        → escrow trust + join channel / open site
 *
 * Tip & win alerts (event-driven): product first + short engagement footer.
 * Reaction legend lives ONLY on the community appeal (not every tip).
 *
 * Placeholders: {channel} = t.me join · {site} = web origin · {register} = register URL
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

/** 2×/day discovery — free tips + Telegram join. No tipster-earn CTA (separate post). */
export const TELEGRAM_GROWTH_POSTS = [
  `📌 Discover · Free football tips daily

BetRollover Acca Desk + top tipsters — settled results, not noise.

Follow this channel so you never miss today’s free picks.
↗️ Forward to a friend who follows tips
👉 Join: {channel}

Open the board: {site}?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth

${LEGAL_LINE}`,

  `📌 Discover · Tipster marketplace

Free Acca picks · paid picks with escrow (tip price refunded if it loses).

Stay subscribed · share the channel with a friend
👉 {channel}

{site}/marketplace?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth

${LEGAL_LINE}`,

  `📌 Discover · Escrow-protected tips

Paid pick loses → tip price returns to your BetRollover wallet.
Free tips stay free on this channel.

↗️ Forward · 👉 Join: {channel}

{site}?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth

${LEGAL_LINE}`,

  `📌 Discover · AccaSure & top tipsters

Real settlement on BetRollover. Free Sure 1X2 doubles + marketplace analysis.

👉 Channel: {channel}
App: {site}?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth

${LEGAL_LINE}`,
] as const;

/**
 * Daily tipster recruit — register on the website; invite tipster friends to join.
 * Earning comes from publishing paid picks (not from sharing the link).
 */
export const TELEGRAM_TIPSTER_RECRUIT_POST = `💼 Tipsters · Join BetRollover & earn

Know someone who posts solid football tips? Or ready to tip yourself?

On BetRollover tipsters:
• Create a free account
• Publish free picks to build a public record
• Create paid picks when they meet the ROI / win-rate bar
• Earn when those paid picks win (buyers protected by escrow)

Register here:
👉 {register}

Share this link with tipster friends so they can register too — then they earn by creating paid picks on the marketplace (not by sharing the link).

Buyers can use the same link to register and follow tipsters.
Free tips stay on this channel: {channel}

${LEGAL_LINE}`;

/**
 * Daily community appeal — exact subscriber ask (react meanings + share join link).
 * Sent once/day; do not append engagement footer (message is complete).
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
 * Daily strategy / bankroll advice — education only.
 * Soft channel CTA; no react legend (community post owns that).
 */
export const TELEGRAM_ADVICE_POSTS = [
  `💡 Advice · Staying in profit starts with bankroll rules

• Only stake money you can afford to lose
• Never use school fees, rent, or housekeeping money
• Small % of bank per day — never chase a loss
• Track results — emotion fades, numbers don’t
• When ahead at the bookie: withdraw some profit — don’t leave it all as “play balance”

BetRollover: tipster ROI + escrow on paid picks (tip price refunded if it loses).

Learn more: {site}/learn?utm_source=telegram&utm_campaign=channel_advice
Channel: {channel}

${LEGAL_LINE}`,

  `💡 Advice · Profit > “sure things”

Long-term edge comes from:
• Selective picks (not every match)
• Flat or % staking
• Walking away when you’re tilted
• Protecting school fees, rent & housekeeping — those are not a bankroll

Follow AccaSure & top tipsters on BetRollover — settle real results, don’t guess.

{site}?utm_source=telegram&utm_campaign=channel_advice
Channel: {channel}

${LEGAL_LINE}`,

  `💡 Advice · Stay-in-profit mindset

1. Cap daily spend before kick-off
2. Prefer fewer, higher-conviction picks
3. Treat tips as research — your stake is your call
4. Never touch school fees, rent, or housekeeping money for bets
5. On BetRollover, paid pick loss → escrow refunds the tip price (not your bookmaker stake)

Discipline beats hot streaks.

{site}/responsible-gambling?utm_source=telegram&utm_campaign=channel_advice
Channel: {channel}

${LEGAL_LINE}`,

  `💡 Advice · Bankroll tip of the day

Chasing “one big Acca” to recover losses is how bankrolls die — and how rent money disappears.

Better: small units, clear stop-loss for the day, review tomorrow.
If it’s school fees, rent, or housekeeping — it is not stake money.

Free Acca Desk + escrow-protected marketplace help you learn with structure.

{site}/marketplace?utm_source=telegram&utm_campaign=channel_advice
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
export const TELEGRAM_CHANNEL_SEO_DESCRIPTION =
  'Football tips & tipster marketplace | Free Acca Desk picks daily | Escrow refund if paid pick loses | Join BetRollover.com — 18+ education only';

/** Public join URL for the tips channel (defaults to @betrollovertips). */
export function telegramChannelJoinUrl(): string {
  const fromAds = (process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE || '').trim().replace(/^@/, '');
  if (fromAds) return `https://t.me/${fromAds}`;
  const channelId = (process.env.TELEGRAM_CHANNEL_ID || '').trim();
  if (channelId.startsWith('@')) return `https://t.me/${channelId.slice(1)}`;
  return 'https://t.me/betrollovertips';
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
    .replace(/\{register\}/g, telegramRegisterUrl(site));
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
  const set = new Set<string>([ROLLOVER_OWNER_USERNAME, ...extra]);
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
