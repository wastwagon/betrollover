import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { safeJson } from '../../common/fetch-json.util';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { getSportApiBaseUrl } from '../../config/sports.config';

export interface ApiRugbyGame {
  id: number;
  date: string;
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  league: { id: number; name: string };
  status: { short: string };
  scores?: { home: number; away: number };
}

@Injectable()
export class RugbyApiService {
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

  async getGames(date: string): Promise<ApiRugbyGame[]> {
    const key = await this.getApiKey();
    if (!key) return [];
    const base = getSportApiBaseUrl('rugby');
    const res = await fetch(`${base}/games?date=${date}`, {
      headers: { 'x-apisports-key': key },
    });
    const data = await safeJson<any>(res);
    if (data?.errors && Object.keys(data.errors).length > 0) return [];
    return (data?.response || []) as ApiRugbyGame[];
  }

  async getOdds(gameId: number): Promise<Array<{ marketName: string; marketValue: string; odds: number }>> {
    const key = await this.getApiKey();
    if (!key) return [];
    const base = getSportApiBaseUrl('rugby');
    const res = await fetch(`${base}/odds?game=${gameId}`, { headers: { 'x-apisports-key': key } });
    const data = await safeJson<any>(res);
    if (!data?.response || data.response.length === 0) return [];
    const result: Array<{ marketName: string; marketValue: string; odds: number }> = [];
    for (const item of data.response) {
      for (const bm of item?.bookmakers || []) {
        for (const bet of bm?.bets || []) {
          for (const v of bet?.values || []) {
            const odd = parseFloat(v?.odd);
            if (!Number.isNaN(odd) && odd > 0 && v?.value) {
              result.push({ marketName: bet?.name || 'Unknown', marketValue: v.value, odds: odd });
            }
          }
        }
      }
    }
    return result;
  }
}
