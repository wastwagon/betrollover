import { Injectable, Logger } from '@nestjs/common';
import { execSync } from 'child_process';
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

  /** Ensure age_verified_at exists (fixes 500 on tipster-requests, impersonate if 045 was marked without running). */
  async ensureAgeVerifiedColumn(): Promise<void> {
    try {
      await this.dataSource.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP NULL`,
      );
    } catch (err: any) {
      this.logger.warn(`ensureAgeVerifiedColumn failed (non-fatal): ${err?.message || err}`);
    }
  }

  /** Ensure date_of_birth exists (fixes 500 when User relation loads in tipster-requests, impersonate). */
  async ensureDateOfBirthColumn(): Promise<void> {
    try {
      await this.dataSource.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL`,
      );
    } catch (err: any) {
      this.logger.warn(`ensureDateOfBirthColumn failed (non-fatal): ${err?.message || err}`);
    }
  }

  /** Run all pending migrations (numeric-prefix .sql files not in applied_migrations). */
  async runPending(): Promise<{ applied: string[]; skipped: number; errors: string[] }> {
    const applied: string[] = [];
    const errors: string[] = [];
    await this.ensureTable();
    const dir = this.getMigrationsDir();
    this.logger.log(`Migrations path: ${dir} (exists: ${fs.existsSync(dir)}, MIGRATIONS_PATH: ${process.env.MIGRATIONS_PATH || 'not set'})`);
    if (!fs.existsSync(dir)) {
      this.logger.warn(`Migrations directory not found: ${dir}. Set MIGRATIONS_PATH if needed. CWD: ${process.cwd()}`);
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
        await this.runMigrationFile(filePath, filename);
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

  /**
   * Run a migration file via psql -f (same as seeds).
   * Handles DO $$ blocks, multi-line SQL, and all PostgreSQL syntax correctly.
   * Falls back to DataSource.query if psql fails (e.g. not in PATH).
   */
  private async runMigrationFile(filePath: string, filename: string): Promise<void> {
    const host = process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost';
    const port = process.env.POSTGRES_PORT || process.env.PGPORT || '5432';
    const user = process.env.POSTGRES_USER || process.env.PGUSER || 'betrollover';
    const db = process.env.POSTGRES_DB || process.env.PGDATABASE || 'betrollover';
    const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || '';

    try {
      execSync(`psql -h ${host} -p ${port} -U ${user} -d ${db} -f "${filePath}" -v ON_ERROR_STOP=1`, {
        env: { ...process.env, PGPASSWORD: password },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (psqlErr: any) {
      // Only fall back when psql command not found (e.g. not in PATH)
      const isPsqlNotFound = psqlErr?.code === 'ENOENT' || psqlErr?.message?.includes('spawn psql');
      if (isPsqlNotFound) {
        this.logger.warn(`psql not available, using DataSource fallback for ${filename}`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await this.runSqlFallback(sql);
      } else {
        throw psqlErr;
      }
    }
  }

  /** Fallback: split by line-ending ; and execute. Avoid DO $$ blocks in migrations when using this fallback. */
  private async runSqlFallback(sql: string): Promise<void> {
    const statements: string[] = [];
    let current = '';
    for (const line of sql.split(/\r?\n/)) {
      current += line + '\n';
      const t = line.trim();
      const dollarCount = (current.match(/\$\$/g) || []).length;
      const insideDollarBlock = dollarCount % 2 === 1;
      if (t.endsWith(';') && !t.startsWith('--') && !insideDollarBlock) {
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
