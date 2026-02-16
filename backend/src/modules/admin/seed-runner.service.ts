import { Injectable, Logger } from '@nestjs/common';
import { execSync } from 'child_process';
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

  /** Run all seed files via psql (handles DO $$ blocks correctly). Logs errors but does not fail startup. */
  async runSeeds(): Promise<{ run: string[]; errors: string[] }> {
    const run: string[] = [];
    const errors: string[] = [];
    const dir = this.getSeedsDir();

    if (!fs.existsSync(dir)) {
      this.logger.warn(`Seeds directory not found: ${dir}. Set SEEDS_PATH if needed.`);
      return { run, errors };
    }

    const host = process.env.POSTGRES_HOST || 'localhost';
    const port = process.env.POSTGRES_PORT || '5432';
    const user = process.env.POSTGRES_USER || 'betrollover';
    const db = process.env.POSTGRES_DB || 'betrollover';
    const password = process.env.POSTGRES_PASSWORD || '';

    for (const filename of SEED_FILES) {
      const filePath = path.join(dir, filename);
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`Seed file not found: ${filename}`);
        continue;
      }
      try {
        const env = { ...process.env, PGPASSWORD: password };
        execSync(`psql -h ${host} -p ${port} -U ${user} -d ${db} -f "${filePath}" -v ON_ERROR_STOP=1`, {
          env,
          stdio: 'inherit',
        });
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
}
