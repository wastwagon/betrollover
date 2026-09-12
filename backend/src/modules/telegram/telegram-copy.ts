import { LEADERBOARD_MIN_SETTLED_FOR_PRIMARY_RANKING } from '@betrollover/shared-types';
import { ROLLOVER_OWNER_USERNAME } from '../../config/rollover-desk.config';

/** Soft CTAs — rotate so posts don’t look copy-paste. Telegram rewards reactions + forwards. */
export const TELEGRAM_ENGAGEMENT_FOOTERS = [
  '🔥 React if you’re on this · ↗️ Forward to one friend · We grow together',
  '❤️ React · ↗️ Share with a friend who follows tips · Win together',
  '👍 React if useful · ↗️ Forward this channel · Help others find us',
  '🔥 Drop a reaction · ↗️ Share the pick · Join us on BetRollover',
  '✨ React & forward · Invite a friend · We win together',
] as const;

/** Standalone growth posts — 2×/day. Keep short; keyword-rich for Telegram search snippets. */
export const TELEGRAM_GROWTH_POSTS = [
  `Ghana football tips & free Acca picks daily 🇬🇭

BetRollover — tipster marketplace with escrow: paid pick loses → pick price refunded to wallet.

🔥 React if you want today’s tips
↗️ Forward this channel to a friend
👉 Join: {site}/register?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth

18+ · Information only · Not a bookmaker`,

  `Looking for football tips Ghana / Accra?

Free Acca Desk · verified tipsters · escrow-protected paid picks on BetRollover.

❤️ React · ↗️ Share this channel · Grow with us
{site}/invite?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth

We win together — help a friend join.`,

  `Free tips today + escrow if a paid pick loses.

Open BetRollover for AccaSure & top tipsters.
🔥 React · ↗️ Forward · Subscribe so you don’t miss wins

{site}?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth

18+ · Educational tips only`,

  `Tipster marketplace for Ghana 🇬🇭

• Free Acca picks
• Paid picks with refund-on-loss escrow
• Real settlement on BetRollover

React 🔥 · Forward ↗️ · Invite a friend
{site}/register?utm_source=telegram&utm_medium=social&utm_campaign=channel_growth`,
] as const;

/**
 * Daily strategy / bankroll advice — education only.
 * Staying in profit = discipline, not chasing; never risk essentials (fees/rent/housekeeping).
 * BetRollover escrow ≠ bookmaker payout.
 */
export const TELEGRAM_ADVICE_POSTS = [
  `💡 Daily tip: staying in profit starts with bankroll rules

• Only stake money you can afford to lose
• Never use school fees, rent, or housekeeping money
• Small % of bank per day — never chase a loss
• Track results — emotion fades, numbers don’t
• When ahead at the bookie: withdraw some profit — don’t leave it all as “play balance”

BetRollover: tipster ROI + escrow on paid picks (tip price refunded if it loses). Education, not a bookmaker.

🔥 React if this helps · ↗️ Forward to a friend
{site}/learn?utm_source=telegram&utm_campaign=channel_advice
18+`,

  `📊 Strategy: profit > “sure things”

Long-term edge comes from:
• Selective picks (not every match)
• Flat or % staking
• Walking away when you’re tilted
• Protecting school fees, rent & housekeeping — those are not a bankroll

Follow AccaSure & top tipsters on BetRollover — settle real results, don’t guess.

❤️ React · Share with someone who overbets
{site}?utm_source=telegram&utm_campaign=channel_advice
18+ · Information only`,

  `🛡️ Stay in profit mindset

1. Cap daily spend before kick-off
2. Prefer fewer, higher-conviction picks
3. Treat tips as research — your stake is your call
4. Never touch school fees, rent, or housekeeping money for bets
5. On BetRollover, paid pick loss → escrow refunds the tip price (not your bookmaker stake)

Discipline beats hot streaks.

🔥 React · ↗️ Forward this channel
{site}/responsible-gambling?utm_source=telegram&utm_campaign=channel_advice
18+`,

  `🎯 Bankroll tip of the day

Chasing “one big Acca” to recover losses is how bankrolls die — and how rent money disappears.

Better: small units, clear stop-loss for the day, review tomorrow.
If it’s school fees, rent, or housekeeping — it is not stake money.

Free Acca Desk + escrow-protected marketplace on BetRollover help you learn with structure.

✨ React if you’re building discipline · Invite a friend
{site}/marketplace?utm_source=telegram&utm_campaign=channel_advice
18+`,

  `📈 How tipsters stay relevant (and you stay solvent)

• Win rate without ROI can still lose money
• Sample size matters — ignore 2-pick “gods”
• BetRollover leaderboard needs settled volume for a reason
• Real life first: school fees, rent, housekeeping stay untouched

Stay patient. Stay selective. Stay in profit.

🔥 React · ↗️ Share
{site}/leaderboard?utm_source=telegram&utm_campaign=channel_advice
18+`,

  `💸 How to withdraw from the bookie & keep your profit

Winning on SportyBet / Betway / etc. is only half — locking cash is the other half.

1. When you’re ahead, withdraw a portion from the bookmaker to your MoMo / bank
2. Don’t leave full winnings as “available balance” to chase the next Acca
3. Move withdrawn cash to life first — school fees, rent, housekeeping
4. Only keep a small stake bankroll in the bookie app
5. BetRollover tips are research — your bookie withdrawal is how you stay in profit in real life

Rule: bookie balance is not savings. Withdraw. Protect. Then tip selectively.

🔥 React if you withdraw wins · ↗️ Forward to a friend
{site}/responsible-gambling?utm_source=telegram&utm_campaign=channel_advice
18+`,
] as const;

/**
 * Channel About / description — Telegram “SEO” is mostly title + @username + this text.
 * Bot can sync via setChatDescription when admin.
 */
export const TELEGRAM_CHANNEL_SEO_DESCRIPTION =
  'Ghana football tips & tipster marketplace | Free Acca Desk picks daily | Escrow refund if paid pick loses | SportyBet-ready tips | Join BetRollover.com — 18+ education only';

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

export function appendEngagementFooter(body: string, salt: number | string): string {
  const footer = pickRotatingLine(TELEGRAM_ENGAGEMENT_FOOTERS, salt);
  const trimmed = body.trimEnd();
  return `${trimmed}\n\n${footer}`;
}

export function formatGrowthPost(siteOrigin: string, salt: number | string): string {
  const site = siteOrigin.replace(/\/$/, '') || 'https://betrollover.com';
  const template = pickRotatingLine(TELEGRAM_GROWTH_POSTS, salt);
  return template.replace(/\{site\}/g, site);
}

export function formatAdvicePost(siteOrigin: string, salt: number | string): string {
  const site = siteOrigin.replace(/\/$/, '') || 'https://betrollover.com';
  const template = pickRotatingLine(TELEGRAM_ADVICE_POSTS, salt);
  return template.replace(/\{site\}/g, site);
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
