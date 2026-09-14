import {
  TELEGRAM_CHANNEL_SEO_DESCRIPTION,
  TELEGRAM_ENGAGEMENT_FOOTERS,
  appendEngagementFooter,
  formatAdvicePost,
  formatCommunityAppealPost,
  formatGrowthPost,
  formatTipsterRecruitPost,
  pickRotatingLine,
  telegramAlwaysAllowUsernames,
} from './telegram-copy';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramEligibilityService } from './telegram-eligibility.service';
import { ROLLOVER_OWNER_USERNAME } from '../../config/rollover-desk.config';
import { ACCA_DESK_TIPSTER_TYPE } from '../../config/acca-desk-tipsters.config';

jest.mock('./telegram-coupon-card', () => {
  const actual = jest.requireActual('./telegram-coupon-card');
  return {
    ...actual,
    renderCouponCardPng: jest.fn(async () => Buffer.from('png')),
  };
});

function parseTelegramCall(url: unknown, init?: RequestInit) {
  const href = String(url);
  if (href.includes('sendPhoto')) {
    const form = init?.body as FormData;
    return { method: 'sendPhoto' as const, caption: String(form?.get?.('caption') ?? '') };
  }
  const body = JSON.parse(String(init?.body));
  return { method: 'sendMessage' as const, text: String(body.text || '') };
}

describe('telegram-copy', () => {
  it('appends short engagement footer with channel join link', () => {
    process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE = 'betrollovertips';
    const out = appendEngagementFooter('Hello pick', 1);
    expect(out.startsWith('Hello pick')).toBe(true);
    expect(out).toContain('https://t.me/betrollovertips');
    expect(out).not.toContain('{channel}');
    expect(out).not.toContain('I’m on it');
  });

  it('formats growth post as discover (channel + site), not tipster earn', () => {
    process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE = 'betrollovertips';
    const text = formatGrowthPost('https://betrollover.com', 0);
    expect(text).toContain('Discover');
    expect(text).toContain('https://betrollover.com');
    expect(text).toContain('https://t.me/betrollovertips');
    expect(text.toLowerCase()).not.toContain('70%');
    expect(text).not.toContain('{channel}');
  });

  it('formats tipster recruit with register link; earn via paid picks not share', () => {
    process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE = 'betrollovertips';
    const text = formatTipsterRecruitPost('https://betrollover.com');
    expect(text).toContain('Tipsters');
    expect(text).toContain(
      'https://betrollover.com/register?utm_source=telegram&utm_medium=social&utm_campaign=channel_tipster_recruit',
    );
    expect(text.toLowerCase()).toContain('earn');
    expect(text.toLowerCase()).toContain('paid picks');
    expect(text).toContain('not by sharing the link');
    expect(text).toContain('tipster friends');
    expect(text).not.toMatch(/70%/);
    expect(text).not.toContain('{register}');
  });

  it('formats exact daily community appeal with join link', () => {
    process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE = 'betrollovertips';
    const text = formatCommunityAppealPost();
    expect(text).toContain('Quick ask from the BetRollover team');
    expect(text).toContain('🔥 — I’m on it');
    expect(text).toContain('👍 — solid pick');
    expect(text).toContain('❤️ — support the free tips');
    expect(text).toContain('👏 — well done / W');
    expect(text).toContain('👉 Join here: https://t.me/betrollovertips');
    expect(text).not.toContain('{channel}');
    expect(text).not.toContain('Complete message');
  });

  it('formats advice post about bankroll / profit discipline', () => {
    const text = formatAdvicePost('https://betrollover.com', 1);
    expect(text).toContain('Advice');
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

  it('advice posts are complete without tip engagement footer', async () => {
    process.env.APP_URL = 'https://betrollover.com';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHANNEL_ID = '@betrollovertips';
    process.env.TELEGRAM_CHANNEL_POSTS_ENABLED = 'true';
    process.env.TELEGRAM_ADVICE_POSTS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE = 'betrollovertips';
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;
    await svc.postAdviceMessage('test-advice');
    const body = calls[0] as { text: string };
    expect(body.text).toContain('Advice');
    expect(body.text).toContain('https://t.me/betrollovertips');
    expect(body.text).not.toContain('I’m on it');
  });

  it('always allows AccaSure1X2', () => {
    expect(telegramAlwaysAllowUsernames()).toContain(ROLLOVER_OWNER_USERNAME);
  });

  it('has SEO description under Telegram limit', () => {
    expect(TELEGRAM_CHANNEL_SEO_DESCRIPTION.length).toBeLessThanOrEqual(255);
    expect(TELEGRAM_CHANNEL_SEO_DESCRIPTION.toLowerCase()).toContain('football');
    expect(TELEGRAM_CHANNEL_SEO_DESCRIPTION.toLowerCase()).toContain('tipster');
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
    process.env.TELEGRAM_COMMUNITY_APPEAL_ENABLED = 'true';
    process.env.TELEGRAM_TIPSTER_RECRUIT_ENABLED = 'true';
    process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE = 'betrollovertips';
  });

  afterAll(() => {
    process.env = prev;
  });

  it('includes footer on free pick posts', async () => {
    const svc = new TelegramChannelService();
    const calls: { method: string; caption?: string; text?: string }[] = [];
    global.fetch = jest.fn(async (url, init) => {
      calls.push(parseTelegramCall(url, init as RequestInit));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    await svc.postNewPick({
      couponId: 7,
      title: 'Sure Mix',
      tipsterName: 'AccaSure',
      totalOdds: 1.9,
      isFree: true,
      legs: [
        { matchDescription: 'A vs B', prediction: 'Home Win', odds: 1.4 },
        { matchDescription: 'C vs D', prediction: 'Home Win', odds: 1.35 },
      ],
    });

    expect(calls[0].method).toBe('sendPhoto');
    expect(calls[0].caption).toContain('Sure Mix · free');
    expect(calls[0].caption).toContain('https://t.me/betrollovertips');
  });

  it('paid teaser has no booking code and has footer', async () => {
    const svc = new TelegramChannelService();
    const calls: { method: string; caption?: string; text?: string }[] = [];
    global.fetch = jest.fn(async (url, init) => {
      calls.push(parseTelegramCall(url, init as RequestInit));
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
      legs: [{ matchDescription: 'Hidden vs Match', prediction: 'Home', odds: 1.5 }],
    });

    expect(calls[0].method).toBe('sendPhoto');
    expect(calls[0].caption).toContain('Paid pick');
    expect(calls[0].caption).not.toContain('SECRET');
    expect(calls[0].caption).toContain('https://t.me/betrollovertips');
  });

  it('won posts send a card caption with the coupon link', async () => {
    const svc = new TelegramChannelService();
    const calls: { method: string; caption?: string; text?: string }[] = [];
    global.fetch = jest.fn(async (url, init) => {
      calls.push(parseTelegramCall(url, init as RequestInit));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    await svc.postWin({
      couponId: 9,
      title: 'Sure Mix',
      tipsterName: 'AccaSure',
      totalOdds: 1.9,
      isFree: true,
      legs: [
        {
          matchDescription: 'A vs B',
          prediction: 'Home Win',
          odds: 1.4,
          result: 'won',
          homeScore: 2,
          awayScore: 1,
        },
      ],
    });

    expect(calls[0].method).toBe('sendPhoto');
    expect(calls[0].caption).toContain('Won ✅');
    expect(calls[0].caption).toContain('/coupons/9');
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
    expect(body.text).toContain('Discover');
    expect(body.text).toContain('https://t.me/betrollovertips');
  });

  it('posts exact community appeal once without extra footer chrome', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    const r = await svc.postCommunityAppealMessage();
    expect(r.ok).toBe(true);
    const body = calls[0] as { text: string };
    expect(body.text).toContain('Quick ask from the BetRollover team');
    expect(body.text).toContain('👉 Join here: https://t.me/betrollovertips');
    expect(body.text).not.toContain('Complete message');
    expect(body.text.endsWith('🙏')).toBe(true);
  });

  it('posts tipster recruit with register URL', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    const r = await svc.postTipsterRecruitMessage();
    expect(r.ok).toBe(true);
    const body = calls[0] as { text: string };
    expect(body.text).toContain('/register?utm_source=telegram');
    expect(body.text).toContain('tipster friends');
    expect(body.text).toContain('paid picks');
    expect(body.text).not.toMatch(/70%/);
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
