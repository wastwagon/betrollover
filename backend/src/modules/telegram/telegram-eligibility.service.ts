import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tipster } from '../predictions/entities/tipster.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';
import { ACCA_DESK_TIPSTER_TYPE } from '../../config/acca-desk-tipsters.config';
import { VIP_TIPSTER_TYPE } from '../../config/vip-tipster.config';
import { PUBLIC_CHANNEL_SURE_USERNAME } from '../../config/rollover-desk.config';
import {
  telegramAlwaysAllowUsernames,
  telegramMinRoi,
  telegramMinSettled,
  telegramMinWinRate,
} from './telegram-copy';

export type TelegramEligibilityReason =
  | 'allowlist'
  | 'acca_sure'
  | 'performance'
  | 'acca_desk_other'
  | 'below_bar'
  | 'no_tipster'
  | 'inactive';

@Injectable()
export class TelegramEligibilityService {
  private readonly logger = new Logger(TelegramEligibilityService.name);

  constructor(
    @InjectRepository(Tipster)
    private readonly tipsterRepo: Repository<Tipster>,
    @InjectRepository(ApiSettings)
    private readonly apiSettingsRepo: Repository<ApiSettings>,
  ) {}

  /**
   * Channel stays a highlight reel: AccaSure1X2 + allowlist + tipsters above performance bar.
   * Other Acca Desk brands are excluded (Sure carries the Acca face).
   */
  async canPostForUserId(userId: number | null | undefined): Promise<{
    ok: boolean;
    reason: TelegramEligibilityReason;
    username?: string;
  }> {
    if (userId == null) return { ok: false, reason: 'no_tipster' };
    const tipster = await this.tipsterRepo.findOne({
      where: { userId },
      select: [
        'id',
        'username',
        'displayName',
        'tipsterType',
        'isActive',
        'totalWins',
        'totalLosses',
        'winRate',
        'roi',
      ],
    });
    if (!tipster) return { ok: false, reason: 'no_tipster' };
    return this.evaluateTipster(tipster);
  }

  async evaluateTipster(tipster: {
    username: string;
    tipsterType?: string | null;
    isActive?: boolean;
    totalWins?: number;
    totalLosses?: number;
    winRate?: number | string;
    roi?: number | string;
  }): Promise<{ ok: boolean; reason: TelegramEligibilityReason; username?: string }> {
    const username = (tipster.username || '').trim();
    if (!username) return { ok: false, reason: 'no_tipster' };
    if (tipster.isActive === false) return { ok: false, reason: 'inactive', username };

    const allow = telegramAlwaysAllowUsernames().map((u) => u.toLowerCase());
    if (allow.includes(username.toLowerCase())) {
      return { ok: true, reason: username === PUBLIC_CHANNEL_SURE_USERNAME ? 'acca_sure' : 'allowlist', username };
    }

    // Other Acca Desk personas → no (AccaSure only for desk brand). House VIP posts to the private VIP chat.
    if (tipster.tipsterType === ACCA_DESK_TIPSTER_TYPE || tipster.tipsterType === VIP_TIPSTER_TYPE) {
      return { ok: false, reason: 'acca_desk_other', username };
    }

    const settled = Number(tipster.totalWins || 0) + Number(tipster.totalLosses || 0);
    const winRate = Number(tipster.winRate || 0);
    const roi = Number(tipster.roi || 0);
    const thresholds = await this.thresholds();
    const minSettled = telegramMinSettled();
    const minWr = telegramMinWinRate(thresholds.minimumWinRate);
    const minRoi = telegramMinRoi();

    if (settled >= minSettled && winRate >= minWr && roi >= minRoi) {
      return { ok: true, reason: 'performance', username };
    }

    this.logger.debug(
      `Telegram skip ${username}: settled=${settled}/${minSettled} wr=${winRate}/${minWr} roi=${roi}/${minRoi}`,
    );
    return { ok: false, reason: 'below_bar', username };
  }

  private async thresholds(): Promise<{ minimumROI: number; minimumWinRate: number }> {
    try {
      const row = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
      return {
        minimumROI: Number(row?.minimumROI ?? 20),
        minimumWinRate: Number(row?.minimumWinRate ?? 30),
      };
    } catch {
      return { minimumROI: 20, minimumWinRate: 30 };
    }
  }
}
