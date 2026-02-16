import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

const APPLIED_TABLE = `CREATE TABLE IF NOT EXISTS applied_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

/** Only run migrations with numeric prefix (010_, 011_, ...) so one-off scripts are not auto-run. */
const NUMERIC_MIGRATION = /^\d{3}_.*\.sql$/;

export interface MigrationStatus {
  applied: { filename: string; appliedAt: Date }[];
  pending: string[];
}

@Injectable()
export class MigrationRunnerService {
  private readonly logger = new Logger(MigrationRunnerService.name);

  constructor(private readonly dataSource: DataSource) {}

  private getMigrationsDir(): string {
    const fromEnv = process.env.MIGRATIONS_PATH;
    if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
    const cwd = process.cwd();
    const relative = path.join(cwd, 'database', 'migrations');
    if (fs.existsSync(relative)) return path.resolve(relative);
    const fromParent = path.join(cwd, '..', 'database', 'migrations');
    if (fs.existsSync(fromParent)) return path.resolve(fromParent);
    return path.resolve(relative); // return default even if missing; will log
  }

  /** Returns applied list and list of pending (on-disk but not applied) filenames. */
  async getStatus(): Promise<MigrationStatus> {
    await this.ensureTable();
    const appliedRows = (await this.dataSource.query(
      `SELECT filename, applied_at FROM applied_migrations ORDER BY id ASC`,
    )) as { filename: string; applied_at: Date }[];
    const applied = appliedRows.map((r) => ({ filename: r.filename, appliedAt: r.applied_at }));
    const dir = this.getMigrationsDir();
    const existingSet = new Set(appliedRows.map((r) => r.filename));
    let pending: string[] = [];
    if (fs.existsSync(dir)) {
      pending = fs.readdirSync(dir)
        .filter((f) => NUMERIC_MIGRATION.test(f))
        .sort()
        .filter((f) => !existingSet.has(f));
    }
    return { applied, pending };
  }

  /** Returns list of applied migration filenames (newest first). */
  async getApplied(): Promise<{ filename: string; appliedAt: Date }[]> {
    const s = await this.getStatus();
    return [...s.applied].reverse();
  }

  /** Mark all current on-disk migrations as applied without running them (for existing production DBs). */
  async markAllAsApplied(): Promise<{ marked: number }> {
    await this.ensureTable();
    const dir = this.getMigrationsDir();
    if (!fs.existsSync(dir)) return { marked: 0 };
    const files = fs.readdirSync(dir).filter((f) => NUMERIC_MIGRATION.test(f)).sort();
    let marked = 0;
    for (const filename of files) {
      try {
        await this.dataSource.query(
          'INSERT INTO applied_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
          [filename],
        );
        const result = await this.dataSource.query(
          'SELECT 1 FROM applied_migrations WHERE filename = $1',
          [filename],
        );
        if (result.length > 0) marked++;
      } catch {
        // already applied
      }
    }
    if (marked > 0) this.logger.log(`Marked ${marked} migration(s) as applied (no execution).`);
    return { marked };
  }

  /** Run all pending migrations (numeric-prefix .sql files not in applied_migrations). */
  async runPending(): Promise<{ applied: string[]; skipped: number; errors: string[] }> {
    const applied: string[] = [];
    const errors: string[] = [];
    await this.ensureTable();
    const dir = this.getMigrationsDir();
    if (!fs.existsSync(dir)) {
      this.logger.warn(`Migrations directory not found: ${dir}. Set MIGRATIONS_PATH if needed.`);
      return { applied, skipped: 0, errors: [`Migrations directory not found: ${dir}`] };
    }
    const files = fs.readdirSync(dir)
      .filter((f) => NUMERIC_MIGRATION.test(f))
      .sort();
    const existing = (await this.dataSource.query(
      'SELECT filename FROM applied_migrations',
    )) as { filename: string }[];
    const existingSet = new Set(existing.map((r) => r.filename));
    const pending = files.filter((f) => !existingSet.has(f));
    for (const filename of pending) {
      const filePath = path.join(dir, filename);
      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await this.runSql(sql, filename);
        await this.dataSource.query(
          'INSERT INTO applied_migrations (filename) VALUES ($1)',
          [filename],
        );
        applied.push(filename);
        this.logger.log(`Applied migration: ${filename}`);
      } catch (err: any) {
        const msg = `${filename}: ${err?.message || String(err)}`;
        this.logger.error(msg);
        errors.push(msg);
        break; // stop on first error so DB stays consistent
      }
    }
    return { applied, skipped: files.length - pending.length - applied.length, errors };
  }

  private async ensureTable(): Promise<void> {
    await this.dataSource.query(APPLIED_TABLE);
  }

  /** Execute SQL file content. Splits by statement (line ending with ;) so COMMENT strings with ; are safe. */
  private async runSql(sql: string, _label: string): Promise<void> {
    const statements: string[] = [];
    let current = '';
    for (const line of sql.split(/\r?\n/)) {
      current += line + '\n';
      const t = line.trim();
      if (t.endsWith(';') && !t.startsWith('--')) {
        statements.push(current.trim());
        current = '';
      }
    }
    if (current.trim()) statements.push(current.trim());
    for (const statement of statements) {
      if (statement) await this.dataSource.query(statement);
    }
  }
}
