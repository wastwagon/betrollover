import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Atomic sync locks via `sync_status` row (same pattern as scheduled jobs).
 * Use one `syncType` (e.g. `odds`) so cron, manual admin, and full fixture import
 * do not run heavy odds API work concurrently.
 */
@Injectable()
export class SyncLockService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Claim lock: set status to `running` if not already running (or lock older than 1h).
   * @returns true if this caller acquired the lock
   */
  async tryStartSync(syncType: string): Promise<boolean> {
    const staleBefore = new Date(Date.now() - 60 * 60 * 1000);
    const rows = await this.dataSource.query(
      `
      INSERT INTO sync_status (sync_type, status, last_sync_count, updated_at)
      VALUES ($1, 'running', 0, NOW())
      ON CONFLICT (sync_type)
      DO UPDATE SET
        status = 'running',
        updated_at = NOW()
      WHERE sync_status.status <> 'running' OR sync_status.updated_at < $2
      RETURNING id
      `,
      [syncType, staleBefore],
    );
    return Array.isArray(rows) && rows.length > 0;
  }
}
