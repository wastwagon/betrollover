import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsArticle } from './entities/news-article.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { getSportApiBaseUrl, isSportEnabled } from '../../config/sports.config';
import { API_CALL_DELAY_MS } from '../../config/api-limits.config';
import { NEWS_INJURIES_SYNC, resolveNewsSyncSeason } from '../../config/news-sync.config';

interface InjuryPlayer {
    id: number;
    name: string;
    type: string;
    reason: string;
}

interface InjuryTeam {
    id: number;
    name: string;
}

interface Injury {
    player: InjuryPlayer;
    team: InjuryTeam;
    fixture: {
        id: number;
        date: string;
    };
}

interface InjuriesResponse {
    response?: Injury[];
    errors?: Record<string, string>;
}

@Injectable()
export class InjuriesSyncService {
    private readonly logger = new Logger(InjuriesSyncService.name);

    constructor(
        @InjectRepository(NewsArticle)
        private newsRepo: Repository<NewsArticle>,
        @InjectRepository(ApiSettings)
        private apiSettingsRepo: Repository<ApiSettings>,
        private configService: ConfigService,
    ) { }

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

    private async fetchInjuriesForLeague(
        sport: 'football',
        leagueId: number,
        season: number,
        headers: Record<string, string>,
    ): Promise<Injury[]> {
        const url = `${getSportApiBaseUrl(sport)}/injuries?league=${leagueId}&season=${season}`;
        const res = await fetch(url, { headers });
        const data = (await res.json()) as InjuriesResponse;
        if (data.errors && Object.keys(data.errors).length > 0) {
            throw new Error(`API error: ${JSON.stringify(data.errors)}`);
        }
        return data.response || [];
    }

    /** Sync real injuries from API-Sports into news_articles (per sport config). */
    async sync(): Promise<{ added: number; skipped: number; errors: string[]; bySport: Record<string, number> }> {
        const key = await this.getKey();
        if (!key) {
            this.logger.warn('API_SPORTS_KEY not set.');
            return { added: 0, skipped: 0, errors: ['API key not configured'], bySport: {} };
        }

        const headers = { 'x-apisports-key': key };
        let added = 0;
        let skipped = 0;
        const errors: string[] = [];
        const bySport: Record<string, number> = {};

        for (const cfg of NEWS_INJURIES_SYNC) {
            if (!isSportEnabled(cfg.sport)) continue;
            bySport[cfg.sport] = 0;
            const season = resolveNewsSyncSeason(cfg.seasonMode);

            this.logger.log(`Syncing ${cfg.sport} injuries (${cfg.leagueIds.length} leagues, season ${season})...`);

            for (const leagueId of cfg.leagueIds) {
                try {
                    const injuries = await this.fetchInjuriesForLeague(cfg.sport as 'football', leagueId, season, headers);
                    for (const inj of injuries) {
                        const { player, team, fixture } = inj;
                        if (!player.name || !team.name) continue;

                        const publishedAt = fixture.date ? new Date(fixture.date) : new Date();
                        const dateStr = publishedAt.toISOString().split('T')[0];

                        const slug = this.slugify(`injury-${player.id}-${team.id}-${dateStr}`);

                        const existing = await this.newsRepo.findOne({ where: { slug, language: 'en' } });
                        if (existing) {
                            skipped++;
                            continue;
                        }

                        const reason = player.reason || 'an undisclosed issue';
                        const type = player.type || 'Missing Fixture';

                        const title = `${player.name} sidelined for ${team.name}`;
                        const excerpt = `${player.name} is listed as ${type.toLowerCase()} for the upcoming fixture due to ${reason.toLowerCase()}.`;
                        const content = `Team news update: ${player.name} will be unavailable for ${team.name}'s upcoming match. The player is currently classified as "${type}" due to ${reason.toLowerCase()}. This status was confirmed ahead of the fixture on ${dateStr}.`;

                        await this.newsRepo.save(
                            this.newsRepo.create({
                                slug,
                                title,
                                excerpt,
                                content,
                                category: 'injury',
                                sport: cfg.sport,
                                featured: false,
                                metaDescription: title,
                                publishedAt,
                            }),
                        );
                        added++;
                        bySport[cfg.sport]++;
                    }
                } catch (err: any) {
                    const msg = err?.message || String(err);
                    errors.push(`${cfg.sport} league ${leagueId}: ${msg}`);
                    this.logger.warn(`Injuries sync ${cfg.sport} league ${leagueId}: ${msg}`);
                }
                await new Promise((r) => setTimeout(r, API_CALL_DELAY_MS));
            }
        }

        this.logger.log(`Injuries sync complete: ${added} new articles added, ${skipped} skipped`);
        return { added, skipped, errors, bySport };
    }

    /** Runs daily at 1:05 AM - syncs real injuries from API-Football */
    @Cron('5 1 * * *') // 1:05 AM — after predictions (API-Sports)
    async handleDailySync(): Promise<void> {
        if (this.configService.get('ENABLE_SCHEDULING') !== 'true') return;
        const result = await this.sync();
        if (result.added > 0) {
            this.logger.log(`Daily injuries sync: ${result.added} new articles`);
        }
    }
}
