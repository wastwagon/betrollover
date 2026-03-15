import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly repo: Repository<AdminAuditLog>,
  ) {}

  async log(
    adminId: number,
    action: string,
    targetType: string,
    targetId?: string | number | null,
    details?: Record<string, unknown> | null,
  ): Promise<void> {
    const entry = this.repo.create({
      adminId,
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
      details: details ?? null,
    });
    await this.repo.save(entry).catch(() => {
      // Non-fatal: do not fail the main operation if audit write fails
    });
  }

  async getRecent(limit = 100, filters?: { adminId?: number; action?: string }) {
    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC')
      .take(Math.min(200, limit));
    if (filters?.adminId) qb.andWhere('a.admin_id = :adminId', { adminId: filters.adminId });
    if (filters?.action) qb.andWhere('a.action = :action', { action: filters.action });
    return qb.getMany();
  }
}
