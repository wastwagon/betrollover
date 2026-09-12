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

    await svc.postFreePick({
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
    expect(body.text).toContain('/coupons/99?utm_source=telegram');
  });

  it('includes booking code only when tipster provided one', async () => {
    const svc = new TelegramChannelService();
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    }) as typeof fetch;

    await svc.postFreePick({
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

  it('skips paid free-pick posts', async () => {
    const svc = new TelegramChannelService();
    global.fetch = jest.fn() as typeof fetch;
    const r = await svc.postFreePick({
      couponId: 1,
      title: 'Paid',
      isFree: false,
      totalOdds: 3,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('skipped_paid');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
