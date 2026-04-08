import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getSportApiBaseUrl } from '../../config/sports.config';
import { PREDICTION_API_DELAY_MS } from '../../config/api-limits.config';
import {
  parseApiFootballPredictionsOutcomes,
  type ApiPredictionOutcome,
} from './api-football-predictions.parser';

export type { ApiPredictionOutcome };

const PREDICTIONS_CACHE_TTL = 24 * 60 * 60; // 24 hours

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
      const res = await fetch(`${getSportApiBaseUrl('football')}/predictions?fixture=${apiFixtureId}`, {
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

      const outcomes = parseApiFootballPredictionsOutcomes(response.predictions as Record<string, unknown>);
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
   * Fetch predictions for multiple fixtures with rate limiting.
   * 1 request per fixture; add delay between requests to respect quota.
   */
  async getPredictionsForFixtures(
    fixtures: { id: number; apiId: number }[],
    delayMs = PREDICTION_API_DELAY_MS,
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
