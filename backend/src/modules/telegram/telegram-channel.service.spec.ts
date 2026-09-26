import {
  TELEGRAM_CHANNEL_SEO_DESCRIPTION,
  TELEGRAM_ENGAGEMENT_FOOTERS,
  appendEngagementFooter,
  formatAdvicePost,
  formatCommunityAppealPost,
  formatGrowthPost,
  formatTipsterRecruitPost,
  formatVipPublicSlipTeaser,
  formatVipPublicWinPost,
  pickRotatingLine,
  telegramAdsHandle,
  telegramContactHandle,
  telegramAlwaysAllowUsernames,
  telegramChannelSeoDescription,
} from './telegram-copy';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramEligibilityService } from './telegram-eligibility.service';
import { PUBLIC_CHANNEL_SURE_USERNAME } from '../../config/rollover-desk.config';
import { ACCA_DESK_TIPSTER_TYPE } from '../../config/acca-desk-tipsters.config';

function parseTelegramCall(url: unknown, init?: RequestInit) {
  const href = String(url);
  const method = href.includes('/sendPhoto')
    ? 'sendPhoto'
    : href.includes('/sendMessage')
      ? 'sendMessage'
      : 'unknown';
  const bodyRaw = (init as RequestInit)?.body;
  if (typeof bodyRaw === 'string') {
    const body = JSON.parse(bodyRaw) as { text?: string; caption?: string };
    return { method, text: String(body.text || ''), caption: body.caption };
  }
  return { method, text: '', caption: undefined as string | undefined };
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

  it('formats growth post for VIP invite + private contact', () => {
    process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE = 'betrollovertips';
    delete process.env.TELEGRAM_CONTACT_HANDLE;
    const text = formatGrowthPost('https://betrollover.com', 0);
    expect(text).toContain('Rollover VIP');
    expect(text).toContain('@wastwagon');
    expect(text).not.toContain('@betrollovertips');
    expect(text.toLowerCase()).toContain('fixed');
    expect(text).not.toContain('{channel}');
    expect(text).not.toContain('{contact}');
    expect(text).not.toContain('/rollover');
  });

  it('formats VIP free-channel slip teaser without legs', () => {
    process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE = 'betrollovertips';
    delete process.env.TELEGRAM_CONTACT_HANDLE;
    const text = formatVipPublicSlipTeaser({ siteOrigin: 'https://betrollover.com', totalOdds: 1.65 });
    expect(text).toContain('1.65');
    expect(text).toContain('@wastwagon');
    expect(text.toLowerCase()).toContain('members only');
    expect(text).not.toContain('Home Win');
    expect(text).toContain('/rollover');
  });

  it('formats VIP free-channel win with contact CTA', () => {
    process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE = 'betrollovertips';
    delete process.env.TELEGRAM_CONTACT_HANDLE;
    const text = formatVipPublicWinPost({
      siteOrigin: 'https://betrollover.com',
      title: 'VIP · Two-Fold',
      totalOdds: 1.59,
      legs: [{ matchDescription: 'Team A vs Team B', prediction: 'Home', result: 'won' }],
    });
    expect(text).toContain('VIP won');
    expect(text).toContain('Team A vs Team B');
    expect(text).toContain('@wastwagon');
    expect(telegramAdsHandle()).toBe('betrollovertips');
    expect(telegramContactHandle()).toBe('wastwagon');
  });

  it('ignores numeric TELEGRAM_CHANNEL_ID when resolving public @handle', () => {
    delete process.env.NEXT_PUBLIC_TELEGRAM_ADS_HANDLE;
    process.env.TELEGRAM_CHANNEL_ID = '-1001950138526';
    expect(telegramAdsHandle()).toBe('betrollovertips');
    expect(telegramContactHandle()).toBe('wastwagon');
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

  it('formats exact monthly community appeal with join link', () => {
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
    expect(telegramAlwaysAllowUsernames()).toContain(PUBLIC_CHANNEL_SURE_USERNAME);
  });

  it('has SEO description under Telegram limit', () => {
    expect(telegramChannelSeoDescription().length).toBeLessThanOrEqual(255);
    expect(telegramChannelSeoDescription().toLowerCase()).toContain('football');
    expect(telegramChannelSeoDescription().toLowerCase()).toContain('vip');
    expect(TELEGRAM_CHANNEL_SEO_DESCRIPTION.length).toBeLessThanOrEqual(255);
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
    delete process.env.TELEGRAM_CONTACT_HANDLE;
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

    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].text).toContain('Sure Mix · free');
    expect(calls[0].text).toContain('A vs B');
    expect(calls[0].text).toContain('Home Win');
    expect(calls[0].text).toContain('https://t.me/betrollovertips');
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

    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].text).toContain('Paid pick');
    expect(calls[0].text).not.toContain('SECRET');
    expect(calls[0].text).toContain('https://t.me/betrollovertips');
  });

  it('won posts send text with the coupon link', async () => {
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

    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].text).toContain('Won ✅');
    expect(calls[0].text).toContain('A vs B');
    expect(calls[0].text).toContain('Home Win');
    expect(calls[0].text).toContain('WON');
    expect(calls[0].text).toContain('FT 2-1');
    expect(calls[0].text).toContain('/coupons/9');
  });

  it('posts growth message', async () => {
    delete process.env.TELEGRAM_CONTACT_HANDLE;
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    const r = await svc.postGrowthMessage(0);
    expect(r.ok).toBe(true);
    const body = calls[0] as { text: string };
    expect(body.text).toContain('Rollover VIP');
    expect(body.text).toContain('@wastwagon');
    expect(body.text).toContain('18+');
  });

  it('posts VIP slip teaser to free channel without legs', async () => {
    delete process.env.TELEGRAM_CONTACT_HANDLE;
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    const r = await svc.postVipSlipTeaser({ couponId: 42, totalOdds: 1.72 });
    expect(r.ok).toBe(true);
    const body = calls[0] as { text: string };
    expect(body.text).toContain('1.72');
    expect(body.text).toContain('@wastwagon');
    expect(body.text.toLowerCase()).toContain('members only');
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
      username: PUBLIC_CHANNEL_SURE_USERNAME,
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
