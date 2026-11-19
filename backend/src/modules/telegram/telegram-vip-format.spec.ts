import { formatVipCouponPost, formatVipWinPost, parseVipStartPayload, vipBotStartUrl } from './telegram-vip-format';

describe('VIP Telegram format', () => {
  it('formats a two-fold with booking code', () => {
    const text = formatVipCouponPost({
      title: 'AccaSure1X2 · Home or Draw',
      totalOdds: 2.45,
      legs: [
        { matchDescription: 'Team A vs Team B', prediction: 'Home or Draw', odds: 1.5 },
        { matchDescription: 'Team C vs Team D', prediction: 'Home or Draw', odds: 1.63 },
      ],
      bookingCode: 'ABC123',
      bookmakerKey: 'sportybet',
      couponUrl: 'https://betrollover.com/coupons/1',
    });
    expect(text).toContain('BETROLLOVER VIP');
    expect(text).toContain('AccaSure1X2 · Home or Draw');
    expect(text).toContain('Combined 2.45');
    expect(text).toContain('Team A vs Team B');
    expect(text).toContain('ABC123');
    expect(text).toContain('https://betrollover.com/coupons/1');
    expect(text.toLowerCase()).toContain('18+');
  });

  it('does not repeat SEO fixture titles above the leg list', () => {
    const text = formatVipCouponPost({
      title: '2-match pick: Team A vs Team B + Team C vs Team D, 20 Nov 2026',
      totalOdds: 1.57,
      legs: [
        { matchDescription: 'Team A vs Team B', prediction: 'Home win', odds: 1.29 },
        { matchDescription: 'Team C vs Team D', prediction: 'Home win', odds: 1.22 },
      ],
      couponUrl: 'https://betrollover.com/coupons/9',
    });
    expect(text).toContain('BETROLLOVER VIP · Two-Fold');
    expect(text).toContain('Combined 1.57');
    expect(text).toContain('Team A vs Team B');
    expect(text).not.toMatch(/2-match pick:/);
    expect(text).not.toContain('Team A vs Team B + Team C vs Team D');
  });

  it('parses /start payloads', () => {
    expect(parseVipStartPayload('/start vabcdef12345678')).toBe('abcdef12345678');
    expect(parseVipStartPayload('/start')).toBeNull();
    expect(parseVipStartPayload('hello')).toBeNull();
  });

  it('builds a bot deep link', () => {
    expect(vipBotStartUrl('BetRolloverTipsBot', 'abc')).toBe('https://t.me/BetRolloverTipsBot?start=vabc');
    expect(vipBotStartUrl(null, 'abc')).toBeNull();
  });

  it('formats a won post with WON on each fixture', () => {
    const text = formatVipWinPost({
      title: 'AccaSure1X2 · Home win',
      totalOdds: 1.63,
      couponUrl: 'https://betrollover.com/coupons/1',
      legs: [
        {
          matchDescription: 'Al-Ahli Jeddah vs Pakhtakor',
          prediction: 'Home Win',
          result: 'won',
          homeScore: 2,
          awayScore: 0,
        },
      ],
    });
    expect(text).toContain('VIP won');
    expect(text).toContain('Al-Ahli Jeddah vs Pakhtakor');
    expect(text).toContain('WON');
    expect(text).toContain('FT 2-0');
  });
});
