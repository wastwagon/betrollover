import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const API_BASE = 'https://v3.football.api-sports.io';
const PREDICTIONS_CACHE_TTL = 24 * 60 * 60; // 24 hours

/** Raw API-Football prediction with advice (for Smart Coupon strategy) */
export interface ApiPredictionWithAdvice {
  advice: string;
  percent: { home: string; draw: string; away: string };
  winner?: { name: string };
}

/** API-Football prediction for a single outcome (e.g. home win, over 2.5) */
export interface ApiPredictionOutcome {
  outcome: string; // 'home' | 'draw' | 'away' | 'over25' | 'under25' | 'btts'
  probability: number; // 0-1
  rawPercent?: number; // API may return 0-100
}

/** Parsed API-Football predictions for a fixture */
export interface ApiFixturePredictions {
  fixtureId: number;
  apiId: number;
  outcomes: ApiPredictionOutcome[];
}

/**
 * Fetches AI predictions from API-Football's /predictions endpoint.
 * Uses 6 algorithms (team form, H2H, etc.) - does NOT use bookmaker odds.
 * Typical accuracy: 70-75% match winner, 78-88% over/under.
 */
@Injectable()
export class ApiPredictionsService {
  private readonly logger = new Logger(ApiPredictionsService.name);

  constructor(
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async getApiKey(): Promise<string> {
    try {
      const apiSettings = await this.apiSettingsRepo.findOne({
        where: { id: 1 },
        select: ['apiSportsKey'],
      });
      return apiSettings?.apiSportsKey || process.env.API_SPORTS_KEY || '';
    } catch {
      return process.env.API_SPORTS_KEY || '';
    }
  }

  /**
   * Fetch predictions for a single fixture from API-Football.
   * Returns null if API unavailable or no predictions.
   */
  async getPredictionsForFixture(apiFixtureId: number): Promise<ApiFixturePredictions | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      this.logger.debug('No API key for predictions');
      return null;
    }

    try {
      const res = await fetch(`${API_BASE}/predictions?fixture=${apiFixtureId}`, {
        headers: { 'x-apisports-key': apiKey },
      });

      if (!res.ok) {
        this.logger.warn(`Predictions API error for fixture ${apiFixtureId}: ${res.status}`);
        return null;
      }

      const data = await res.json();
      const response = data?.response?.[0];
      if (!response?.predictions) {
        return null;
      }

      const outcomes = this.parsePredictionsResponse(response.predictions);
      if (outcomes.length === 0) return null;

      return {
        fixtureId: 0, // Caller will set from DB fixture
        apiId: apiFixtureId,
        outcomes,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to fetch predictions for fixture ${apiFixtureId}: ${err?.message}`);
      return null;
    }
  }

  /**
   * Parse API-Football predictions response.
   * Handles: predictions.winner, predictions.percent, predictions.goals, predictions.btts
   * API docs: https://www.api-football.com/documentation-v3
   */
  private parsePredictionsResponse(predictions: Record<string, unknown>): ApiPredictionOutcome[] {
    const outcomes: ApiPredictionOutcome[] = [];

    // Match winner: try winner.{home,draw,away} or percent.{home,draw,away}
    const winner = predictions?.winner as Record<string, string> | undefined;
    const percent = predictions?.percent as Record<string, string> | undefined;
    const homePct = winner?.home ?? percent?.home;
    const drawPct = winner?.draw ?? percent?.draw;
    const awayPct = winner?.away ?? percent?.away;
    if (homePct) {
      outcomes.push({ outcome: 'home', probability: this.parsePercent(homePct), rawPercent: this.parsePercent(homePct) * 100 });
    }
    if (drawPct) {
      outcomes.push({ outcome: 'draw', probability: this.parsePercent(drawPct), rawPercent: this.parsePercent(drawPct) * 100 });
    }
    if (awayPct) {
      outcomes.push({ outcome: 'away', probability: this.parsePercent(awayPct), rawPercent: this.parsePercent(awayPct) * 100 });
    }

    // Goals / over-under: { "over": "75%", "under": "25%" } or "over 2.5"/"under 2.5"
    const goals = predictions?.goals as Record<string, unknown> | undefined;
    if (goals) {
      const over = (goals.over as string) || (goals['over 2.5'] as string);
      const under = (goals.under as string) || (goals['under 2.5'] as string);
      if (over) {
        outcomes.push({
          outcome: 'over25',
          probability: this.parsePercent(over),
          rawPercent: this.parsePercent(over) * 100,
        });
      }
      if (under) {
        outcomes.push({
          outcome: 'under25',
          probability: this.parsePercent(under),
          rawPercent: this.parsePercent(under) * 100,
        });
      }
    }

    // BTTS: sometimes in predictions.btts or similar
    const btts = predictions?.btts as Record<string, string> | undefined;
    if (btts?.yes) {
      outcomes.push({
        outcome: 'btts',
        probability: this.parsePercent(btts.yes),
        rawPercent: this.parsePercent(btts.yes) * 100,
      });
    }

    return outcomes;
  }

  private parsePercent(val: string | number): number {
    if (typeof val === 'number') return Math.min(1, Math.max(0, val));
    const s = String(val || '').replace(/[^\d.]/g, '');
    const n = parseFloat(s);
    if (isNaN(n)) return 0;
    return Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
  }

  /**
   * Fetch raw prediction with advice for Smart Coupon strategy.
   * Cached 24 hours in Redis to minimize API calls.
   */
  async getPredictionWithAdvice(apiFixtureId: number): Promise<ApiPredictionWithAdvice | null> {
    const cacheKey = `prediction:advice:${apiFixtureId}`;
    const cached = await this.cacheManager.get<ApiPredictionWithAdvice>(cacheKey);
    if (cached) return cached;

    const apiKey = await this.getApiKey();
    if (!apiKey) return null;

    try {
      const res = await fetch(`${API_BASE}/predictions?fixture=${apiFixtureId}`, {
        headers: { 'x-apisports-key': apiKey },
      });
      if (!res.ok) return null;

      const data = await res.json();
      const response = data?.response?.[0];
      if (!response?.predictions) return null;

      const pred = response.predictions as Record<string, unknown>;
      const advice = (pred.advice as string) || '';
      const percent = (pred.percent as Record<string, string>) || {};
      const winner = pred.winner as Record<string, string> | undefined;

      const result: ApiPredictionWithAdvice = {
        advice,
        percent: {
          home: percent.home || winner?.home || '0',
          draw: percent.draw || winner?.draw || '0',
          away: percent.away || winner?.away || '0',
        },
        winner: winner ? { name: winner.name || '' } : undefined,
      };

      await this.cacheManager.set(cacheKey, result, PREDICTIONS_CACHE_TTL * 1000);
      return result;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch prediction advice for fixture ${apiFixtureId}: ${err?.message}`);
      return null;
    }
  }

  /**
   * Fetch predictions for multiple fixtures with rate limiting.
   * 1 request per fixture; add delay between requests to respect quota.
   */
  async getPredictionsForFixtures(
    fixtures: { id: number; apiId: number }[],
    delayMs = 100,
  ): Promise<Map<number, ApiFixturePredictions>> {
    const result = new Map<number, ApiFixturePredictions>();
    for (const f of fixtures) {
      const pred = await this.getPredictionsForFixture(f.apiId);
      if (pred) {
        pred.fixtureId = f.id;
        result.set(f.id, pred);
      }
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return result;
  }
}
