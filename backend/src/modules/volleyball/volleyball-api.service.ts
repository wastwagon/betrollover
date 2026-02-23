import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { safeJson } from '../../common/fetch-json.util';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { getSportApiBaseUrl } from '../../config/sports.config';

export interface ApiVolleyballGame {
  id: number;
  date: string;
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  league: { id: number; name: string };
  status: { short: string };
  scores?: { home: number; away: number };
}

@Injectable()
export class VolleyballApiService {
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

  async getGames(date: string): Promise<ApiVolleyballGame[]> {
    const key = await this.getApiKey();
    if (!key) return [];
    const base = getSportApiBaseUrl('volleyball');
    const res = await fetch(`${base}/games?date=${date}`, {
      headers: { 'x-apisports-key': key },
    });
    const data = await safeJson<any>(res);
    if (data?.errors && Object.keys(data.errors).length > 0) return [];
    return (data?.response || []) as ApiVolleyballGame[];
  }

  async getOdds(gameId: number): Promise<Array<{ marketName: string; marketValue: string; odds: number }>> {
    const key = await this.getApiKey();
    if (!key) return [];
    const base = getSportApiBaseUrl('volleyball');
    const res = await fetch(`${base}/odds?game=${gameId}`, { headers: { 'x-apisports-key': key } });
    const data = await safeJson<any>(res);
    if (!data?.response || data.response.length === 0) return [];

    // Only extract the "Home/Away" (match winner) market from the first bookmaker
    // that has it. Rename to "Match Winner" for consistency with Odds API sports.
    const HOME_AWAY_NAMES = ['Home/Away', 'Winner', 'Match Winner', '1X2', 'Home or Away'];

    for (const item of data.response) {
      for (const bm of item?.bookmakers || []) {
        for (const bet of bm?.bets || []) {
          if (!HOME_AWAY_NAMES.some((n) => bet?.name?.toLowerCase().includes(n.toLowerCase()))) continue;
          // Only keep Home and Away values (skip Draw for volleyball — teams win sets)
          const outcomes: Array<{ marketName: string; marketValue: string; odds: number }> = [];
          for (const v of bet?.values || []) {
            const odd = parseFloat(v?.odd);
            const val = (v?.value || '').toString();
            if (!Number.isNaN(odd) && odd > 0 && val && !val.toLowerCase().includes('draw')) {
              outcomes.push({ marketName: 'Match Winner', marketValue: val, odds: odd });
            }
          }
          if (outcomes.length >= 2) return outcomes; // Got a clean home/away pair — stop here
        }
      }
    }
    return [];
  }
}
