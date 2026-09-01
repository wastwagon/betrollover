import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Repository } from 'typeorm';
import { formatFootballOutcomeLabel } from '@betrollover/shared-types';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { Fixture } from '../fixtures/entities/fixture.entity';
import { FixtureOdd } from '../fixtures/entities/fixture-odd.entity';
import { outcomeKeyFromOddsLine } from '../fixtures/odds-outcome-keys';
import { AccumulatorsService, CreateAccumulatorDto } from '../accumulators/accumulators.service';
import { User } from '../users/entities/user.entity';
import { AccaGeneratorRun } from './entities/acca-generator-run.entity';
import { AccaGeneratorEvent } from './entities/acca-generator-event.entity';
import { ACCA_GENERATOR_LEGS_MAX, ACCA_GENERATOR_LEGS_MIN } from './acca-generator.constants';
import {
  ACCA_DESK_MAX_KICKOFF_GAP_MS,
  accraDateStr,
  deskDayFixtureWindow,
  pickTimeClusteredPair,
  slotForKickoff,
  type AccaDeskSlotKey,
} from '../../config/acca-desk-slots';
import {
  ACCA_GENERATOR_DEFAULTS,
  ACCA_GENERATOR_MARKET_KEYS,
  ACCA_GENERATOR_MARKETS,
  ACCA_RISK_PROFILES,
  outcomeFamily,
  outcomeKeysForMarkets,
  resolveRiskProfile,
  type AccaRiskLevel,
  type AccaRiskProfile,
} from './acca-generator.markets';
import { pickGreedyLegs, rotateAwayFromRecentRuns } from './acca-generator-pick.util';

const ACCA_EVENT_TYPES = new Set(['tool_open', 'quota_hit', 'empty_pool']);

/** Product of leg odds. Round short slips; keep full magnitude for long analysis slips. */
function productOdds(odds: number[]): number {
  const product = odds.reduce((acc, o) => acc * (Number.isFinite(o) && o > 0 ? o : 1), 1);
  if (!Number.isFinite(product) || product <= 0) return 1;
  if (product < 1e9) return Math.round(product * 1000) / 1000;
  return product;
}

export type AccaGeneratorSelection = {
  fixtureId: number;
  apiFixtureId: number;
  matchDescription: string;
  prediction: string;
  outcomeKey: string;
  marketName: string;
  marketValue: string;
  odds: number;
  matchDate: string;
  leagueName: string | null;
  probability: number;
  /** Internal rank score (mid-band fit + prob). Not required by clients. */
  score?: number;
  sport: 'football';
};

export type GenerateAccaDto = {
  markets: string[];
  legs: number;
  /** sure | safe | medium | high — sets per-leg odd band server-side. */
  riskLevel?: AccaRiskLevel | string;
};

@Injectable()
export class AccaGeneratorService {
  constructor(
    @InjectRepository(ApiSettings)
    private readonly apiSettingsRepo: Repository<ApiSettings>,
    @InjectRepository(Fixture)
    private readonly fixtureRepo: Repository<Fixture>,
    @InjectRepository(FixtureOdd)
    private readonly oddsRepo: Repository<FixtureOdd>,
    @InjectRepository(AccaGeneratorRun)
    private readonly runRepo: Repository<AccaGeneratorRun>,
    @InjectRepository(AccaGeneratorEvent)
    private readonly eventRepo: Repository<AccaGeneratorEvent>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly accumulatorsService: AccumulatorsService,
  ) {}

  /** Product analytics: tool_open (client), quota_hit / empty_pool (server). */
  async trackEvent(
    userId: number,
    eventType: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ ok: true }> {
    const type = String(eventType || '').trim().toLowerCase();
    if (!ACCA_EVENT_TYPES.has(type)) {
      throw new BadRequestException('Unsupported Acca Generator event type');
    }
    await this.recordEvent(userId, type, metadata);
    return { ok: true };
  }

  private async recordEvent(
    userId: number | null,
    eventType: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.eventRepo.save(
        this.eventRepo.create({
          userId,
          eventType,
          metadata: metadata && typeof metadata === 'object' ? metadata : {},
        }),
      );
    } catch {
      /* analytics must never break generate / publish */
    }
  }

  async getEnabledStatus() {
    const limits = await this.loadLimits();
    return { enabled: limits.enabled };
  }

  async getPublicConfig(userId: number) {
    const limits = await this.loadLimits();
    const quota = await this.getQuota(userId, limits);
    return {
      enabled: limits.enabled,
      minLegs: limits.minLegs,
      maxLegs: limits.maxLegs,
      legsCeiling: ACCA_GENERATOR_LEGS_MAX,
      dailyGenerations: limits.dailyGenerations,
      /** Same calendar day only — denser markets, avoids thin future days. */
      sameDayOnly: true,
      riskProfiles: ACCA_RISK_PROFILES,
      markets: ACCA_GENERATOR_MARKETS.map((m) => ({ key: m.key, label: m.label })),
      defaults: ACCA_GENERATOR_DEFAULTS,
      /** Admins may generate/publish when the feature flag is off. */
      adminBypassDisabled: quota.exempt,
      quota,
      /**
       * Odds source note for clients:
       * availability/generate query our synced DB in real time; they do not hit API-Sports per click.
       */
      oddsSource: 'cached_fixture_odds',
    };
  }

  /**
   * For a risk band, return which markets currently have same-day odds (live DB query).
   * Use this before market selection so empty generates are rare.
   */
  async getAvailability(riskLevel?: string, marketsCsv?: string) {
    const risk = resolveRiskProfile(riskLevel || ACCA_GENERATOR_DEFAULTS.riskLevel);
    const lines = await this.loadTodayOddsInBand(risk.oddMin, risk.oddMax);
    const { dateStr } = this.todayBounds();

    const markets = ACCA_GENERATOR_MARKETS.map((m) => {
      const keys = new Set(m.outcomeKeys);
      const fixtureIds = new Set<number>();
      for (const line of lines) {
        if (keys.has(line.outcomeKey)) fixtureIds.add(line.fixtureId);
      }
      return {
        key: m.key,
        label: m.label,
        fixtureCount: fixtureIds.size,
        available: fixtureIds.size > 0,
      };
    });

    const availableMarkets = markets.filter((m) => m.available);
    const allFixtures = new Set(lines.map((l) => l.fixtureId));

    const selectedKeys = (marketsCsv || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((k) => ACCA_GENERATOR_MARKET_KEYS.has(k));
    let selectedFixtureCount = 0;
    if (selectedKeys.length) {
      const allowed = outcomeKeysForMarkets(selectedKeys);
      selectedFixtureCount = new Set(
        lines.filter((l) => allowed.has(l.outcomeKey)).map((l) => l.fixtureId),
      ).size;
    }

    return {
      riskLevel: risk.key,
      oddMin: risk.oddMin,
      oddMax: risk.oddMax,
      targetOdd: risk.targetOdd,
      date: dateStr,
      asOf: new Date().toISOString(),
      /** Unique fixtures that have ≥1 line in this risk band today */
      fixtureCount: allFixtures.size,
      /** Unique fixtures for the currently selected markets (if provided) */
      selectedFixtureCount,
      markets,
      availableMarketKeys: availableMarkets.map((m) => m.key),
      source: 'cached_fixture_odds',
    };
  }

  async generate(userId: number, dto: GenerateAccaDto) {
    const limits = await this.loadLimits();
    await this.assertEnabled(userId, limits);

    const markets = this.normalizeMarkets(dto.markets);
    const risk = this.resolveRiskFromDto(dto);
    const { oddMin, oddMax, targetOdd } = risk;
    const legs = Math.floor(Number(dto.legs));

    if (!Number.isFinite(legs) || legs < limits.minLegs || legs > limits.maxLegs) {
      throw new BadRequestException(`legs must be between ${limits.minLegs} and ${limits.maxLegs}`);
    }

    await this.assertGenerationQuota(userId, limits);

    const allowedOutcomes = outcomeKeysForMarkets(markets);
    const candidates = await this.buildCandidates({
      allowedOutcomes,
      oddMin,
      oddMax,
      targetOdd,
    });

    if (candidates.length < legs) {
      await this.recordEvent(userId, 'empty_pool', {
        riskLevel: risk.key,
        legsRequested: legs,
        candidates: candidates.length,
        markets,
      });
      throw new BadRequestException(
        `Not enough ${risk.label.toLowerCase()}-risk selections today (${candidates.length}) for ${legs} legs. Try another risk level, relax markets, or try later.`,
      );
    }

    const recentStacks = await this.recentRunFixtureStacks(userId);
    const rotated = rotateAwayFromRecentRuns(candidates, recentStacks, legs);
    const selected = pickGreedyLegs(rotated, legs, { vary: true });
    const combinedOdds = productOdds(selected.map((s) => s.odds));

    const run = await this.runRepo.save(
      this.runRepo.create({
        userId,
        legsRequested: legs,
        legsReturned: selected.length,
        markets,
        riskLevel: risk.key,
        oddMin,
        oddMax,
        combinedOdds,
        selections: selected as unknown as Record<string, unknown>[],
      }),
    );

    const quota = await this.getQuota(userId, limits);
    return {
      generationId: run.id,
      legs: selected.map(({ score: _s, ...leg }) => leg),
      combinedOdds,
      markets,
      riskLevel: risk.key,
      oddMin,
      oddMax,
      sameDayOnly: true,
      quota,
    };
  }

  private resolveRiskFromDto(dto: GenerateAccaDto): AccaRiskProfile {
    if (!dto.riskLevel) {
      return resolveRiskProfile(ACCA_GENERATOR_DEFAULTS.riskLevel);
    }
    const key = String(dto.riskLevel).toLowerCase();
    if (!ACCA_RISK_PROFILES.some((p) => p.key === key)) {
      throw new BadRequestException('riskLevel must be sure, safe, medium, or high');
    }
    return resolveRiskProfile(key);
  }

  async publish(userId: number, body: { generationId: number; title?: string; description?: string }) {
    const generationId = Math.floor(Number(body.generationId));
    if (!Number.isFinite(generationId) || generationId < 1) {
      throw new BadRequestException('generationId is required');
    }

    const run = await this.runRepo.findOne({ where: { id: generationId, userId } });
    if (!run) throw new NotFoundException('Generation not found');
    if (run.publishedTicketId) {
      throw new BadRequestException('This generation was already published');
    }

    const selections = (run.selections || []) as unknown as AccaGeneratorSelection[];
    if (!selections.length) {
      throw new BadRequestException('Generation has no selections to publish');
    }
    this.assertSelectionsStillListable(selections);

    const title =
      (body.title || '').trim() ||
      `Acca Generator ${selections.length}-fold · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;

    const dto: CreateAccumulatorDto = {
      title: title.slice(0, 255),
      description: (
        body.description ||
        'Generated with Acca Generator (free pick). Educational/informational only — not a sure bet. Gamble responsibly. 18+.'
      ).slice(0, 2000),
      price: 0,
      isMarketplace: true,
      sport: 'football',
      placement: 'marketplace',
      selections: selections.map((s) => ({
        fixtureId: s.apiFixtureId || s.fixtureId,
        sport: 'football',
        matchDescription: s.matchDescription,
        prediction: s.prediction,
        outcomeKey: s.outcomeKey,
        odds: Number(s.odds),
        matchDate: s.matchDate,
      })),
    };

    // Re-check under load to cut down double-publish races before create.
    const stillOpen = await this.runRepo.findOne({
      where: { id: run.id, userId, publishedTicketId: IsNull() },
    });
    if (!stillOpen) {
      throw new BadRequestException('This generation was already published');
    }

    const ticket = await this.accumulatorsService.create(userId, dto);
    const ticketId = Number((ticket as { id?: number })?.id);
    if (!Number.isFinite(ticketId) || ticketId < 1) {
      throw new BadRequestException('Publish failed: marketplace ticket was not created');
    }

    const claim = await this.runRepo.update(
      { id: run.id, userId, publishedTicketId: IsNull() },
      { publishedTicketId: ticketId },
    );
    if (!claim.affected) {
      const existing = await this.runRepo.findOne({ where: { id: run.id, userId } });
      if (existing?.publishedTicketId) {
        return {
          ticket,
          generationId: run.id,
          publishedTicketId: existing.publishedTicketId,
          note: 'Generation was already linked to a published pick.',
        };
      }
      throw new BadRequestException(
        `Pick was created (#${ticketId}) but could not be linked to this generation. Do not republish — check My picks / marketplace.`,
      );
    }

    return {
      ticket,
      generationId: run.id,
      publishedTicketId: ticketId,
    };
  }

  private async loadLimits() {
    const row = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
    const minLegs = Math.min(
      ACCA_GENERATOR_LEGS_MAX,
      Math.max(ACCA_GENERATOR_LEGS_MIN, Math.floor(Number(row?.accaGeneratorMinLegs ?? 2))),
    );
    let maxLegs = Math.min(
      ACCA_GENERATOR_LEGS_MAX,
      Math.max(ACCA_GENERATOR_LEGS_MIN, Math.floor(Number(row?.accaGeneratorMaxLegs ?? 8))),
    );
    if (maxLegs < minLegs) maxLegs = minLegs;
    return {
      enabled: row?.accaGeneratorEnabled !== false,
      minLegs,
      maxLegs,
      dailyGenerations: Math.max(0, Math.floor(Number(row?.accaGeneratorDailyGenerations ?? 10))),
    };
  }

  private async assertEnabled(userId: number, limits: { enabled: boolean }) {
    if (limits.enabled) return;
    const user = await this.usersRepo.findOne({ where: { id: userId }, select: ['id', 'role'] });
    if (user?.role === 'admin') return;
    throw new ServiceUnavailableException('Acca Generator is temporarily disabled');
  }

  private async isExemptFromGenerationQuota(userId: number): Promise<boolean> {
    const user = await this.usersRepo.findOne({ where: { id: userId }, select: ['id', 'role'] });
    return user?.role === 'admin';
  }

  private utcDayBounds(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  private async countGenerationsUtcToday(userId: number): Promise<number> {
    const { start, end } = this.utcDayBounds();
    return this.runRepo
      .createQueryBuilder('r')
      .where('r.userId = :userId', { userId })
      .andWhere('r.createdAt >= :start', { start })
      .andWhere('r.createdAt < :end', { end })
      .getCount();
  }

  private async getQuota(
    userId: number,
    limits: { dailyGenerations: number },
  ): Promise<{
    maxPerDay: number;
    usedToday: number;
    remaining: number | null;
    exempt: boolean;
    resetsAtUtc: string;
  }> {
    const exempt = await this.isExemptFromGenerationQuota(userId);
    const usedToday = await this.countGenerationsUtcToday(userId);
    const { end } = this.utcDayBounds();
    if (exempt || limits.dailyGenerations <= 0) {
      return {
        maxPerDay: limits.dailyGenerations,
        usedToday,
        remaining: null,
        exempt,
        resetsAtUtc: end.toISOString(),
      };
    }
    return {
      maxPerDay: limits.dailyGenerations,
      usedToday,
      remaining: Math.max(0, limits.dailyGenerations - usedToday),
      exempt: false,
      resetsAtUtc: end.toISOString(),
    };
  }

  private async assertGenerationQuota(
    userId: number,
    limits: { dailyGenerations: number },
  ): Promise<void> {
    if (limits.dailyGenerations <= 0) return;
    if (await this.isExemptFromGenerationQuota(userId)) return;
    const used = await this.countGenerationsUtcToday(userId);
    if (used >= limits.dailyGenerations) {
      await this.recordEvent(userId, 'quota_hit', {
        usedToday: used,
        maxPerDay: limits.dailyGenerations,
      });
      throw new ForbiddenException(
        `Daily Acca Generator limit reached (${limits.dailyGenerations} per UTC day). Try again after midnight UTC.`,
      );
    }
  }

  private normalizeMarkets(raw: string[]): string[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new BadRequestException('Select at least one market');
    }
    const unique = [...new Set(raw.map((m) => String(m).trim().toLowerCase()).filter(Boolean))];
    const invalid = unique.filter((k) => !ACCA_GENERATOR_MARKET_KEYS.has(k));
    if (invalid.length) {
      throw new BadRequestException(`Unsupported markets: ${invalid.join(', ')}`);
    }
    return unique;
  }

  /**
   * Marketplace hides a listing as soon as any leg kickoff is in the past.
   * Keep a lead buffer so generated/published slips stay visible long enough to view.
   */
  private static readonly MIN_KICKOFF_LEAD_MS = 45 * 60 * 1000;

  private predictionTimeZone(): string {
    return process.env.PREDICTION_TIMEZONE || 'Africa/Accra';
  }

  /** Same calendar day as AI tipsters (PREDICTION_TIMEZONE, default Africa/Accra = UTC). */
  private todayBounds(): { startOfDay: Date; endOfDay: Date; dateStr: string } {
    const tz = this.predictionTimeZone();
    let dateStr: string;
    try {
      dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      dateStr = new Date().toISOString().slice(0, 10);
    }
    return {
      dateStr,
      startOfDay: new Date(`${dateStr}T00:00:00.000Z`),
      endOfDay: new Date(`${dateStr}T23:59:59.999Z`),
    };
  }

  private minKickoffAt(): Date {
    return new Date(Date.now() + AccaGeneratorService.MIN_KICKOFF_LEAD_MS);
  }

  private assertSelectionsStillListable(selections: AccaGeneratorSelection[]) {
    const minKickoff = this.minKickoffAt();
    const stale = selections.filter((s) => {
      const kickoff = new Date(s.matchDate);
      return !Number.isFinite(kickoff.getTime()) || kickoff < minKickoff;
    });
    if (stale.length) {
      throw new BadRequestException(
        'One or more legs have kicked off or kick off within 45 minutes. Marketplace hides picks once any leg starts — regenerate with later fixtures.',
      );
    }
  }

  private async loadOddsInBand(
    oddMin: number,
    oddMax: number,
    window?: { start: Date; endExclusive: Date },
  ): Promise<
    {
      fixtureId: number;
      apiFixtureId: number;
      homeTeamName: string;
      awayTeamName: string;
      leagueName: string | null;
      matchDate: Date;
      marketName: string;
      marketValue: string;
      odds: number;
      outcomeKey: string;
    }[]
  > {
    const minKickoff = this.minKickoffAt();
    const { startOfDay, endOfDay } = this.todayBounds();
    const start = window?.start ?? startOfDay;
    // Desk-day window is half-open [start, endExclusive); calendar-day path stays inclusive endOfDay.
    const end = window?.endExclusive ?? endOfDay;
    const endInclusive = !window;

    const fixturesQb = this.fixtureRepo
      .createQueryBuilder('f')
      .where('f.status IN (:...st)', { st: ['NS', 'TBD'] })
      .andWhere('f.matchDate >= :start', { start })
      .andWhere(endInclusive ? 'f.matchDate <= :end' : 'f.matchDate < :end', { end })
      // Lead buffer: marketplace delists as soon as any leg kickoff passes.
      .andWhere('f.matchDate >= :minKickoff', { minKickoff })
      // Odds-first sync can leave API-Sports placeholders until /fixtures backfill runs.
      .andWhere("NOT (f.homeTeamName = 'Home' AND f.awayTeamName = 'Away')")
      .orderBy('f.matchDate', 'ASC')
      .take(800);

    const fixtures = await fixturesQb.getMany();

    if (!fixtures.length) return [];

    const byFixture = new Map(fixtures.map((f) => [f.id, f]));
    const odds = await this.oddsRepo.find({
      where: { fixtureId: In(fixtures.map((f) => f.id)) },
      select: ['id', 'fixtureId', 'marketName', 'marketValue', 'odds'],
    });

    const rows: {
      fixtureId: number;
      apiFixtureId: number;
      homeTeamName: string;
      awayTeamName: string;
      leagueName: string | null;
      matchDate: Date;
      marketName: string;
      marketValue: string;
      odds: number;
      outcomeKey: string;
    }[] = [];

    for (const odd of odds) {
      const oddsNum = Number(odd.odds);
      if (!Number.isFinite(oddsNum) || oddsNum < oddMin || oddsNum > oddMax) continue;
      const outcomeKey = outcomeKeyFromOddsLine(odd.marketName, odd.marketValue);
      if (!outcomeKey || outcomeKey === 'correct_score') continue;
      const fixture = byFixture.get(odd.fixtureId);
      if (!fixture) continue;
      rows.push({
        fixtureId: fixture.id,
        apiFixtureId: fixture.apiId,
        homeTeamName: fixture.homeTeamName,
        awayTeamName: fixture.awayTeamName,
        leagueName: fixture.leagueName,
        matchDate: fixture.matchDate,
        marketName: odd.marketName,
        marketValue: odd.marketValue,
        odds: Math.round(oddsNum * 1000) / 1000,
        outcomeKey,
      });
    }
    return rows;
  }

  private async loadTodayOddsInBand(oddMin: number, oddMax: number) {
    return this.loadOddsInBand(oddMin, oddMax);
  }

  private async buildCandidates(opts: {
    allowedOutcomes: Set<string>;
    oddMin: number;
    oddMax: number;
    targetOdd: number;
    excludeFixtureIds?: Set<number>;
    /** Acca Desk board date — uses [D 06:00, D+1 06:00) pool. */
    deskDayStr?: string;
  }): Promise<AccaGeneratorSelection[]> {
    const window = opts.deskDayStr
      ? (() => {
          const { start, end } = deskDayFixtureWindow(opts.deskDayStr!, this.predictionTimeZone());
          return { start, endExclusive: end };
        })()
      : undefined;
    const pool = await this.loadOddsInBand(opts.oddMin, opts.oddMax, window);
    const halfSpan = Math.max((opts.oddMax - opts.oddMin) / 2, 0.05);
    const bestByFixture = new Map<number, AccaGeneratorSelection>();
    const exclude = opts.excludeFixtureIds;

    for (const row of pool) {
      if (exclude?.has(row.fixtureId)) continue;
      if (!opts.allowedOutcomes.has(row.outcomeKey)) continue;

      const probability = Math.min(0.95, Math.max(0.05, 1 / row.odds));
      const bandFit = Math.max(0, 1 - Math.abs(row.odds - opts.targetOdd) / halfSpan);
      const score = probability * 0.4 + bandFit * 0.6;

      const candidate: AccaGeneratorSelection = {
        fixtureId: row.fixtureId,
        apiFixtureId: row.apiFixtureId,
        matchDescription: `${row.homeTeamName} vs ${row.awayTeamName}`,
        prediction: formatFootballOutcomeLabel(row.outcomeKey),
        outcomeKey: row.outcomeKey,
        marketName: row.marketName,
        marketValue: row.marketValue,
        odds: row.odds,
        matchDate: new Date(row.matchDate).toISOString(),
        leagueName: row.leagueName,
        probability: Math.round(probability * 10000) / 10000,
        score: Math.round(score * 10000) / 10000,
        sport: 'football',
      };

      const prev = bestByFixture.get(row.fixtureId);
      if (!prev || (candidate.score ?? 0) > (prev.score ?? 0)) {
        bestByFixture.set(row.fixtureId, candidate);
      }
    }

    return [...bestByFixture.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  /** Today's generations for this user, newest first, as fixture-id stacks. */
  private async recentRunFixtureStacks(userId: number): Promise<number[][]> {
    const { start, end } = this.utcDayBounds();
    const runs = await this.runRepo.find({
      where: { userId, createdAt: Between(start, end) },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return runs
      .map((run) => {
        const ids: number[] = [];
        for (const row of run.selections || []) {
          const id = Number((row as { fixtureId?: number }).fixtureId);
          if (Number.isFinite(id) && id > 0) ids.push(id);
        }
        return ids;
      })
      .filter((stack) => stack.length > 0);
  }

  /**
   * Acca Desk / automation: desk-day candidate pool, without user quota
   * or the public rotate/vary picker. Callers enforce exclusivity via excludeFixtureIds.
   */
  async generateForDesk(opts: {
    userId: number;
    markets: string[];
    legs: number;
    riskLevel: string;
    excludeFixtureIds?: Iterable<number>;
    /** Restrict pool to one Acca Desk kick-off window. */
    slotKey?: AccaDeskSlotKey;
    /** Accra desk day YYYY-MM-DD (default: today). */
    deskDayStr?: string;
  }) {
    const markets = this.normalizeMarkets(opts.markets);
    const risk = this.resolveRiskFromDto({ markets, legs: opts.legs, riskLevel: opts.riskLevel });
    const legs = Math.floor(Number(opts.legs));
    if (!Number.isFinite(legs) || legs < ACCA_GENERATOR_LEGS_MIN || legs > ACCA_GENERATOR_LEGS_MAX) {
      throw new BadRequestException(`legs must be between ${ACCA_GENERATOR_LEGS_MIN} and ${ACCA_GENERATOR_LEGS_MAX}`);
    }

    const tz = this.predictionTimeZone();
    const deskDayStr = opts.deskDayStr || accraDateStr(new Date(), tz);

    const excludeFixtureIds = new Set(
      [...(opts.excludeFixtureIds || [])].filter((id) => Number.isFinite(id) && id > 0),
    );
    const allowedOutcomes = outcomeKeysForMarkets(markets);
    let candidates = await this.buildCandidates({
      allowedOutcomes,
      oddMin: risk.oddMin,
      oddMax: risk.oddMax,
      targetOdd: risk.targetOdd,
      excludeFixtureIds,
      deskDayStr,
    });

    if (opts.slotKey) {
      candidates = candidates.filter((c) => slotForKickoff(c.matchDate, tz)?.key === opts.slotKey);
    }

    if (candidates.length < legs) {
      await this.recordEvent(opts.userId, 'empty_pool', {
        source: 'acca_desk',
        riskLevel: risk.key,
        legsRequested: legs,
        candidates: candidates.length,
        markets,
        excluded: excludeFixtureIds.size,
        slotKey: opts.slotKey ?? null,
        deskDay: deskDayStr,
      });
      return {
        ok: false as const,
        reason: 'empty_pool' as const,
        candidates: candidates.length,
        riskLevel: risk.key,
        markets,
        deskDay: deskDayStr,
      };
    }

    const selected =
      legs === 2
        ? pickTimeClusteredPair(candidates, ACCA_DESK_MAX_KICKOFF_GAP_MS, outcomeFamily)
        : pickGreedyLegs(candidates, legs);
    if (selected.length < legs) {
      await this.recordEvent(opts.userId, 'empty_pool', {
        source: 'acca_desk',
        riskLevel: risk.key,
        legsRequested: legs,
        legsBuilt: selected.length,
        markets,
        slotKey: opts.slotKey ?? null,
        deskDay: deskDayStr,
      });
      return {
        ok: false as const,
        reason: 'empty_pool' as const,
        candidates: candidates.length,
        riskLevel: risk.key,
        markets,
        deskDay: deskDayStr,
      };
    }

    const combinedOdds = productOdds(selected.map((s) => s.odds));
    const run = await this.runRepo.save(
      this.runRepo.create({
        userId: opts.userId,
        legsRequested: legs,
        legsReturned: selected.length,
        markets,
        riskLevel: risk.key,
        oddMin: risk.oddMin,
        oddMax: risk.oddMax,
        combinedOdds,
        selections: selected as unknown as Record<string, unknown>[],
      }),
    );

    return {
      ok: true as const,
      generationId: run.id,
      legs: selected.map(({ score: _s, ...leg }) => leg),
      combinedOdds,
      markets,
      riskLevel: risk.key,
      oddMin: risk.oddMin,
      oddMax: risk.oddMax,
      deskDay: deskDayStr,
    };
  }
}
