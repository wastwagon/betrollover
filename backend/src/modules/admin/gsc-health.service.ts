import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsService } from '../news/news.service';
import { AccumulatorsService } from '../accumulators/accumulators.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserRole } from '../users/entities/user.entity';
import { isClassicAiHiddenFromPublic } from '../../common/classic-ai-public-visibility.util';
import {
  firstMatchPathInSitemapXml,
  validateSportsEventJsonLdInHtml,
} from './gsc-sports-event-jsonld.util';

/** URLs that appeared in Google Search Console (robots / 5xx reports). */
const GSC_WATCH_PAGES: { id: string; label: string; path: string; require200?: boolean }[] = [
  { id: 'league-tables', label: 'League tables hub', path: '/league-tables', require200: true },
  { id: 'news-hub', label: 'News hub', path: '/news', require200: true },
  { id: 'news-injury-1844', label: 'Injury article (GSC sample)', path: '/news/injury-1844-487-2026-04-13' },
  { id: 'news-injury-46941', label: 'Injury article (GSC sample)', path: '/news/injury-46941-539-2026-04-13' },
  { id: 'news-injury-47299', label: 'Injury article (GSC sample)', path: '/news/injury-47299-531-2026-04-12' },
  { id: 'news-injury-21997', label: 'Injury article (GSC sample)', path: '/news/injury-21997-533-2026-04-12' },
  { id: 'news-injury-748', label: 'Injury article (GSC sample)', path: '/news/injury-748-541-2026-03-22' },
  { id: 'coupon-7597', label: 'Coupon (GSC 5xx sample)', path: '/coupons/7597' },
  { id: 'buy-football-tips', label: 'Buy football tips (GSC discovered)', path: '/buy-football-tips', require200: true },
  { id: 'acca-generator', label: 'Acca Generator (GSC noindex sample)', path: '/acca-generator', require200: true },
  { id: 'tipster-steadyeddie', label: 'Tipster SteadyEddie (GSC noindex)', path: '/tipsters/SteadyEddie', require200: true },
  { id: 'tipster-steadyeddie-fr', label: 'Tipster SteadyEddie FR', path: '/fr/tipsters/SteadyEddie', require200: true },
  { id: 'tipster-epl', label: 'Tipster PremierLeaguePro (GSC noindex)', path: '/tipsters/PremierLeaguePro', require200: true },
  { id: 'tipster-acca-high-o25', label: 'Tipster AccaHighO25 (GSC soft 404)', path: '/tipsters/AccaHighO25', require200: true },
];

const GSC_API_NEWS_SLUGS = GSC_WATCH_PAGES
  .filter((p) => p.path.startsWith('/news/') && p.path !== '/news')
  .map((p) => p.path.replace(/^\/news\//, ''));

const FETCH_TIMEOUT_MS = 20_000;
const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

export type GscProbeRow = {
  id: string;
  label: string;
  url: string;
  layer: 'public' | 'api';
  ok: boolean;
  status: number | null;
  durationMs: number;
  robotsAllowed: boolean | null;
  indexable: boolean | null;
  detail?: string;
};

export type GscIndexingContext = {
  classicAiHiddenFromPublic: boolean;
  sitemapUrlCount: number | null;
  sitemapFetchError?: string;
  /** Matches web/lib/seo/sitemap-limits.ts — for admin vs GSC “Discovered” backlog. */
  sitemapPolicy: {
    couponMax: number;
    matchMax: number;
    newsMax: number;
    deepLinksEnglishOnly: boolean;
  };
};

export type GscHealthReport = {
  checkedAt: string;
  siteOrigin: string;
  summary: { total: number; ok: number; failed: number };
  probes: GscProbeRow[];
  indexing: GscIndexingContext;
};

type RobotsGroup = { agents: string[]; allow: string[]; disallow: string[] };

function siteOrigin(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://betrollover.com';
  return raw.replace(/\/$/, '');
}

function parseRobotsGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      const ua = value.toLowerCase();
      if (current && (current.allow.length > 0 || current.disallow.length > 0)) {
        groups.push(current);
        current = null;
      }
      if (!current) current = { agents: [], allow: [], disallow: [] };
      current.agents.push(ua);
    } else if (current) {
      if (field === 'allow') current.allow.push(value || '/');
      if (field === 'disallow') current.disallow.push(value);
    }
  }
  if (current) groups.push(current);
  return groups;
}

/** Longest-prefix match (simplified Google robots rules). */
export function isPathAllowedByRobots(robotsText: string, pathname: string, userAgent = 'googlebot'): boolean {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const ua = userAgent.toLowerCase();
  const groups = parseRobotsGroups(robotsText);

  const applicable = groups.filter((g) =>
    g.agents.some((a) => a === '*' || ua.includes(a) || a.includes(ua)),
  );
  const rules = applicable.length > 0 ? applicable : groups.filter((g) => g.agents.includes('*'));

  let bestAllow = -1;
  let bestDisallow = -1;

  for (const g of rules) {
    for (const rule of g.allow) {
      const prefix = rule || '/';
      if (path.startsWith(prefix) && prefix.length > bestAllow) bestAllow = prefix.length;
    }
    for (const rule of g.disallow) {
      if (rule === '' || rule === undefined) continue;
      if (path.startsWith(rule) && rule.length > bestDisallow) bestDisallow = rule.length;
    }
  }

  if (bestDisallow < 0) return true;
  return bestAllow >= bestDisallow;
}

function htmlLooksIndexable(snippet: string): boolean {
  const head = snippet.slice(0, 12_000).toLowerCase();
  if (head.includes('name="robots"') && /content="[^"]*noindex/i.test(head)) return false;
  if (head.includes("name='robots'") && /content='[^']*noindex/i.test(head)) return false;
  return true;
}

@Injectable()
export class GscHealthService {
  private readonly logger = new Logger(GscHealthService.name);
  private lastReport: GscHealthReport | null = null;

  constructor(
    private readonly newsService: NewsService,
    private readonly accumulatorsService: AccumulatorsService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  getLastReport(): GscHealthReport | null {
    return this.lastReport;
  }

  async runCheck(persist = true): Promise<GscHealthReport> {
    const origin = siteOrigin();
    const probes: GscProbeRow[] = [];

    let robotsText: string | null = null;
    const robotsUrl = `${origin}/robots.txt`;

    probes.push(await this.probePublic(origin, 'robots-txt', 'robots.txt', '/robots.txt', async (res, body) => {
      robotsText = body;
      const hasSitemap = /sitemap:\s*https?:\/\//i.test(body);
      const leagueOk = isPathAllowedByRobots(body, '/league-tables');
      const newsOk = isPathAllowedByRobots(body, '/news/injury-1844-487-2026-04-13');
      const ok = res.ok && hasSitemap && leagueOk && newsOk;
      return {
        ok,
        robotsAllowed: leagueOk && newsOk,
        indexable: null,
        detail: !hasSitemap
          ? 'Missing Sitemap directive'
          : !leagueOk
            ? '/league-tables blocked for Googlebot'
            : !newsOk
              ? 'Sample /news/ URL blocked for Googlebot'
              : undefined,
      };
    }));

    probes.push(
      await this.probePublic(origin, 'sitemap', 'Sitemap', '/sitemap.xml', async (res) => ({
        ok: res.ok,
        robotsAllowed: robotsText ? isPathAllowedByRobots(robotsText, '/sitemap.xml') : null,
        indexable: null,
        detail: res.ok ? undefined : 'Sitemap not reachable',
      })),
    );

    for (const page of GSC_WATCH_PAGES) {
      probes.push(
        await this.probePublic(origin, page.id, page.label, page.path, async (res, body) => {
          const robotsAllowed =
            robotsText != null ? isPathAllowedByRobots(robotsText, page.path) : null;
          const indexable = res.ok && body ? htmlLooksIndexable(body) : null;
          let detail: string | undefined;
          if (res.status >= 500) detail = 'Server error (5xx)';
          else if (robotsAllowed === false) detail = 'Blocked by robots.txt for Googlebot';
          else if (indexable === false) detail = 'meta robots noindex';
          else if (res.status === 404) detail = 'Not found (404) — OK if removed';

          const noServerError = res.status > 0 && res.status < 500;
          const ok =
            robotsAllowed !== false &&
            indexable !== false &&
            (page.require200 ? res.status === 200 : noServerError);
          return { ok, robotsAllowed, indexable, detail };
        }),
      );
    }

    for (const slug of GSC_API_NEWS_SLUGS) {
      probes.push(await this.probeNewsApi(slug, origin));
    }

    probes.push(await this.probeCouponApi(7597, origin));

    const matchProbe = await this.probeMatchSportsEventSchema(origin, robotsText);
    if (matchProbe) probes.push(matchProbe);

    const sitemapStats = await this.fetchLiveSitemapUrlCount(origin);

    const failed = probes.filter((p) => !p.ok).length;
    const report: GscHealthReport = {
      checkedAt: new Date().toISOString(),
      siteOrigin: origin,
      summary: { total: probes.length, ok: probes.length - failed, failed },
      probes,
      indexing: {
        classicAiHiddenFromPublic: isClassicAiHiddenFromPublic(),
        sitemapUrlCount: sitemapStats.count,
        sitemapFetchError: sitemapStats.error,
        sitemapPolicy: {
          couponMax: 200,
          matchMax: 48,
          newsMax: 150,
          deepLinksEnglishOnly: true,
        },
      },
    };

    if (persist) this.lastReport = report;

    for (const p of probes.filter((x) => !x.ok)) {
      this.logger.warn(
        `[GscHealth] FAIL ${p.layer} ${p.id} status=${p.status ?? '—'} ${p.detail ?? ''} ${p.url}`,
      );
    }

    if (failed > 0) {
      this.logger.warn(`[GscHealth] ${failed}/${probes.length} probes failed (${origin})`);
    } else {
      this.logger.log(`[GscHealth] All ${probes.length} probes OK (${origin})`);
    }

    return report;
  }

  /** Daily smoke test — logs and notifies admins on hard failures (5xx / robots / API errors). */
  @Cron('15 6 * * *')
  async scheduledCheck(): Promise<void> {
    const report = await this.runCheck(true);
    const critical = report.probes.filter(
      (p) =>
        !p.ok &&
        (p.status == null || p.status >= 500 || p.robotsAllowed === false || p.layer === 'api'),
    );
    if (critical.length === 0) return;

    const admins = await this.userRepo.find({
      where: { role: UserRole.ADMIN },
      select: ['id'],
    });

    const message = `GSC health: ${critical.length} issue(s) — ${critical
      .slice(0, 4)
      .map((p) => `${p.label} (${p.detail || p.status})`)
      .join('; ')}${critical.length > 4 ? '…' : ''}. Open Admin → SEO / GSC.`;

    await Promise.all(
      admins.map((admin) =>
        this.notificationsService
          .create({
            userId: admin.id,
            type: 'system',
            title: 'Search indexing health',
            message,
            link: '/admin/seo',
            icon: 'warning',
          })
          .catch((err) => this.logger.error(`Failed to notify admin ${admin.id}`, err)),
      ),
    );
  }

  private async probePublic(
    origin: string,
    id: string,
    label: string,
    path: string,
    evaluate: (
      res: Response,
      body: string,
    ) => Promise<{
      ok: boolean;
      robotsAllowed: boolean | null;
      indexable: boolean | null;
      detail?: string;
    }>,
  ): Promise<GscProbeRow> {
    const url = `${origin}${path}`;
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': GOOGLEBOT_UA, Accept: 'text/html,application/xml,text/plain,*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const body = await res.text();
      const verdict = await evaluate(res, body);
      return {
        id,
        label,
        url,
        layer: 'public',
        ok: verdict.ok,
        status: res.status,
        durationMs: Date.now() - started,
        robotsAllowed: verdict.robotsAllowed,
        indexable: verdict.indexable,
        detail: verdict.detail,
      };
    } catch (err) {
      return {
        id,
        label,
        url,
        layer: 'public',
        ok: false,
        status: null,
        durationMs: Date.now() - started,
        robotsAllowed: null,
        indexable: null,
        detail: (err as Error)?.message ?? 'Fetch failed',
      };
    }
  }

  private async probeNewsApi(slug: string, origin: string): Promise<GscProbeRow> {
    const started = Date.now();
    const url = `${origin}/news/${slug}`;
    try {
      await this.newsService.getBySlugOrFail(slug, 'en');
      return {
        id: `api-news-${slug}`,
        label: `API news: ${slug}`,
        url,
        layer: 'api',
        ok: true,
        status: 200,
        durationMs: Date.now() - started,
        robotsAllowed: null,
        indexable: null,
      };
    } catch (e) {
      const is404 = e instanceof NotFoundException;
      return {
        id: `api-news-${slug}`,
        label: `API news: ${slug}`,
        url,
        layer: 'api',
        ok: is404,
        status: is404 ? 404 : 500,
        durationMs: Date.now() - started,
        robotsAllowed: null,
        indexable: null,
        detail: is404 ? 'Article missing (404)' : 'API error (would 5xx)',
      };
    }
  }

  private async probeCouponApi(id: number, origin: string): Promise<GscProbeRow> {
    const started = Date.now();
    const url = `${origin}/coupons/${id}`;
    try {
      const coupon = await this.accumulatorsService.getByIdPublic(id);
      if (!coupon) {
        return {
          id: `api-coupon-${id}`,
          label: `API coupon ${id}`,
          url,
          layer: 'api',
          ok: true,
          status: 404,
          durationMs: Date.now() - started,
          robotsAllowed: null,
          indexable: null,
          detail: 'Not public (404) — no 5xx',
        };
      }
      return {
        id: `api-coupon-${id}`,
        label: `API coupon ${id}`,
        url,
        layer: 'api',
        ok: true,
        status: 200,
        durationMs: Date.now() - started,
        robotsAllowed: null,
        indexable: null,
      };
    } catch (e) {
      return {
        id: `api-coupon-${id}`,
        label: `API coupon ${id}`,
        url,
        layer: 'api',
        ok: false,
        status: 500,
        durationMs: Date.now() - started,
        robotsAllowed: null,
        indexable: null,
        detail: (e as Error)?.message ?? 'API error (would 5xx)',
      };
    }
  }

  private async probeMatchSportsEventSchema(
    origin: string,
    robotsText: string | null,
  ): Promise<GscProbeRow | null> {
    let sitemapXml: string | null = null;
    try {
      const res = await fetch(`${origin}/sitemap.xml`, {
        headers: { 'User-Agent': GOOGLEBOT_UA, Accept: 'application/xml,text/xml,*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) sitemapXml = await res.text();
    } catch {
      return null;
    }

    const path = sitemapXml ? firstMatchPathInSitemapXml(sitemapXml) : null;
    if (!path) {
      return {
        id: 'match-sports-event',
        label: 'Match SportsEvent (GSC Events)',
        url: `${origin}/matches/`,
        layer: 'public',
        ok: false,
        status: null,
        durationMs: 0,
        robotsAllowed: null,
        indexable: null,
        detail: 'No /matches/ URL in sitemap to sample',
      };
    }

    return this.probePublic(origin, 'match-sports-event', 'Match SportsEvent (GSC Events)', path, async (res, body) => {
      const robotsAllowed = robotsText != null ? isPathAllowedByRobots(robotsText, path) : null;
      if (!res.ok) {
        return {
          ok: false,
          robotsAllowed,
          indexable: null,
          detail: res.status >= 500 ? 'Server error (5xx)' : `HTTP ${res.status}`,
        };
      }
      const schema = validateSportsEventJsonLdInHtml(body);
      return {
        ok: schema.ok && robotsAllowed !== false,
        robotsAllowed,
        indexable: htmlLooksIndexable(body),
        detail: schema.detail,
      };
    });
  }

  private async fetchLiveSitemapUrlCount(origin: string): Promise<{ count: number | null; error?: string }> {
    try {
      const res = await fetch(`${origin}/sitemap.xml`, {
        headers: { 'User-Agent': GOOGLEBOT_UA, Accept: 'application/xml,text/xml,*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return { count: null, error: `HTTP ${res.status}` };
      const xml = await res.text();
      const matches = xml.match(/<loc>/gi);
      return { count: matches?.length ?? 0 };
    } catch (e) {
      return { count: null, error: (e as Error)?.message ?? 'Fetch failed' };
    }
  }
}
