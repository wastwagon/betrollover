import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

/** Seed files to run on deployment, in order. Uses ON CONFLICT where possible for idempotency. */
const SEED_FILES = [
  'news-resources-seed.sql',
  'news-2026-seed.sql',
  'comprehensive-seed-data.sql',
  'ai-tipsters-full-seed.sql',
];

@Injectable()
export class SeedRunnerService {
  private readonly logger = new Logger(SeedRunnerService.name);

  constructor(private dataSource: DataSource) {}

  private getSeedsDir(): string {
    const fromEnv = process.env.SEEDS_PATH;
    if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);
    const cwd = process.cwd();
    const relative = path.join(cwd, 'database', 'seeds');
    if (fs.existsSync(relative)) return path.resolve(relative);
    const fromParent = path.join(cwd, '..', 'database', 'seeds');
    if (fs.existsSync(fromParent)) return path.resolve(fromParent);
    return path.resolve(relative);
  }

  /** Run all seed files. Logs errors but does not fail startup (seeds may already be applied). */
  async runSeeds(): Promise<{ run: string[]; errors: string[] }> {
    const run: string[] = [];
    const errors: string[] = [];
    const dir = this.getSeedsDir();

    if (!fs.existsSync(dir)) {
      this.logger.warn(`Seeds directory not found: ${dir}. Set SEEDS_PATH if needed.`);
      return { run, errors };
    }

    for (const filename of SEED_FILES) {
      const filePath = path.join(dir, filename);
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`Seed file not found: ${filename}`);
        continue;
      }
      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await this.runSql(sql, filename);
        run.push(filename);
        this.logger.log(`Applied seed: ${filename}`);
      } catch (err: any) {
        const msg = `${filename}: ${err?.message || String(err)}`;
        this.logger.warn(`Seed failed (non-fatal): ${msg}`);
        errors.push(msg);
      }
    }

    return { run, errors };
  }

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
