import { TelegramChannelService } from './telegram-channel.service';

describe('TelegramChannelService message formatting', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.APP_URL = 'https://betrollover.com';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHANNEL_ID = '@betrollovertips';
    process.env.TELEGRAM_CHANNEL_POSTS_ENABLED = 'true';
  });

  afterAll(() => {
    process.env = prev;
  });

  it('formats free pick without booking code when absent', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    await svc.postNewPick({
      couponId: 99,
      title: 'Acca Mix',
      tipsterName: 'AccaSure',
      totalOdds: 4.25,
      isFree: true,
    });

    const body = calls[0] as { text: string };
    expect(body.text).toContain('Acca Mix · free · 4.25 odds');
    expect(body.text).toContain('Tipster: AccaSure');
    expect(body.text).not.toMatch(/code:/i);
    expect(body.text).toContain('utm_campaign=channel_auto');
  });

  it('includes booking code only when tipster provided one on free picks', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    await svc.postNewPick({
      couponId: 1,
      title: 'Pick',
      tipsterName: 'T',
      totalOdds: 2,
      isFree: true,
      bookmakerKey: 'sportybet',
      bookingCode: 'SB-99',
    });

    const body = calls[0] as { text: string };
    expect(body.text).toContain('SportyBet code: SB-99');
  });

  it('posts paid teaser without booking code and with buy CTA', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    await svc.postNewPick({
      couponId: 42,
      title: 'Banker Acca',
      tipsterName: 'ProTips',
      totalOdds: 5.5,
      isFree: false,
      priceGhs: 15,
      bookmakerKey: 'sportybet',
      bookingCode: 'SECRET',
    });

    const body = calls[0] as { text: string };
    expect(body.text).toContain('Paid pick 🔒');
    expect(body.text).toContain('Banker Acca');
    expect(body.text).toContain('GHS 15.00');
    expect(body.text).toContain('Unlock on BetRollover');
    expect(body.text).toContain('utm_campaign=channel_paid');
    expect(body.text).not.toContain('SECRET');
    expect(body.text).not.toMatch(/code:/i);
  });

  it('posts Acca Desk digest with count and marketplace link', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    await svc.postAccaDeskDigest({ deskDay: '2026-09-12', publishedCount: 8 });

    const body = calls[0] as { text: string };
    expect(body.text).toContain('Acca Desk · 2026-09-12');
    expect(body.text).toContain('8 new free 2-folds');
    expect(body.text).toContain('utm_campaign=channel_acca_digest');
  });

  it('skips Acca Desk digest when nothing published', async () => {
    const svc = new TelegramChannelService();
    global.fetch = jest.fn() as typeof fetch;
    const r = await svc.postAccaDeskDigest({ deskDay: '2026-09-12', publishedCount: 0 });
    expect(r.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
