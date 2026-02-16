import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsArticle } from './entities/news-article.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';

const API_BASE = 'https://v3.football.api-sports.io';

// Major club team IDs from API-Football
const MAJOR_TEAM_IDS = [
  33, 40, 42, 47, 49, 50, 529, 541, 157, 489, 505, 492, 165, 116, 113, 81, 82,
]; // Man Utd, Liverpool, Arsenal, Spurs, Chelsea, Man City, Barcelona, Real Madrid, Bayern, etc.

interface TransferPlayer {
  id: number;
  name: string;
}

interface TransferTeam {
  id: number;
  name: string;
}

interface Transfer {
  player: TransferPlayer;
  update?: string;
  date: string;
  type?: string;
  teams: {
    in: TransferTeam;
    out: TransferTeam;
  };
}

interface TransfersResponse {
  response?: { player: TransferPlayer; update?: string; transfers: Transfer[] }[];
  errors?: Record<string, string>;
}

@Injectable()
export class TransfersSyncService {
  private readonly logger = new Logger(TransfersSyncService.name);

  constructor(
    @InjectRepository(NewsArticle)
    private newsRepo: Repository<NewsArticle>,
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

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90);
  }

  private async fetchTransfersForTeam(teamId: number, season: number, headers: Record<string, string>): Promise<Transfer[]> {
    const url = `${API_BASE}/transfers?team=${teamId}&season=${season}`;
    const res = await fetch(url, { headers });
    const data = (await res.json()) as TransfersResponse;
    if (data.errors && Object.keys(data.errors).length > 0) {
      throw new Error(`API error: ${JSON.stringify(data.errors)}`);
    }
    const list = data.response || [];
    const all: Transfer[] = [];
    for (const item of list) {
      for (const t of item.transfers || []) {
        if (t?.teams?.in && t?.teams?.out && t?.player?.name) {
          all.push(t);
        }
      }
    }
    return all;
  }

  /** Sync real transfers from API-Football into news_articles */
  async sync(): Promise<{ added: number; skipped: number; errors: string[] }> {
    const key = await this.getKey();
    if (!key) {
      this.logger.warn('API_SPORTS_KEY not set. Configure in Admin → Settings or .env');
      return { added: 0, skipped: 0, errors: ['API key not configured'] };
    }

    const headers = { 'x-apisports-key': key };
    const currentYear = new Date().getFullYear();
    const currentSeason = new Date().getMonth() >= 6 ? currentYear : currentYear - 1;
    const seasons = [currentSeason, currentSeason - 1]; // Current + previous season
    const seen = new Set<string>();
    let added = 0;
    const errors: string[] = [];

    this.logger.log(`Syncing transfers for seasons ${seasons.join(', ')}...`);

    for (const season of seasons) {
      for (const teamId of MAJOR_TEAM_IDS) {
        try {
          const transfers = await this.fetchTransfersForTeam(teamId, season, headers);
          for (const t of transfers) {
            const dedupKey = `${t.player.id}-${t.teams.out.id}-${t.teams.in.id}-${t.date}`;
            if (seen.has(dedupKey)) continue;
            seen.add(dedupKey);

            const player = t.player.name;
            const fromTeam = t.teams.out.name;
            const toTeam = t.teams.in.name;
            const fee = t.type || 'Undisclosed';
            const dateStr = t.date;

            const slug = this.slugify(`${player}-${toTeam}-${dateStr}`);
            const existing = await this.newsRepo.findOne({ where: { slug } });
            if (existing) continue;

            const title = `${player} completes move from ${fromTeam} to ${toTeam}`;
            const excerpt =
              fee !== 'N/A' && fee !== 'Free' && fee
                ? `The transfer has been confirmed. Reported fee: ${fee}.`
                : 'The transfer has been confirmed.';
            const content =
              fee !== 'N/A' && fee !== 'Free' && fee
                ? `${player} has completed a move from ${fromTeam} to ${toTeam}. The transfer was confirmed on ${dateStr}. The transfer fee is reported as ${fee}.`
                : `${player} has completed a move from ${fromTeam} to ${toTeam}. The transfer was confirmed on ${dateStr}.`;

            const publishedAt = dateStr ? new Date(dateStr) : new Date();
            if (isNaN(publishedAt.getTime())) continue;

            await this.newsRepo.save(
              this.newsRepo.create({
                slug,
                title,
                excerpt,
                content,
                category: 'confirmed_transfer',
                featured: false,
                metaDescription: title,
                publishedAt,
              }),
            );
            added++;
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          errors.push(`Team ${teamId} season ${season}: ${msg}`);
          this.logger.warn(`Transfers sync team ${teamId}: ${msg}`);
        }
        await new Promise((r) => setTimeout(r, 350)); // rate limit
      }
    }

    this.logger.log(`Transfers sync complete: ${added} new articles added`);
    return { added, skipped: seen.size - added, errors };
  }

  /** Runs daily at 6 AM - syncs real transfers from API-Football */
  @Cron('0 6 * * *')
  async handleDailySync(): Promise<void> {
    const result = await this.sync();
    if (result.added > 0) {
      this.logger.log(`Daily transfers sync: ${result.added} new articles`);
    }
  }
}
