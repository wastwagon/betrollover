import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketConfig } from './entities/market-config.entity';

/**
 * API-Football returns market names that vary by bookmaker.
 * Map API names to our config names so BTTS, Correct Score, etc. are recognized.
 */
const API_MARKET_ALIASES: Record<string, string> = {
  // Both Teams To Score (BTTS / GG)
  'Both Teams To Score': 'Both Teams To Score',
  'Goals - Both Teams Score': 'Both Teams To Score',
  'Both Teams Score': 'Both Teams To Score',
  'BTTS': 'Both Teams To Score',
  'GG': 'Both Teams To Score',
  'Both Teams To Score - Yes/No': 'Both Teams To Score',
  // Correct Score
  'Correct Score': 'Correct Score',
  'Exact Score': 'Correct Score',
  'Score': 'Correct Score',
  // Half-Time/Full-Time (HT/FT)
  'Half-Time/Full-Time': 'Half-Time/Full-Time',
  'HT/FT': 'Half-Time/Full-Time',
  'Half Time/Full Time': 'Half-Time/Full-Time',
  'Half Time - Full Time': 'Half-Time/Full-Time',
  'Double Result': 'Half-Time/Full-Time',
  'Result at Half-Time/Full-Time': 'Half-Time/Full-Time',
  // Match Winner (1X2)
  'Match Winner': 'Match Winner',
  'Home/Away': 'Match Winner',
  '1X2': 'Match Winner',
  // Goals Over/Under
  'Goals Over/Under': 'Goals Over/Under',
  'Over/Under': 'Goals Over/Under',
  'Total Goals': 'Goals Over/Under',
  // Double Chance
  'Double Chance': 'Double Chance',
};

/** Common Correct Score options only (excludes rare scores like 10:0, 9:9, etc.) */
const CORRECT_SCORE_ALLOWED = new Set([
  '0-0', '0:0', '1-0', '1:0', '0-1', '0:1', '1-1', '1:1',
  '2-0', '2:0', '0-2', '0:2', '2-1', '2:1', '1-2', '1:2', '2-2', '2:2',
  '3-0', '3:0', '0-3', '0:3', '3-1', '3:1', '1-3', '1:3', '3-2', '3:2', '2-3', '2:3',
]);

@Injectable()
export class MarketFilterService {
  private marketConfigCache: Map<string, MarketConfig> = new Map();

  constructor(
    @InjectRepository(MarketConfig)
    private marketConfigRepo: Repository<MarketConfig>,
  ) {}

  /**
   * Load market configs from database and cache them
   */
  async loadMarketConfigs(): Promise<void> {
    const configs = await this.marketConfigRepo.find({
      where: { isEnabled: true },
      order: { displayOrder: 'ASC' },
    });
    this.marketConfigCache.clear();
    for (const config of configs) {
      this.marketConfigCache.set(config.marketName, config);
    }
  }

  /** Normalize API market name to our config name (handles bookmaker variations) */
  private normalizeMarketName(apiName: string): string {
    const trimmed = (apiName || '').trim();
    return API_MARKET_ALIASES[trimmed] ?? trimmed;
  }

  /**
   * Check if a market is allowed
   */
  isMarketAllowed(marketName: string): boolean {
    const normalized = this.normalizeMarketName(marketName);
    const config = this.marketConfigCache.get(normalized);
    return config?.isEnabled === true;
  }

  /**
   * Filter market values (e.g., Over/Under lines, Correct Score)
   */
  isMarketValueAllowed(marketName: string, marketValue: string): boolean {
    const normalized = this.normalizeMarketName(marketName);
    const config = this.marketConfigCache.get(normalized);
    if (!config || !config.isEnabled) return false;

    // Correct Score: only common scores (0-0, 1-0, 1-1, 2-1, etc.)
    if (normalized === 'Correct Score') {
      const val = (marketValue || '').trim().replace(/:/g, '-');
      return CORRECT_SCORE_ALLOWED.has(val);
    }

    // If no allowedValues specified, all values are allowed
    if (!config.allowedValues || config.allowedValues.length === 0) {
      return true;
    }

    // For Over/Under markets, check if value contains allowed lines
    if (normalized === 'Goals Over/Under') {
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
        const marketName = this.normalizeMarketName(apiMarketName);

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
    return Array.from(this.marketConfigCache.keys());
  }

  /**
   * Get market config by name
   */
  getMarketConfig(marketName: string): MarketConfig | undefined {
    return this.marketConfigCache.get(marketName);
  }
}
