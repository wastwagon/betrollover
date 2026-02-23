import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { getSportApiBaseUrl } from '../../config/sports.config';

export interface ApiFootballFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { name: string; country: string };
  teams: { home: { name: string }; away: { name: string } };
  goals?: { home: number | null; away: number | null };
}

@Injectable()
export class FootballService {
  constructor(
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async getKey(): Promise<string> {
    // Try database first, then fall back to environment variable
    const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
    if (apiSettings?.apiSportsKey) {
      return apiSettings.apiSportsKey;
    }
    return process.env.API_SPORTS_KEY || '';
  }

  private async updateUsage(headers: Headers): Promise<void> {
    const rateLimitRemaining = headers.get('x-ratelimit-requests-remaining');
    const rateLimitLimit = headers.get('x-ratelimit-requests-limit');
    
    if (rateLimitRemaining !== null && rateLimitLimit !== null) {
      const apiSettings = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
      if (apiSettings) {
        apiSettings.dailyRequestsUsed = parseInt(rateLimitLimit, 10) - parseInt(rateLimitRemaining, 10);
        apiSettings.dailyRequestsLimit = parseInt(rateLimitLimit, 10);
        apiSettings.lastRequestDate = new Date();
        await this.apiSettingsRepo.save(apiSettings);
      }
    }
  }

  async getFixtures(date?: string, leagueId?: number): Promise<ApiFootballFixture[]> {
    const key = await this.getKey();
    if (!key) {
      return [];
    }
    
    const d = date || new Date().toISOString().split('T')[0];
    const cacheKey = `fixtures:date:${d}:league:${leagueId || 'all'}`;
    
    // Check cache first (Cache-Aside Pattern)
    const cached = await this.cacheManager.get<ApiFootballFixture[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Cache miss - fetch from API
    let url = `${getSportApiBaseUrl('football')}/fixtures?date=${d}`;
    if (leagueId) {
      url += `&league=${leagueId}`;
    }
    
    const res = await fetch(url, {
      headers: { 'x-apisports-key': key },
    });
    
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status}`);
    }
    
    await this.updateUsage(res.headers);
    const data = await res.json();
    const fixtures = data.response || [];
    
    // Cache for 1 hour (fixtures don't change frequently)
    await this.cacheManager.set(cacheKey, fixtures, 3600);
    
    return fixtures;
  }

  async getLeagues(): Promise<unknown[]> {
    const key = await this.getKey();
    if (!key) return [];
    
    // Cache leagues for 7 days (they rarely change)
    const cacheKey = 'leagues:current';
    const cached = await this.cacheManager.get<unknown[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const res = await fetch(
      `${getSportApiBaseUrl('football')}/leagues?type=league&current=true`,
      { headers: { 'x-apisports-key': key } }
    );
    
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status}`);
    }
    
    await this.updateUsage(res.headers);
    const data = await res.json();
    const leagues = data.response || [];
    
    // Cache for 7 days
    await this.cacheManager.set(cacheKey, leagues, 7 * 24 * 3600);
    
    return leagues;
  }
}
