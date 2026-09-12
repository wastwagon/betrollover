import {
  TELEGRAM_CHANNEL_SEO_DESCRIPTION,
  TELEGRAM_ENGAGEMENT_FOOTERS,
  appendEngagementFooter,
  formatAdvicePost,
  formatGrowthPost,
  pickRotatingLine,
  telegramAlwaysAllowUsernames,
} from './telegram-copy';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramEligibilityService } from './telegram-eligibility.service';
import { ROLLOVER_OWNER_USERNAME } from '../../config/rollover-desk.config';
import { ACCA_DESK_TIPSTER_TYPE } from '../../config/acca-desk-tipsters.config';

describe('telegram-copy', () => {
  it('appends engagement footer', () => {
    const out = appendEngagementFooter('Hello pick', 1);
    expect(out.startsWith('Hello pick')).toBe(true);
    expect(TELEGRAM_ENGAGEMENT_FOOTERS.some((f) => out.includes(f))).toBe(true);
  });

  it('formats growth post with site links', () => {
    const text = formatGrowthPost('https://betrollover.com', 0);
    expect(text).toContain('https://betrollover.com');
    expect(text.toLowerCase()).toMatch(/react|forward|share/);
  });

  it('formats advice post about bankroll / profit discipline', () => {
    const text = formatAdvicePost('https://betrollover.com', 1);
    expect(text.toLowerCase()).toMatch(/bankroll|profit|discipline|stake/);
    expect(text).toContain('18+');
  });

  it('includes bookie withdraw and essentials protection across advice pool', () => {
    const joined = Array.from({ length: 12 }, (_, i) => formatAdvicePost('https://betrollover.com', i)).join(
      '\n---\n',
    );
    expect(joined.toLowerCase()).toMatch(/school fees|rent|housekeeping/);
    expect(joined.toLowerCase()).toMatch(/withdraw/);
    expect(joined.toLowerCase()).toMatch(/sportybet|bookie|bookmaker/);
  });

  it('advice posts get engagement footer asking for reactions', async () => {
    process.env.APP_URL = 'https://betrollover.com';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHANNEL_ID = '@betrollovertips';
    process.env.TELEGRAM_CHANNEL_POSTS_ENABLED = 'true';
    process.env.TELEGRAM_ADVICE_POSTS_ENABLED = 'true';
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;
    await svc.postAdviceMessage('test-advice');
    const body = calls[0] as { text: string };
    expect(TELEGRAM_ENGAGEMENT_FOOTERS.some((f) => body.text.includes(f))).toBe(true);
  });

  it('always allows AccaSure1X2', () => {
    expect(telegramAlwaysAllowUsernames()).toContain(ROLLOVER_OWNER_USERNAME);
  });

  it('has SEO description under Telegram limit', () => {
    expect(TELEGRAM_CHANNEL_SEO_DESCRIPTION.length).toBeLessThanOrEqual(255);
    expect(TELEGRAM_CHANNEL_SEO_DESCRIPTION.toLowerCase()).toContain('ghana');
  });

  it('pickRotatingLine is stable for same salt', () => {
    expect(pickRotatingLine(TELEGRAM_ENGAGEMENT_FOOTERS, 42)).toBe(
      pickRotatingLine(TELEGRAM_ENGAGEMENT_FOOTERS, 42),
    );
  });
});

describe('TelegramChannelService engagement', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.APP_URL = 'https://betrollover.com';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHANNEL_ID = '@betrollovertips';
    process.env.TELEGRAM_CHANNEL_POSTS_ENABLED = 'true';
    process.env.TELEGRAM_GROWTH_POSTS_ENABLED = 'true';
  });

  afterAll(() => {
    process.env = prev;
  });

  it('includes footer on free pick posts', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    await svc.postNewPick({
      couponId: 7,
      title: 'Sure Mix',
      tipsterName: 'AccaSure',
      totalOdds: 1.9,
      isFree: true,
    });

    const body = calls[0] as { text: string };
    expect(body.text).toContain('Sure Mix · free');
    expect(TELEGRAM_ENGAGEMENT_FOOTERS.some((f) => body.text.includes(f))).toBe(true);
  });

  it('paid teaser has no booking code and has footer', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    await svc.postNewPick({
      couponId: 8,
      title: 'Banker',
      tipsterName: 'Pro',
      totalOdds: 3,
      isFree: false,
      priceGhs: 10,
      bookingCode: 'SECRET',
    });

    const body = calls[0] as { text: string };
    expect(body.text).toContain('Paid pick');
    expect(body.text).not.toContain('SECRET');
    expect(TELEGRAM_ENGAGEMENT_FOOTERS.some((f) => body.text.includes(f))).toBe(true);
  });

  it('posts growth message', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    const r = await svc.postGrowthMessage('morning-test');
    expect(r.ok).toBe(true);
    const body = calls[0] as { text: string };
    expect(body.text.toLowerCase()).toMatch(/react|forward/);
  });
});

describe('TelegramEligibilityService', () => {
  it('allows AccaSure and blocks other Acca Desk', async () => {
    const svc = new TelegramEligibilityService(
      { findOne: async () => null } as any,
      { findOne: async () => ({ minimumROI: 20, minimumWinRate: 30 }) } as any,
    );
    const sure = await svc.evaluateTipster({
      username: ROLLOVER_OWNER_USERNAME,
      tipsterType: ACCA_DESK_TIPSTER_TYPE,
      isActive: true,
    });
    expect(sure.ok).toBe(true);

    const other = await svc.evaluateTipster({
      username: 'AccaSafe1X2',
      tipsterType: ACCA_DESK_TIPSTER_TYPE,
      isActive: true,
      totalWins: 100,
      totalLosses: 10,
      winRate: 90,
      roi: 50,
    });
    expect(other.ok).toBe(false);
    expect(other.reason).toBe('acca_desk_other');
  });

  it('allows human tipsters above performance bar', async () => {
    const svc = new TelegramEligibilityService(
      { findOne: async () => null } as any,
      { findOne: async () => ({ minimumROI: 20, minimumWinRate: 30 }) } as any,
    );
    const ok = await svc.evaluateTipster({
      username: 'TopHuman',
      tipsterType: null,
      isActive: true,
      totalWins: 12,
      totalLosses: 3,
      winRate: 80,
      roi: 40,
    });
    expect(ok.ok).toBe(true);
    expect(ok.reason).toBe('performance');

    const weak = await svc.evaluateTipster({
      username: 'ColdStart',
      tipsterType: null,
      isActive: true,
      totalWins: 1,
      totalLosses: 0,
      winRate: 100,
      roi: 50,
    });
    expect(weak.ok).toBe(false);
    expect(weak.reason).toBe('below_bar');
  });
});
