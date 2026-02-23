import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { safeJson } from '../../common/fetch-json.util';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { getSportApiBaseUrl } from '../../config/sports.config';

export interface ApiMmaFight {
  id: number;
  date: string;
  slug: string;
  category: string;
  status: { short: string };
  fighters: {
    first: { id: number; name: string; winner?: boolean };
    second: { id: number; name: string; winner?: boolean };
  };
}

@Injectable()
export class MmaApiService {
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

  async getFights(date: string): Promise<ApiMmaFight[]> {
    const key = await this.getApiKey();
    if (!key) return [];
    const base = getSportApiBaseUrl('mma');
    const res = await fetch(`${base}/fights?date=${date}`, {
      headers: { 'x-apisports-key': key },
    });
    const data = await safeJson<any>(res);
    if (data?.errors && Object.keys(data.errors).length > 0) return [];
    return (data?.response || []) as ApiMmaFight[];
  }

  async getOdds(fightId: number): Promise<Array<{ marketName: string; marketValue: string; odds: number }>> {
    const key = await this.getApiKey();
    if (!key) return [];
    const base = getSportApiBaseUrl('mma');
    const res = await fetch(`${base}/odds?fight=${fightId}`, { headers: { 'x-apisports-key': key } });
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
