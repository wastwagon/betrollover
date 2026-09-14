import { formatVipCouponPost, formatVipWinPost, parseVipStartPayload, vipBotStartUrl } from './telegram-vip-format';

describe('VIP Telegram format', () => {
  it('formats a two-fold with booking code', () => {
    const text = formatVipCouponPost({
      title: 'VIP · Two-Fold · Home or Draw',
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
    expect(text).toContain('Combined 2.45');
    expect(text).toContain('Team A vs Team B');
    expect(text).toContain('ABC123');
    expect(text).toContain('https://betrollover.com/coupons/1');
    expect(text.toLowerCase()).toContain('18+');
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
      title: 'VIP · Two-Fold · Home win',
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
