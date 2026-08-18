import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserStatus } from '../users/entities/user.entity';
import { UserPurchasedPick } from '../accumulators/entities/user-purchased-pick.entity';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { PickMarketplace } from '../accumulators/entities/pick-marketplace.entity';
import { EmailService } from './email.service';
import { MarketingSend } from './entities/marketing-send.entity';
import { WELCOME_STEPS } from './welcome-campaigns.config';
import {
  DIGEST_ACTIVE_WITHIN_HOURS,
  QUIET_STEPS,
  lastActivityMs,
  pickQuietStep,
} from './quiet-campaigns.config';
import {
  RECAP_MAX_SLIPS,
  isAccraMonday,
  recapCampaignKey,
  recapWindow,
} from './recap-campaigns.config';
import { AccumulatorsService } from '../accumulators/accumulators.service';
import { TipsterFollow } from '../predictions/entities/tipster-follow.entity';
import { Tipster } from '../predictions/entities/tipster.entity';

const TZ = process.env.PREDICTION_TIMEZONE || 'Africa/Accra';

export type PromoRunSlice = {
  sent: number;
  skipped: number;
  errors: number;
  details: { userId: number; campaignKey: string; status: string }[];
};

export type DailyPromoResult = {
  enabled: boolean;
  welcome: PromoRunSlice;
  recap: PromoRunSlice;
  digest: PromoRunSlice;
  quiet: PromoRunSlice;
};

type RecapSlip = {
  id: number;
  title: string;
  result: 'won' | 'lost';
  totalOdds: number;
  totalPicks: number;
  tipsterName: string;
};

type RecapRow = {
  audienceId?: string | number;
  audience_id?: string | number;
  ticketId?: string | number;
  ticket_id?: string | number;
  title?: string;
  result?: string;
  totalOdds?: string | number;
  total_odds?: string | number;
  totalPicks?: string | number;
  total_picks?: string | number;
  tipsterUserId?: string | number;
  tipster_user_id?: string | number;
};

@Injectable()
export class MarketingCampaignService {
  private readonly logger = new Logger(MarketingCampaignService.name);
  private dailyRunLock = false;

  constructor(
    private readonly emailService: EmailService,
    private readonly moduleRef: ModuleRef,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MarketingSend)
    private readonly sendRepo: Repository<MarketingSend>,
    @InjectRepository(UserPurchasedPick)
    private readonly purchaseRepo: Repository<UserPurchasedPick>,
    @InjectRepository(TipsterFollow)
    private readonly followRepo: Repository<TipsterFollow>,
  ) {}

  /** Resolve after bootstrap so EmailModule does not import AccumulatorsModule (circular). */
  private accumulators(): AccumulatorsService {
    return this.moduleRef.get(AccumulatorsService, { strict: false });
  }

  isEnabled(): boolean {
    const raw = (process.env.MARKETING_EMAIL_ENABLED || 'true').toLowerCase().trim();
    return raw !== 'false' && raw !== '0' && raw !== 'no';
  }

  async runDailyPromos(): Promise<DailyPromoResult> {
    const empty: PromoRunSlice = { sent: 0, skipped: 0, errors: 0, details: [] };
    if (!this.isEnabled()) {
      this.logger.log('Daily promos skipped (MARKETING_EMAIL_ENABLED=false)');
      return { enabled: false, welcome: empty, recap: empty, digest: empty, quiet: empty };
    }
    if (this.dailyRunLock) {
      this.logger.log('Daily promos skipped (already running)');
      return { enabled: true, welcome: empty, recap: empty, digest: empty, quiet: empty };
    }
    this.dailyRunLock = true;
    try {
      const welcome = await this.runWelcomeSeries();
      const recap = await this.runWeeklyRecap();
      const digest = await this.runFreeTipDigest();
      const quiet = await this.runQuietNudges();
      this.logger.log(
        `Daily promos (${TZ}): welcome sent=${welcome.sent} recap sent=${recap.sent} digest sent=${digest.sent} quiet sent=${quiet.sent} errors=${welcome.errors + recap.errors + digest.errors + quiet.errors}`,
      );
      return { enabled: true, welcome, recap, digest, quiet };
    } finally {
      this.dailyRunLock = false;
    }
  }

  async runWelcomeSeries(): Promise<PromoRunSlice> {
    const result: PromoRunSlice = { sent: 0, skipped: 0, errors: 0, details: [] };
    if (!this.isEnabled()) return result;

    const users = await this.loadConsentedUsers();
    const now = Date.now();
    const dayStart = this.accraDayStart(new Date());

    for (const user of users) {
      const stepResult = await this.sendWelcomeStepIfDue(user, now, dayStart);
      if (stepResult === 'sent') {
        result.sent++;
        continue;
      }
      if (stepResult === 'error') {
        result.errors++;
        continue;
      }
      result.skipped++;
    }

    this.logger.log(`Welcome series (${TZ}): sent=${result.sent} skipped=${result.skipped} errors=${result.errors}`);
    return result;
  }

  /** Immediate D0 when someone opts in — do not wait for the 09:00 cron. */
  async sendDueWelcomeForUser(userId: number): Promise<void> {
    if (!this.isEnabled() || !userId) return;
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'displayName', 'marketingConsent', 'marketingConsentAt', 'status'],
    });
    if (!user?.marketingConsent || !user.marketingConsentAt) return;
    if (user.status !== UserStatus.ACTIVE) return;
    if ((user.email || '').toLowerCase().endsWith('@betrollover.internal')) return;
    await this.sendWelcomeStepIfDue(user, Date.now(), this.accraDayStart(new Date()));
  }

  private async sendWelcomeStepIfDue(
    user: User,
    now: number,
    dayStart: Date,
  ): Promise<'sent' | 'skipped' | 'error'> {
    if (await this.sentAnyToday(user.id, dayStart)) return 'skipped';

    const priorKeys = await this.sendRepo.find({
      where: { userId: user.id, campaignKey: In(WELCOME_STEPS.map((s) => s.key)) },
      select: ['campaignKey'],
    });
    const sentSet = new Set(priorKeys.map((r) => r.campaignKey));
    const consentMs = user.marketingConsentAt ? new Date(user.marketingConsentAt).getTime() : 0;
    const hours = (now - consentMs) / 3_600_000;

    const step = WELCOME_STEPS.find((s) => {
      if (sentSet.has(s.key)) return false;
      if (hours < s.minHoursAfterConsent) return false;
      if (s.requiresPrior && !sentSet.has(s.requiresPrior)) return false;
      return true;
    });
    if (!step) return 'skipped';

    const sendResult = await this.emailService.sendCampaignEmail({
      to: user.email,
      subject: step.subject,
      eyebrow: step.eyebrow,
      title: step.title,
      body: step.body,
      ctaLabel: step.ctaLabel,
      ctaPath: step.ctaPath,
    });
    if (!sendResult.sent) {
      this.logger.warn(`Welcome ${step.key} failed for user ${user.id}: ${sendResult.error}`);
      return 'error';
    }
    await this.recordSend(user.id, step.key);
    return 'sent';
  }

  async runFreeTipDigest(): Promise<PromoRunSlice> {
    const result: PromoRunSlice = { sent: 0, skipped: 0, errors: 0, details: [] };
    if (!this.isEnabled()) return result;

    const campaignKey = this.digestKeyForToday();
    const users = await this.loadConsentedUsers();
    const dayStart = this.accraDayStart(new Date());
    const welcomeKeys = WELCOME_STEPS.map((s) => s.key);
    const purchaseByUser = await this.loadLastPurchaseMs(users.map((u) => u.id));
    const now = Date.now();
    const eligible: User[] = [];

    for (const user of users) {
      if (await this.sentAnyToday(user.id, dayStart)) {
        result.skipped++;
        continue;
      }
      const hoursQuiet = this.hoursQuiet(user, purchaseByUser.get(user.id) ?? 0, now);
      if (hoursQuiet >= DIGEST_ACTIVE_WITHIN_HOURS) {
        result.skipped++;
        continue;
      }
      const prior = await this.sendRepo.find({
        where: { userId: user.id, campaignKey: In([...welcomeKeys, campaignKey]) },
        select: ['campaignKey'],
      });
      const sentSet = new Set(prior.map((r) => r.campaignKey));
      if (!sentSet.has('welcome_d3') || sentSet.has(campaignKey)) {
        result.skipped++;
        continue;
      }
      eligible.push(user);
    }

    if (!eligible.length) return result;

    const { items } = await this.accumulators().getFreeTipsOfTheDay(undefined, 4, 'football');
    const tips = this.parseDigestTips(items);
    if (!tips.length) {
      this.logger.log('Free-tip digest skipped — no ranked free football slips');
      return result;
    }

    for (const user of eligible) {
      const sendResult = await this.emailService.sendFreeTipDigestEmail(user.email, tips);
      if (!sendResult.sent) {
        result.errors++;
        result.details.push({ userId: user.id, campaignKey, status: sendResult.error || 'error' });
        continue;
      }

      await this.recordSend(user.id, campaignKey);
      result.sent++;
      result.details.push({ userId: user.id, campaignKey, status: 'sent' });
    }

    this.logger.log(`Free-tip digest (${TZ}): sent=${result.sent} skipped=${result.skipped} errors=${result.errors}`);
    return result;
  }

  async runQuietNudges(): Promise<PromoRunSlice> {
    const result: PromoRunSlice = { sent: 0, skipped: 0, errors: 0, details: [] };
    if (!this.isEnabled()) return result;

    const users = await this.loadConsentedUsers();
    const dayStart = this.accraDayStart(new Date());
    const now = Date.now();
    const purchaseByUser = await this.loadLastPurchaseMs(users.map((u) => u.id));
    const priorKeys = [...WELCOME_STEPS.map((s) => s.key), ...QUIET_STEPS.map((s) => s.key)];

    for (const user of users) {
      if (await this.sentAnyToday(user.id, dayStart)) {
        result.skipped++;
        continue;
      }

      const prior = await this.sendRepo.find({
        where: { userId: user.id, campaignKey: In(priorKeys) },
        select: ['campaignKey'],
      });
      const sentSet = new Set(prior.map((r) => r.campaignKey));
      if (!sentSet.has('welcome_d3')) {
        result.skipped++;
        continue;
      }

      const hours = this.hoursQuiet(user, purchaseByUser.get(user.id) ?? 0, now);
      const step = pickQuietStep(hours, sentSet);
      if (!step) {
        result.skipped++;
        continue;
      }

      const sendResult = await this.emailService.sendCampaignEmail({
        to: user.email,
        subject: step.subject,
        eyebrow: step.eyebrow,
        title: step.title,
        body: step.body,
        ctaLabel: step.ctaLabel,
        ctaPath: step.ctaPath,
      });

      if (!sendResult.sent) {
        result.errors++;
        result.details.push({ userId: user.id, campaignKey: step.key, status: sendResult.error || 'error' });
        this.logger.warn(`Quiet ${step.key} failed for user ${user.id}: ${sendResult.error}`);
        continue;
      }

      await this.recordSend(user.id, step.key);
      result.sent++;
      result.details.push({ userId: user.id, campaignKey: step.key, status: 'sent' });
    }

    this.logger.log(`Quiet nudges (${TZ}): sent=${result.sent} skipped=${result.skipped} errors=${result.errors}`);
    return result;
  }

  async runWeeklyRecap(): Promise<PromoRunSlice> {
    const result: PromoRunSlice = { sent: 0, skipped: 0, errors: 0, details: [] };
    if (!this.isEnabled()) return result;

    const now = new Date();
    if (!isAccraMonday(now, TZ)) {
      this.logger.log(`Weekly recap skipped (not Monday ${TZ})`);
      return result;
    }

    const mondayStart = this.accraDayStart(now);
    const campaignKey = recapCampaignKey(mondayStart);
    const { from, to } = recapWindow(mondayStart);
    const users = await this.loadConsentedUsers();
    const dayStart = mondayStart;
    const slipsByUser = await this.loadRecapSlipsByUser(
      users.map((u) => u.id),
      from,
      to,
    );

    for (const user of users) {
      if (await this.sentAnyToday(user.id, dayStart)) {
        result.skipped++;
        continue;
      }

      const welcome = await this.sendRepo.find({
        where: { userId: user.id, campaignKey: In([...WELCOME_STEPS.map((s) => s.key), campaignKey]) },
        select: ['campaignKey'],
      });
      const sentSet = new Set(welcome.map((r) => r.campaignKey));
      if (!sentSet.has('welcome_d3') || sentSet.has(campaignKey)) {
        result.skipped++;
        continue;
      }

      const slips = slipsByUser.get(user.id) || [];
      if (!slips.length) {
        result.skipped++;
        continue;
      }

      const won = slips.filter((s) => s.result === 'won').length;
      const lost = slips.filter((s) => s.result === 'lost').length;
      const sendResult = await this.emailService.sendWeeklyRecapEmail(user.email, slips.slice(0, RECAP_MAX_SLIPS), {
        won,
        lost,
      });
      if (!sendResult.sent) {
        result.errors++;
        result.details.push({ userId: user.id, campaignKey, status: sendResult.error || 'error' });
        continue;
      }

      await this.recordSend(user.id, campaignKey);
      result.sent++;
      result.details.push({ userId: user.id, campaignKey, status: 'sent' });
    }

    this.logger.log(`Weekly recap (${TZ}): sent=${result.sent} skipped=${result.skipped} errors=${result.errors}`);
    return result;
  }

  private async loadRecapSlipsByUser(userIds: number[], from: Date, to: Date): Promise<Map<number, RecapSlip[]>> {
    const grouped = new Map<number, Map<number, RecapSlip & { tipsterUserId: number }>>();
    if (!userIds.length) return new Map();

    const purchased = (await this.purchaseRepo
      .createQueryBuilder('p')
      .innerJoin(AccumulatorTicket, 't', 't.id = p.accumulator_id')
      .select('p.userId', 'audienceId')
      .addSelect('t.id', 'ticketId')
      .addSelect('t.title', 'title')
      .addSelect('t.result', 'result')
      .addSelect('t.totalOdds', 'totalOdds')
      .addSelect('t.totalPicks', 'totalPicks')
      .addSelect('t.userId', 'tipsterUserId')
      .where('p.userId IN (:...userIds)', { userIds })
      .andWhere('t.result IN (:...results)', { results: ['won', 'lost'] })
      .andWhere('t.updatedAt >= :from', { from })
      .andWhere('t.updatedAt < :to', { to })
      .getRawMany()) as RecapRow[];

    const followed = (await this.followRepo
      .createQueryBuilder('f')
      .innerJoin(Tipster, 'ts', 'ts.id = f.tipster_id AND ts.user_id IS NOT NULL')
      .innerJoin(AccumulatorTicket, 't', 't.user_id = ts.user_id')
      .innerJoin(PickMarketplace, 'pm', 'pm.accumulator_id = t.id')
      .select('f.userId', 'audienceId')
      .addSelect('t.id', 'ticketId')
      .addSelect('t.title', 'title')
      .addSelect('t.result', 'result')
      .addSelect('t.totalOdds', 'totalOdds')
      .addSelect('t.totalPicks', 'totalPicks')
      .addSelect('t.userId', 'tipsterUserId')
      .where('f.userId IN (:...userIds)', { userIds })
      .andWhere('t.result IN (:...results)', { results: ['won', 'lost'] })
      .andWhere('t.isMarketplace = true')
      .andWhere('t.updatedAt >= :from', { from })
      .andWhere('t.updatedAt < :to', { to })
      .getRawMany()) as RecapRow[];

    const pushRow = (row: RecapRow) => {
      const audienceId = Number(row.audienceId ?? row.audience_id);
      const ticketId = Number(row.ticketId ?? row.ticket_id);
      const tipsterUserId = Number(row.tipsterUserId ?? row.tipster_user_id);
      const result = String(row.result || '') as string;
      if (!Number.isFinite(audienceId) || !Number.isFinite(ticketId) || (result !== 'won' && result !== 'lost')) {
        return;
      }
      if (!grouped.has(audienceId)) grouped.set(audienceId, new Map());
      const tickets = grouped.get(audienceId)!;
      if (tickets.has(ticketId)) return;
      tickets.set(ticketId, {
        id: ticketId,
        title: String(row.title || `Pick #${ticketId}`),
        result: result as 'won' | 'lost',
        totalOdds: Number(row.totalOdds ?? row.total_odds ?? 0),
        totalPicks: Number(row.totalPicks ?? row.total_picks ?? 0),
        tipsterName: 'Tipster',
        tipsterUserId,
      });
    };
    purchased.forEach(pushRow);
    followed.forEach(pushRow);

    const tipsterIds = new Set<number>();
    for (const tickets of grouped.values()) {
      for (const row of tickets.values()) {
        if (Number.isFinite(row.tipsterUserId) && row.tipsterUserId > 0) tipsterIds.add(row.tipsterUserId);
      }
    }
    const names = new Map<number, string>();
    if (tipsterIds.size) {
      const tipsters = await this.userRepo.find({
        where: { id: In([...tipsterIds]) },
        select: ['id', 'displayName', 'username'],
      });
      for (const t of tipsters) {
        names.set(t.id, t.displayName || t.username || 'Tipster');
      }
    }

    const out = new Map<number, RecapSlip[]>();
    for (const [audienceId, tickets] of grouped) {
      const slips: RecapSlip[] = [...tickets.values()]
        .map((row) => ({
          id: row.id,
          title: row.title,
          result: row.result,
          totalOdds: row.totalOdds,
          totalPicks: row.totalPicks,
          tipsterName: names.get(row.tipsterUserId) || 'Tipster',
        }))
        .sort((a, b) => {
          if (a.result !== b.result) return a.result === 'won' ? -1 : 1;
          return Number(b.totalOdds) - Number(a.totalOdds);
        });
      out.set(audienceId, slips);
    }
    return out;
  }

  private parseDigestTips(items: Record<string, unknown>[]): Array<{
    id: number;
    title: string;
    tipsterName: string;
    totalOdds: number;
    totalPicks: number;
  }> {
    const out: Array<{ id: number; title: string; tipsterName: string; totalOdds: number; totalPicks: number }> = [];
    for (const item of items) {
      const id = Number(item.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      const tipster = item.tipster as { displayName?: string; username?: string } | null;
      const picks = Array.isArray(item.picks) ? item.picks.length : 0;
      out.push({
        id,
        title: String(item.title || `Pick #${id}`),
        tipsterName: tipster?.displayName || tipster?.username || 'Tipster',
        totalOdds: Number(item.totalOdds || 0),
        totalPicks: Number(item.totalPicks || picks || 0),
      });
    }
    return out;
  }

  private async loadConsentedUsers(): Promise<User[]> {
    return this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.email',
        'u.displayName',
        'u.marketingConsent',
        'u.marketingConsentAt',
        'u.status',
        'u.lastLogin',
        'u.createdAt',
      ])
      .where('u.marketingConsent = true')
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('u.marketingConsentAt IS NOT NULL')
      .andWhere("u.email NOT ILIKE '%@betrollover.internal'")
      .getMany();
  }

  private async loadLastPurchaseMs(userIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (!userIds.length) return map;
    const rows: Array<Record<string, unknown>> = await this.purchaseRepo
      .createQueryBuilder('p')
      .select('p.userId', 'userId')
      .addSelect('MAX(p.purchasedAt)', 'lastAt')
      .where('p.userId IN (:...userIds)', { userIds })
      .groupBy('p.userId')
      .getRawMany();
    for (const row of rows) {
      const id = Number(row.userId ?? row.user_id ?? row.p_user_id);
      const lastAt = row.lastAt ?? row.last_at;
      const ms = lastAt ? new Date(lastAt as string | Date).getTime() : NaN;
      if (Number.isFinite(id) && Number.isFinite(ms)) map.set(id, ms);
    }
    return map;
  }

  private hoursQuiet(user: User, lastPurchaseMs: number, now: number): number {
    const activity = lastActivityMs(user, lastPurchaseMs);
    if (!activity) return Number.POSITIVE_INFINITY;
    return (now - activity) / 3_600_000;
  }

  private async sentAnyToday(userId: number, dayStart: Date): Promise<boolean> {
    const count = await this.sendRepo
      .createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .andWhere('s.sentAt >= :dayStart', { dayStart })
      .getCount();
    return count > 0;
  }

  private async recordSend(userId: number, campaignKey: string): Promise<void> {
    await this.sendRepo.save(this.sendRepo.create({ userId, campaignKey }));
  }

  digestKeyForToday(now = new Date()): string {
    const start = this.accraDayStart(now);
    return `digest_free_tip_${start.toISOString().slice(0, 10)}`;
  }

  /** Start of today in Africa/Accra, as a UTC Date. */
  accraDayStart(now: Date): Date {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = Number(parts.find((p) => p.type === 'year')?.value);
    const m = Number(parts.find((p) => p.type === 'month')?.value);
    const d = Number(parts.find((p) => p.type === 'day')?.value);
    return new Date(Date.UTC(y, m - 1, d));
  }
}
