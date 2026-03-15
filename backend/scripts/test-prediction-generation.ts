/**
 * Test AI prediction generation: next 7 days fixtures, per-tipster coupon count.
 * Uses API_SPORTS_KEY from env for odds + predictions API. DB must have fixtures (run sync first if needed).
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

async function bootstrap() {
  const apiKey = process.env.API_SPORTS_KEY;
  console.log('\n=== AI Prediction generation test (next 7 days, dry run) ===\n');
  console.log('API_SPORTS_KEY:', apiKey ? `***${apiKey.slice(-4)}` : 'NOT SET');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const service = app.get(PredictionEngineService);

  try {
    const predictions = await service.generateDailyPredictionsForAllTipsters(undefined, true);

    const byTipster = new Map<string, { count: number; coupons: typeof predictions }>();
    for (const t of AI_TIPSTERS) {
      byTipster.set(t.username, { count: 0, coupons: [] });
    }
    for (const p of predictions) {
      const cur = byTipster.get(p.tipsterUsername);
      if (cur) {
        cur.count++;
        cur.coupons.push(p);
      }
    }

    const total = predictions.length;
    const withCoupons = [...byTipster.entries()].filter(([, v]) => v.count > 0);
    const withZero = [...byTipster.entries()].filter(([, v]) => v.count === 0);

    console.log('\n--- Summary ---');
    console.log(`Total coupons generated: ${total}`);
    console.log(`Tipsters with ≥1 coupon: ${withCoupons.length}/${AI_TIPSTERS.length}`);
    console.log(`Tipsters with 0 coupons: ${withZero.length}`);

    console.log('\n--- Per-tipster (coupons generated) ---');
    const sorted = [...byTipster.entries()].sort((a, b) => b[1].count - a[1].count);
    for (const [username, { count, coupons }] of sorted) {
      const cfg = AI_TIPSTERS.find((t) => t.username === username);
      const name = cfg?.display_name ?? username;
      const maxAllowed = cfg?.personality.max_daily_predictions ?? 999;
      const cap = maxAllowed === 999 ? '∞' : String(maxAllowed);
      console.log(`  ${name} (${username}): ${count} coupons (max ${cap})`);
      if (count > 0 && coupons[0]) {
        const first = coupons[0];
        console.log(`    e.g. ${first.predictionTitle} @ ${first.combinedOdds?.toFixed(2)} (${first.fixtures[0]?.selectedOutcome})`);
      }
    }

    if (withZero.length > 0) {
      console.log('\n--- Tipsters with 0 coupons ---');
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
