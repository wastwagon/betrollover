import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketConfig } from './entities/market-config.entity';
import { normalizeApiMarketName } from './api-market-aliases';

/** Common Correct Score options only (excludes rare scores like 10:0, 9:9, etc.) */
const CORRECT_SCORE_ALLOWED = new Set([
  '0-0', '0:0', '1-0', '1:0', '0-1', '0:1', '1-1', '1:1',
  '2-0', '2:0', '0-2', '0:2', '2-1', '2:1', '1-2', '1:2', '2-2', '2:2',
  '3-0', '3:0', '0-3', '0:3', '3-1', '3:1', '1-3', '1:3', '3-2', '3:2', '2-3', '2:3',
]);

/** Skip noisy / non-football-prop noise if API ever returns it under odds. */
const DENIED_EXTRA_MARKETS = new Set(
  [
    'Player Props',
    'Anytime Goalscorer',
    'First Goalscorer',
    'Last Goalscorer',
    // Needs chronological events — we only store FT totals from /fixtures/statistics
    'Corners Race To',
    'Race to Corners',
    // Needs period corner totals — API statistics endpoint is full-match only
    'Total Corners (1st Half)',
    'Total Corners (2nd Half)',
  ].map((s) => s.toLowerCase()),
);

function isDeniedExtraMarket(marketName: string): boolean {
  const n = (marketName || '').trim().toLowerCase();
  if (DENIED_EXTRA_MARKETS.has(n)) return true;
  // Substring guards for bookmaker spelling variants
  if (n.includes('corner') && n.includes('race')) return true;
  if (
    n.includes('corner') &&
    (n.includes('1st half') ||
      n.includes('2nd half') ||
      n.includes('first half') ||
      n.includes('second half'))
  ) {
    return true;
  }
  return false;
}

@Injectable()
export class MarketFilterService {
  private marketConfigCache: Map<string, MarketConfig> = new Map();

  constructor(
    @InjectRepository(MarketConfig)
    private marketConfigRepo: Repository<MarketConfig>,
  ) {}

  /**
   * Load all market configs (enabled and disabled) so disable toggles are respected
   * when allow-unknown passthrough is active.
   */
  async loadMarketConfigs(): Promise<void> {
    const configs = await this.marketConfigRepo.find({
      order: { displayOrder: 'ASC' },
    });
    this.marketConfigCache.clear();
    for (const config of configs) {
      this.marketConfigCache.set(config.marketName, config);
    }
  }

  /**
   * Check if a market is allowed.
   * Known `market_config` rows must be enabled; unknown API markets (corners, cards, etc.)
   * are allowed through for pick creation so we sync the full bookmaker board.
   * Denied extras (Race To, period corners, player props) are always blocked.
   */
  isMarketAllowed(marketName: string): boolean {
    const normalized = normalizeApiMarketName(marketName);
    if (isDeniedExtraMarket(normalized) || isDeniedExtraMarket(marketName)) return false;
    const config = this.marketConfigCache.get(normalized);
    if (config) return config.isEnabled === true;
    return true;
  }

  /**
   * Filter market values (e.g., Over/Under lines, Correct Score)
   */
  isMarketValueAllowed(marketName: string, marketValue: string): boolean {
    const normalized = normalizeApiMarketName(marketName);
    if (isDeniedExtraMarket(normalized)) return false;

    const config = this.marketConfigCache.get(normalized);

    // Correct Score: only common scores (0-0, 1-0, 1-1, 2-1, etc.) — even if config missing
    if (normalized === 'Correct Score') {
      if (config && !config.isEnabled) return false;
      const val = (marketValue || '').trim().replace(/:/g, '-');
      return CORRECT_SCORE_ALLOWED.has(val);
    }

    // Unlisted API markets (corners, cards, …): keep all outcomes for pick creation
    if (!config) return true;
    if (!config.isEnabled) return false;

    // If no allowedValues specified, all values are allowed
    if (!config.allowedValues || config.allowedValues.length === 0) {
      return true;
    }

    // For Over/Under markets, check if value contains allowed lines
    if (normalized === 'Goals Over/Under' || normalized === 'Goals Over/Under First Half') {
      return config.allowedValues.some(line => marketValue.includes(line));
    }

    // For other markets, check exact match
    return config.allowedValues.includes(marketValue);
  }

  /**
   * Filter and process odds from API response
   * Returns filtered odds array
   */
  filterOddsFromApiResponse(apiResponse: any): Array<{
    marketName: string;
    marketValue: string;
    odds: number;
  }> {
    const filteredOdds: Array<{ marketName: string; marketValue: string; odds: number }> = [];
    
    if (!apiResponse?.response || apiResponse.response.length === 0) {
      return filteredOdds;
    }

    // Iterate ALL bookmakers to get best odds (first bookmaker may not have BTTS, etc.)
    const bookmakers = apiResponse.response[0]?.bookmakers || [];
    if (bookmakers.length === 0) return filteredOdds;

    for (const bookmaker of bookmakers) {
      for (const bet of bookmaker.bets || []) {
        const apiMarketName = bet.name;
        const marketName = normalizeApiMarketName(apiMarketName);

        if (!this.isMarketAllowed(apiMarketName)) continue;

        for (const value of bet.values || []) {
          const marketValue = value.value;
          const odds = parseFloat(value.odd) || 0;

          if (!this.isMarketValueAllowed(apiMarketName, marketValue)) continue;

          const existing = filteredOdds.find(
            o => o.marketName === marketName && o.marketValue === marketValue
          );

          if (!existing) {
            filteredOdds.push({ marketName, marketValue, odds });
          } else if (odds > existing.odds) {
            existing.odds = odds;
          }
        }
      }
    }

    return filteredOdds;
  }

  /**
   * Get all enabled market names
   */
  getEnabledMarkets(): string[] {
    return Array.from(this.marketConfigCache.values())
      .filter((c) => c.isEnabled)
      .map((c) => c.marketName);
  }

  /**
   * Get market config by name
   */
  getMarketConfig(marketName: string): MarketConfig | undefined {
    return this.marketConfigCache.get(marketName);
  }
}
