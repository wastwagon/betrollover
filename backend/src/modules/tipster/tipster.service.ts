import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccumulatorTicket } from '../accumulators/entities/accumulator-ticket.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { ApiSettings } from '../admin/entities/api-settings.entity';

@Injectable()
export class TipsterService {
  constructor(
    @InjectRepository(AccumulatorTicket)
    private ticketRepo: Repository<AccumulatorTicket>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(ApiSettings)
    private apiSettingsRepo: Repository<ApiSettings>,
  ) {}

  /** Sum of positive payout wallet transactions for a tipster (marketplace / subscription earnings display). */
  async getTotalPayoutEarnings(userId: number): Promise<number> {
    const payouts = await this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.type = :type', { type: 'payout' })
      .andWhere('t.amount > 0')
      .getRawOne();
    return Math.round(Number(payouts?.total ?? 0) * 100) / 100;
  }

  async getStats(userId: number, role: string) {
    // All users are now tipsters - no role check needed
    const tickets = await this.ticketRepo.find({
      where: { userId },
      select: ['id', 'result', 'status', 'totalOdds'],
    });

    const totalPicks = tickets.length;
    const wonPicks = tickets.filter((t) => t.result === 'won').length;
    const lostPicks = tickets.filter((t) => t.result === 'lost').length;
    const settled = wonPicks + lostPicks;
    const winRate = settled > 0 ? Math.round((wonPicks / settled) * 100) : 0;

    // Calculate ROI: ((Total Returns - Total Investment) / Total Investment) * 100
    // For free picks, assume 1 GHS investment per pick
    // Returns = totalOdds * investment when won
    let totalInvestment = 0;
    let totalReturns = 0;
    
    for (const ticket of tickets) {
      if (ticket.result === 'won' || ticket.result === 'lost') {
        const investment = 1.0; // Standard investment for ROI calculation
        totalInvestment += investment;
        
        if (ticket.result === 'won') {
          const returns = investment * Number(ticket.totalOdds);
          totalReturns += returns;
        }
      }
    }

    const roi = totalInvestment > 0 
      ? Math.round(((totalReturns - totalInvestment) / totalInvestment) * 100 * 100) / 100
      : 0;

    const totalEarnings = await this.getTotalPayoutEarnings(userId);

    return {
      totalPicks,
      wonPicks,
      lostPicks,
      winRate,
      totalEarnings,
      roi,
    };
  }

  /** Public thresholds for paid marketplace coupons (no secrets). */
  async getSellingThresholds(): Promise<{ minimumROI: number; minimumWinRate: number }> {
    try {
      const row = await this.apiSettingsRepo.findOne({ where: { id: 1 } });
      return {
        minimumROI: Number(row?.minimumROI ?? 20.0),
        minimumWinRate: Number(row?.minimumWinRate ?? 45.0),
      };
    } catch {
      return { minimumROI: 20.0, minimumWinRate: 45.0 };
    }
  }
}
