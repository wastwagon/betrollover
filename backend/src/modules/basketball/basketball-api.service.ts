import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { safeJson } from '../../common/fetch-json.util';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { getSportApiBaseUrl } from '../../config/sports.config';

/** API-Sports Basketball game item */
export interface ApiBasketballGame {
  id: number;
  date: string;
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  league: { id: number; name: string };
  status: { short: string };
  scores?: { home: { total?: number }; away: { total?: number } };
}

/** API-Sports Basketball odds bookmaker bet value */
export interface ApiOddsValue {
  value: string;
  odd: string;
}

@Injectable()
export class BasketballApiService {
  private readonly logger = new Logger(BasketballApiService.name);

  constructor(
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
  ) {}

  private async getApiKey(): Promise<string> {
    const apiSettings = await this.apiSettingsRepo.findOne({
      where: { id: 1 },
      select: ['apiSportsKey'],
    });
    return apiSettings?.apiSportsKey || process.env.API_SPORTS_KEY || '';
  }

  /** Fetch games for a date. Returns empty array on error. */
  async getGames(date: string): Promise<ApiBasketballGame[]> {
    const key = await this.getApiKey();
    if (!key) return [];

    const base = getSportApiBaseUrl('basketball');
    const res = await fetch(`${base}/games?date=${date}`, {
      headers: { 'x-apisports-key': key },
    });
    const data = await safeJson<any>(res);
    if (data?.errors && Object.keys(data.errors).length > 0) {
      this.logger.warn(`Basketball API error for ${date}: ${JSON.stringify(data.errors)}`);
      return [];
    }
    const raw = data?.response || [];
    return raw as ApiBasketballGame[];
  }

  /** Fetch odds for a game. Returns bookmakers[].bets[].values[]. */
  async getOdds(gameId: number): Promise<Array<{ marketName: string; marketValue: string; odds: number }>> {
    const key = await this.getApiKey();
    if (!key) return [];

    const base = getSportApiBaseUrl('basketball');
    const res = await fetch(`${base}/odds?game=${gameId}`, {
      headers: { 'x-apisports-key': key },
    });
    const data = await safeJson<any>(res);
    if (!data?.response || data.response.length === 0) return [];

    const result: Array<{ marketName: string; marketValue: string; odds: number }> = [];
    const items = data.response;
    for (const item of items) {
      const bookmakers = item?.bookmakers || [];
      for (const bm of bookmakers) {
        const bets = bm?.bets || [];
        for (const bet of bets) {
          const name = bet?.name || 'Unknown';
          const values = bet?.values || [];
          for (const v of values as ApiOddsValue[]) {
            const odd = parseFloat(v?.odd);
            if (!Number.isNaN(odd) && odd > 0 && v?.value) {
              result.push({ marketName: name, marketValue: v.value, odds: odd });
            }
          }
        }
      }
    }
    return result;
  }
}
