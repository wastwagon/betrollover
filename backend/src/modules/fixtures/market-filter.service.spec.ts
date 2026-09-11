/**
 * Lightweight tests for MarketFilterService allowlist + passthrough.
 * Instantiates without Nest DI by stubbing the repo.
 */
import { MarketFilterService } from './market-filter.service';
import { MarketConfig } from './entities/market-config.entity';

function cfg(partial: Partial<MarketConfig> & Pick<MarketConfig, 'marketName'>): MarketConfig {
  return {
    id: 1,
    isEnabled: true,
    tier: 1,
    allowedValues: null,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as MarketConfig;
}

describe('MarketFilterService passthrough', () => {
  let service: MarketFilterService;

  beforeEach(async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([
        cfg({ marketName: 'Match Winner' }),
        cfg({
          marketName: 'Goals Over/Under',
          allowedValues: ['1.5', '2.5', '3.5'],
        }),
        cfg({ marketName: 'Correct Score' }),
      ]),
    };
    service = new MarketFilterService(repo as any);
    await service.loadMarketConfigs();
  });

  it('allows configured markets', () => {
    expect(service.isMarketAllowed('Match Winner')).toBe(true);
    expect(service.isMarketAllowed('1X2')).toBe(true);
  });

  it('allows unlisted API markets for pick creation (corners, cards)', () => {
    expect(service.isMarketAllowed('Corners Over/Under')).toBe(true);
    expect(service.isMarketAllowed('Cards Over/Under')).toBe(true);
    expect(service.isMarketValueAllowed('Corners Over/Under', 'Over 8.5')).toBe(true);
  });

  it('denies Race To and period corner markets (no settle inputs)', () => {
    expect(service.isMarketAllowed('Corners Race To')).toBe(false);
    expect(service.isMarketAllowed('Race to Corners')).toBe(false);
    expect(service.isMarketAllowed('Total Corners (1st Half)')).toBe(false);
    expect(service.isMarketAllowed('Total Corners (2nd Half)')).toBe(false);
  });

  it('respects disabled market_config rows (not silently allowed)', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([
        cfg({ marketName: 'Match Winner' }),
        cfg({ marketName: 'Asian Handicap', isEnabled: false }),
      ]),
    };
    const svc = new MarketFilterService(repo as any);
    await svc.loadMarketConfigs();
    expect(svc.isMarketAllowed('Match Winner')).toBe(true);
    expect(svc.isMarketAllowed('Asian Handicap')).toBe(false);
    expect(svc.getEnabledMarkets()).toEqual(['Match Winner']);
  });

  it('still filters Goals Over/Under to allowed lines', () => {
    expect(service.isMarketValueAllowed('Goals Over/Under', 'Over 2.5')).toBe(true);
    expect(service.isMarketValueAllowed('Goals Over/Under', 'Over 4.5')).toBe(false);
  });

  it('still filters Correct Score to common scores', () => {
    expect(service.isMarketValueAllowed('Correct Score', '2-1')).toBe(true);
    expect(service.isMarketValueAllowed('Correct Score', '9-9')).toBe(false);
  });
});
