/**
 * Test AI prediction generation: runs the engine once per calendar day for the next 7 days (dry run).
 * Uses API_SPORTS_KEY from env for odds + predictions API. DB must have fixtures with odds for those days.
 *
 * Usage (from backend directory):
 *   API_SPORTS_KEY=your_key npx ts-node -r tsconfig-paths/register scripts/test-prediction-generation.ts
 *
 * Dry run: does not save predictions to DB.
 */

import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PredictionEngineService } from '../src/modules/predictions/prediction-engine.service';
import { AI_TIPSTERS } from '../src/config/ai-tipsters.config';
import type { TipsterPredictionResult } from '../src/modules/predictions/prediction-engine.service';

function addDaysYmd(base: Date, days: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function bootstrap() {
  const apiKey = process.env.API_SPORTS_KEY;
  console.log('\n=== AI Prediction generation test (7 consecutive days, dry run) ===\n');
  console.log('API_SPORTS_KEY:', apiKey ? `***${apiKey.slice(-4)}` : 'NOT SET');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const service = app.get(PredictionEngineService);

  try {
    const today = new Date();
    const byTipster = new Map<string, { count: number; coupons: (TipsterPredictionResult & { _date: string })[] }>();
    for (const t of AI_TIPSTERS) {
      byTipster.set(t.username, { count: 0, coupons: [] });
    }

    let grandTotal = 0;
    let atLeastTwoOddsNonGambler = 0;

    for (let i = 0; i < 7; i++) {
      const dateStr = addDaysYmd(today, i);
      const dayPreds = await service.generateDailyPredictionsForAllTipsters(dateStr, true);
      grandTotal += dayPreds.length;
      console.log(`\n--- ${dateStr}: ${dayPreds.length} coupon(s) ---`);
      for (const p of dayPreds) {
        const cur = byTipster.get(p.tipsterUsername);
        if (cur) {
          cur.count++;
          cur.coupons.push({ ...p, _date: dateStr });
        }
        const odds = Number(p.combinedOdds);
        if (p.tipsterUsername !== 'TheGambler' && odds >= 2) atLeastTwoOddsNonGambler++;
      }
      for (const p of dayPreds.slice(0, 8)) {
        console.log(
          `  ${p.tipsterDisplayName}: ${p.predictionTitle} @ ${Number(p.combinedOdds).toFixed(2)} (${p.fixtures[0]?.selectedOutcome})`,
        );
      }
      if (dayPreds.length > 8) console.log(`  ... +${dayPreds.length - 8} more`);
    }

    const withCoupons = [...byTipster.entries()].filter(([, v]) => v.count > 0);
    const withZero = [...byTipster.entries()].filter(([, v]) => v.count === 0);

    console.log('\n--- 7-day aggregate ---');
    console.log(`Total coupons (all days): ${grandTotal}`);
    console.log(`Non–Gambler coupons with single-leg odds ≥ 2.0: ${atLeastTwoOddsNonGambler}`);
    console.log(`Tipsters with ≥1 coupon across the week: ${withCoupons.length}/${AI_TIPSTERS.length}`);
    console.log(`Tipsters with 0 coupons: ${withZero.length}`);

    console.log('\n--- Per-tipster (total coupons over 7 days) ---');
    const sorted = [...byTipster.entries()].sort((a, b) => b[1].count - a[1].count);
    for (const [username, { count, coupons }] of sorted) {
      const cfg = AI_TIPSTERS.find((t) => t.username === username);
      const name = cfg?.display_name ?? username;
      const maxPerDay = cfg?.personality.max_daily_predictions ?? 999;
      const cap = maxPerDay === 999 ? '∞' : String(maxPerDay);
      console.log(`  ${name} (${username}): ${count} coupons (max ${cap}/day)`);
      if (count > 0 && coupons[0]) {
        const first = coupons[0];
        console.log(
          `    e.g. [${first._date}] ${first.predictionTitle} @ ${Number(first.combinedOdds).toFixed(2)} (${first.fixtures[0]?.selectedOutcome})`,
        );
      }
    }

    if (withZero.length > 0) {
      console.log('\n--- Tipsters with 0 coupons (whole 7-day run) ---');
      for (const [username] of withZero) {
        const cfg = AI_TIPSTERS.find((t) => t.username === username);
        console.log(`  ${cfg?.display_name ?? username} (${username})`);
      }
    }

    console.log('\n--- Done (dry run, nothing saved to DB) ---\n');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
