/**
 * Check which AI tipsters have coupons in the database (accumulator_tickets).
 * No API key needed; DB only.
 *
 * Usage (from backend directory):
 *   npx ts-node -r tsconfig-paths/register scripts/check-ai-tipster-coupons.ts
 *   # Last 30 days only:
 *   DAYS=30 npx ts-node -r tsconfig-paths/register scripts/check-ai-tipster-coupons.ts
 */

import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { AI_TIPSTERS } from '../src/config/ai-tipsters.config';

async function bootstrap() {
  const days = process.env.DAYS ? parseInt(process.env.DAYS, 10) : null;
  console.log('\n=== AI tipsters – coupons in DB ===\n');
  if (days) console.log(`Filter: last ${days} days\n`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const dataSource = app.get(DataSource);

  try {
    // AI tipsters: id, username, display_name, user_id
    const tipsters = await dataSource.query(
      `SELECT id, username, display_name, user_id FROM tipsters WHERE is_ai = true ORDER BY username`,
    );
    if (tipsters.length === 0) {
      console.log('No AI tipsters found in DB. Run seeds/setup first.');
      await app.close();
      process.exit(0);
      return;
    }

    const userIds = tipsters.map((t: { user_id: number | null }) => t.user_id).filter(Boolean) as number[];
    if (userIds.length === 0) {
      console.log('AI tipsters have no user_id linked. Run tipsters-setup (link users) first.');
      await app.close();
      process.exit(0);
      return;
    }

    // Count accumulator_tickets per user_id (optionally last N days)
    const dateFilter = days
      ? `AND at.created_at >= NOW() - INTERVAL '${days} days'`
      : '';
    const counts = await dataSource.query(
      `SELECT at.user_id AS "userId", COUNT(*)::int AS count
       FROM accumulator_tickets at
       WHERE at.user_id = ANY($1::int[]) ${dateFilter}
       GROUP BY at.user_id`,
      [userIds],
    );
    const countByUserId = new Map<number, number>();
    for (const row of counts) countByUserId.set(Number(row.userId), row.count);

    const byUsername = new Map<string, { displayName: string; userId: number | null; count: number }>();
    for (const t of tipsters) {
      const uid = t.user_id != null ? Number(t.user_id) : null;
      byUsername.set(t.username, {
        displayName: t.display_name,
        userId: uid,
        count: uid != null ? countByUserId.get(uid) ?? 0 : 0,
      });
    }

    // Table: include all 25 from config so we see who has 0 (e.g. not in DB or no user_id)
    const withCoupons: { username: string; displayName: string; count: number }[] = [];
    const withZero: { username: string; displayName: string }[] = [];
    for (const cfg of AI_TIPSTERS) {
      const row = byUsername.get(cfg.username);
      const count = row?.count ?? 0;
      if (count > 0) withCoupons.push({ username: cfg.username, displayName: cfg.display_name, count });
      else withZero.push({ username: cfg.username, displayName: cfg.display_name });
    }

    console.log('--- Tipsters WITH coupons ---');
    const sorted = [...withCoupons].sort((a, b) => b.count - a.count);
    if (sorted.length === 0) {
      console.log('  (none)');
    } else {
      for (const { displayName, username, count } of sorted) {
        console.log(`  ${displayName} (${username}): ${count} coupons`);
      }
    }

    console.log('\n--- Tipsters with 0 coupons ---');
    for (const { displayName, username } of withZero) {
      const inDb = tipsters.some((t: { username: string }) => t.username === username);
      const hasUser = inDb && (byUsername.get(username)?.userId != null);
      const note = !inDb ? ' [not in DB]' : !hasUser ? ' [no user_id]' : '';
      console.log(`  ${displayName} (${username})${note}`);
    }

    const totalCoupons = sorted.reduce((s, x) => s + x.count, 0);
    console.log('\n--- Summary ---');
    console.log(`  Tipsters with ≥1 coupon: ${withCoupons.length}/${AI_TIPSTERS.length}`);
    console.log(`  Tipsters with 0 coupons: ${withZero.length}`);
    console.log(`  Total coupons (AI): ${totalCoupons}`);
    if (days) console.log(`  (counts in last ${days} days)`);
    console.log('\n');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
