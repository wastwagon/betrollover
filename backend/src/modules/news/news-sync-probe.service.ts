import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { getSportApiBaseUrl } from '../../config/sports.config';
import { API_CALL_DELAY_MS } from '../../config/api-limits.config';
import {
  getNewsSyncProbeTargets,
  type NewsSyncProbeKind,
} from '../../config/news-sync.config';

export interface NewsSyncProbeResult {
  sport: string;
  kind: NewsSyncProbeKind;
  label: string;
  url: string;
  candidateOnly: boolean;
  httpStatus: number;
  ok: boolean;
  resultCount: number;
  sampleKeys: string[];
  apiErrors: string | null;
  message: string;
}

@Injectable()
export class NewsSyncProbeService {
  private readonly logger = new Logger(NewsSyncProbeService.name);

  constructor(
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
  ) {}

  private async getKey(): Promise<string> {
    try {
      const settings = await this.apiSettingsRepo.findOne({
        where: { id: 1 },
        select: ['apiSportsKey'],
      });
      return settings?.apiSportsKey || process.env.API_SPORTS_KEY || '';
    } catch {
      return process.env.API_SPORTS_KEY || '';
    }
  }

  async probe(): Promise<{ configured: boolean; results: NewsSyncProbeResult[] }> {
    const key = await this.getKey();
    if (!key) {
      return {
        configured: false,
        results: getNewsSyncProbeTargets().map((t) => ({
          sport: t.sport,
          kind: t.kind,
          label: t.label,
          url: `${getSportApiBaseUrl(t.sport)}${t.path}`,
          candidateOnly: !!t.candidateOnly,
          httpStatus: 0,
          ok: false,
          resultCount: 0,
          sampleKeys: [],
          apiErrors: 'API key not configured',
          message: 'Set API_SPORTS_KEY in Admin → Settings',
        })),
      };
    }

    const headers = { 'x-apisports-key': key };
    const results: NewsSyncProbeResult[] = [];

    for (const target of getNewsSyncProbeTargets()) {
      const url = `${getSportApiBaseUrl(target.sport)}${target.path}`;
      try {
        const res = await fetch(url, { headers });
        const data = (await res.json()) as {
          errors?: Record<string, string> | string;
          results?: number;
          response?: unknown[];
        };
        const apiErrors = data.errors
          ? typeof data.errors === 'string'
            ? data.errors
            : JSON.stringify(data.errors)
          : null;
        const response = Array.isArray(data.response) ? data.response : [];
        const first = response[0];
        const sampleKeys =
          first && typeof first === 'object' && first !== null
            ? Object.keys(first as Record<string, unknown>).slice(0, 12)
            : [];
        const resultCount = typeof data.results === 'number' ? data.results : response.length;
        const ok = res.ok && !apiErrors && (resultCount > 0 || response.length > 0);

        let message: string;
        if (apiErrors) {
          message = `API error: ${apiErrors}`;
        } else if (ok) {
          message = `${resultCount || response.length} row(s); keys: ${sampleKeys.join(', ') || 'n/a'}`;
        } else {
          message = 'Endpoint reachable but returned no injury/transfer rows for this query';
        }

        results.push({
          sport: target.sport,
          kind: target.kind,
          label: target.label,
          url,
          candidateOnly: !!target.candidateOnly,
          httpStatus: res.status,
          ok,
          resultCount: resultCount || response.length,
          sampleKeys,
          apiErrors,
          message,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`News sync probe failed for ${target.label}: ${msg}`);
        results.push({
          sport: target.sport,
          kind: target.kind,
          label: target.label,
          url,
          candidateOnly: !!target.candidateOnly,
          httpStatus: 0,
          ok: false,
          resultCount: 0,
          sampleKeys: [],
          apiErrors: msg,
          message: `Request failed: ${msg}`,
        });
      }
      await new Promise((r) => setTimeout(r, API_CALL_DELAY_MS));
    }

    return { configured: true, results };
  }
}
