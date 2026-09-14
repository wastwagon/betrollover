import { buildCouponCardSvg, couponCardCaption, renderCouponCardPng } from './telegram-coupon-card';

describe('telegram coupon card svg', () => {
  it('renders live VIP two-fold with combined odds and legs', () => {
    const svg = buildCouponCardSvg({
      title: 'VIP · Two-Fold · Home win',
      tipsterName: 'VIP · Two-Fold',
      totalOdds: 1.626,
      channel: 'vip',
      variant: 'live',
      legs: [
        { matchDescription: 'Al-Ahli Jeddah vs Pakhtakor', prediction: 'Home Win', odds: 1.27 },
        { matchDescription: 'Inter vs Udinese', prediction: 'Home Win', odds: 1.28 },
      ],
    });
    expect(svg).toContain('VIP · Two-Fold · Home win');
    expect(svg).toContain('Al-Ahli Jeddah vs Pakhtakor');
    expect(svg).toContain('1.63');
    expect(svg).toContain('>VIP<');
    expect(svg).not.toContain('Unlock this pick');
  });

  it('marks won fixtures and shows FT scores', () => {
    const svg = buildCouponCardSvg({
      title: 'VIP · Two-Fold · Home win',
      tipsterName: 'VIP · Two-Fold',
      totalOdds: 1.626,
      channel: 'vip',
      variant: 'won',
      legs: [
        {
          matchDescription: 'Al-Ahli Jeddah vs Pakhtakor',
          prediction: 'Home Win',
          odds: 1.27,
          result: 'won',
          homeScore: 2,
          awayScore: 0,
        },
        {
          matchDescription: 'Inter vs Udinese',
          prediction: 'Home Win',
          odds: 1.28,
          result: 'won',
          homeScore: 1,
          awayScore: 0,
        },
      ],
    });
    expect(svg).toContain('>WON<');
    expect(svg).toContain('FT 2-0');
    expect(svg).toContain('FT 1-0');
    expect(svg).toContain('Al-Ahli Jeddah vs Pakhtakor');
  });

  it('hides paid teaser legs until settled', () => {
    const live = buildCouponCardSvg({
      title: 'Banker',
      channel: 'paid',
      variant: 'live',
      totalOdds: 3,
      legs: [{ matchDescription: 'Secret vs Match', prediction: 'Home', odds: 1.5 }],
    });
    expect(live).toContain('Unlock this pick on BetRollover');
    expect(live).not.toContain('Secret vs Match');

    const won = buildCouponCardSvg({
      title: 'Banker',
      channel: 'paid',
      variant: 'won',
      totalOdds: 3,
      legs: [
        {
          matchDescription: 'Secret vs Match',
          prediction: 'Home',
          odds: 1.5,
          result: 'won',
          homeScore: 1,
          awayScore: 0,
        },
      ],
    });
    expect(won).toContain('Secret vs Match');
    expect(won).toContain('>WON<');
  });

  it('escapes xml in match names', () => {
    const svg = buildCouponCardSvg({
      title: 'A & B <C>',
      channel: 'free',
      variant: 'live',
      legs: [{ matchDescription: 'Foo & Bar <Baz>', prediction: 'Home', odds: 1.2 }],
    });
    expect(svg).toContain('Foo &amp; Bar &lt;Baz&gt;');
    expect(svg).not.toContain('Foo & Bar <Baz>');
  });

  it('renders a real PNG via sharp (CJS import, not .default)', async () => {
    const png = await renderCouponCardPng({
      title: 'VIP · Two-Fold · Home win',
      tipsterName: 'VIP · Two-Fold',
      totalOdds: 1.626,
      channel: 'vip',
      variant: 'live',
      legs: [
        { matchDescription: 'Al-Ahli Jeddah vs Pakhtakor', prediction: 'Home Win', odds: 1.27 },
        { matchDescription: 'Inter vs Udinese', prediction: 'Home Win', odds: 1.28 },
      ],
    });
    expect(png.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.length).toBeGreaterThan(1000);
  });

  it('keeps captions under Telegram photo limit', () => {
    const caption = couponCardCaption({
      headline: 'BETROLLOVER VIP · Two-Fold',
      couponUrl: 'https://betrollover.com/coupons/1',
    });
    expect(caption.length).toBeLessThanOrEqual(1024);
    expect(caption).toContain('18+');
  });
});
