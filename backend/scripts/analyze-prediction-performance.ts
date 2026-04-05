/**
 * Analyze settled prediction data: win rate and ROI-style metrics by segment.
 *
 * Data:
 * - Leg level: prediction_fixtures (result_status won/lost)
 * - Coupon level: predictions (status won/lost, actual_result = P&L at 1 unit stake)
 *
 * Usage (from repo root, with .env loaded):
 *   cd backend && npx ts-node scripts/analyze-prediction-performance.ts
 *
 * Optional env:
 *   DAYS=90          — only rows with prediction_date >= today - DAYS
 *   AI_ONLY=1        — restrict to tipsters.is_ai = true
 *   MIN_SAMPLE=8     — hide groups with fewer settled legs (leg tables only)
 */

import { config } from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

config({ path: path.resolve(__dirname, '../../.env') });

function buildDataSource(): DataSource {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new DataSource({
      type: 'postgres',
      url,
      namingStrategy: new SnakeNamingStrategy(),
      synchronize: false,
      logging: false,
    });
  }
  return new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'betrollover',
    password: process.env.POSTGRES_PASSWORD || 'betrollover_dev',
    database: process.env.POSTGRES_DB || 'betrollover',
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    logging: false,
  });
}

function fmtPct(x: number | string | null): string {
  if (x == null || x === '') return '—';
  const n = typeof x === 'string' ? parseFloat(x) : x;
  if (Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(x: unknown, d = 3): string {
  if (x == null || x === '') return '—';
  const n = typeof x === 'string' ? parseFloat(x) : Number(x);
  if (Number.isNaN(n)) return '—';
  return n.toFixed(d);
}

async function main() {
  const days = process.env.DAYS ? parseInt(process.env.DAYS, 10) : null;
  const aiOnly = process.env.AI_ONLY === '1' || process.env.AI_ONLY === 'true';
  const minSample = process.env.MIN_SAMPLE ? parseInt(process.env.MIN_SAMPLE, 10) : 8;

  const dateFilterLeg = days
    ? `AND p.prediction_date >= (CURRENT_DATE - INTERVAL '${days} days')`
    : '';
  const dateFilterCoupon = days
    ? `AND p.prediction_date >= (CURRENT_DATE - INTERVAL '${days} days')`
    : '';
  const aiClause = aiOnly ? 'AND t.is_ai = true' : '';

  const ds = buildDataSource();
  await ds.initialize();

  try {
    console.log('\n=== Prediction performance analysis ===\n');
    if (days) console.log(`Window: last ${days} days (prediction_date)`);
    else console.log('Window: all time');
    console.log(aiOnly ? 'Scope: AI tipsters only' : 'Scope: all tipsters');
    console.log(`Leg tables: hide groups with n < ${minSample}\n`);

    const overviewLegs = await ds.query(
      `
      SELECT
        COUNT(*)::int AS total_legs,
        COUNT(*) FILTER (WHERE pf.result_status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE pf.result_status = 'won')::int AS won,
        COUNT(*) FILTER (WHERE pf.result_status = 'lost')::int AS lost,
        COUNT(*) FILTER (WHERE pf.result_status = 'void')::int AS void
      FROM prediction_fixtures pf
      JOIN predictions p ON p.id = pf.prediction_id
      JOIN tipsters t ON t.id = p.tipster_id
      WHERE 1=1
        ${dateFilterLeg}
        ${aiClause}
      `,
    );

    const overviewCoupons = await ds.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE p.status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE p.status = 'won')::int AS won,
        COUNT(*) FILTER (WHERE p.status = 'lost')::int AS lost
      FROM predictions p
      JOIN tipsters t ON t.id = p.tipster_id
      WHERE 1=1
        ${dateFilterCoupon}
        ${aiClause}
      `,
    );

    console.log('--- Overview (all legs in window) ---');
    console.table(overviewLegs);
    console.log('--- Overview (all coupons in window) ---');
    console.table(overviewCoupons);

    const settledLegs =
      Number(overviewLegs[0]?.won ?? 0) + Number(overviewLegs[0]?.lost ?? 0);
    if (settledLegs < minSample) {
      console.log(
        `Note: only ${settledLegs} settled leg(s). Segmented leg tables use MIN_SAMPLE=${minSample}; run with MIN_SAMPLE=1 to see per-segment rows.\n`,
      );
    }

    // --- Coupon-level (full acca) ---
    const coupons = await ds.query(
      `
      SELECT
        COALESCE(p.source, '(null)') AS source,
        COUNT(*)::int AS n,
        COUNT(*) FILTER (WHERE p.status = 'won')::int AS wins,
        ROUND(AVG(CASE WHEN p.status = 'won' THEN 1.0 ELSE 0.0 END)::numeric, 4) AS win_rate,
        ROUND(AVG(p.actual_result)::numeric, 4) AS avg_pnl_per_unit,
        ROUND(SUM(p.actual_result)::numeric, 2) AS total_pnl_units,
        ROUND(AVG(p.combined_odds)::numeric, 3) AS avg_combined_odds
      FROM predictions p
      JOIN tipsters t ON t.id = p.tipster_id
      WHERE p.status IN ('won', 'lost')
        ${dateFilterCoupon}
        ${aiClause}
      GROUP BY 1
      ORDER BY n DESC
      `,
    );

    console.log('--- Coupons (settled accas) by source ---');
    console.table(
      coupons.map((r: Record<string, unknown>) => ({
        source: r.source,
        n: r.n,
        wins: r.wins,
        win_rate: fmtPct(Number(r.win_rate)),
        avg_pnl_u: fmtNum(r.avg_pnl_per_unit, 4),
        total_pnl_u: fmtNum(r.total_pnl_units, 2),
        avg_odds: fmtNum(r.avg_combined_odds, 3),
      })),
    );

    // --- Leg-level: by source ---
    const legsBySource = await ds.query(
      `
      SELECT
        COALESCE(p.source, '(null)') AS source,
        COUNT(*)::int AS legs,
        COUNT(*) FILTER (WHERE pf.result_status = 'won')::int AS wins,
        ROUND(AVG(CASE WHEN pf.result_status = 'won' THEN 1.0 ELSE 0.0 END)::numeric, 4) AS win_rate,
        ROUND(AVG(pf.selection_odds)::numeric, 3) AS avg_leg_odds,
        ROUND(
          SUM(CASE WHEN pf.result_status = 'won' THEN pf.selection_odds - 1 ELSE -1 END)::numeric
          / NULLIF(COUNT(*), 0),
          4
        ) AS roi_flat_1u_per_leg
      FROM prediction_fixtures pf
      JOIN predictions p ON p.id = pf.prediction_id
      JOIN tipsters t ON t.id = p.tipster_id
      WHERE pf.result_status IN ('won', 'lost')
        ${dateFilterLeg}
        ${aiClause}
      GROUP BY 1
      HAVING COUNT(*) >= $1
      ORDER BY legs DESC
      `,
      [minSample],
    );

    console.log('--- Legs by source (flat 1u per leg ROI) ---');
    console.table(
      legsBySource.map((r: Record<string, unknown>) => ({
        source: r.source,
        legs: r.legs,
        wins: r.wins,
        win_rate: fmtPct(Number(r.win_rate)),
        avg_odds: fmtNum(r.avg_leg_odds, 3),
        roi_1u_leg: fmtNum(r.roi_flat_1u_per_leg, 4),
      })),
    );

    // --- Leg-level: by market (selected_outcome) ---
    const legsByMarket = await ds.query(
      `
      SELECT
        LOWER(TRIM(COALESCE(pf.selected_outcome, ''))) AS market,
        COUNT(*)::int AS legs,
        COUNT(*) FILTER (WHERE pf.result_status = 'won')::int AS wins,
        ROUND(AVG(CASE WHEN pf.result_status = 'won' THEN 1.0 ELSE 0.0 END)::numeric, 4) AS win_rate,
        ROUND(AVG(pf.selection_odds)::numeric, 3) AS avg_odds,
        ROUND(
          SUM(CASE WHEN pf.result_status = 'won' THEN pf.selection_odds - 1 ELSE -1 END)::numeric
          / NULLIF(COUNT(*), 0),
          4
        ) AS roi_flat_1u_per_leg
      FROM prediction_fixtures pf
      JOIN predictions p ON p.id = pf.prediction_id
      JOIN tipsters t ON t.id = p.tipster_id
      WHERE pf.result_status IN ('won', 'lost')
        ${dateFilterLeg}
        ${aiClause}
      GROUP BY 1
      HAVING COUNT(*) >= $1
      ORDER BY legs DESC
      `,
      [minSample],
    );

    console.log('--- Legs by market (selected_outcome) ---');
    console.table(
      legsByMarket.map((r: Record<string, unknown>) => ({
        market: r.market || '(empty)',
        legs: r.legs,
        wins: r.wins,
        win_rate: fmtPct(Number(r.win_rate)),
        avg_odds: fmtNum(r.avg_odds, 3),
        roi_1u_leg: fmtNum(r.roi_flat_1u_per_leg, 4),
      })),
    );

    // --- Leg-level: odds bucket ---
    const legsByOdds = await ds.query(
      `
      SELECT
        CASE
          WHEN pf.selection_odds < 1.5 THEN '<1.5'
          WHEN pf.selection_odds < 2.0 THEN '1.5–2'
          WHEN pf.selection_odds < 2.5 THEN '2–2.5'
          WHEN pf.selection_odds < 3.0 THEN '2.5–3'
          ELSE '3+'
        END AS odds_band,
        COUNT(*)::int AS legs,
        COUNT(*) FILTER (WHERE pf.result_status = 'won')::int AS wins,
        ROUND(AVG(CASE WHEN pf.result_status = 'won' THEN 1.0 ELSE 0.0 END)::numeric, 4) AS win_rate,
        ROUND(
          SUM(CASE WHEN pf.result_status = 'won' THEN pf.selection_odds - 1 ELSE -1 END)::numeric
          / NULLIF(COUNT(*), 0),
          4
        ) AS roi_flat_1u_per_leg
      FROM prediction_fixtures pf
      JOIN predictions p ON p.id = pf.prediction_id
      JOIN tipsters t ON t.id = p.tipster_id
      WHERE pf.result_status IN ('won', 'lost')
        ${dateFilterLeg}
        ${aiClause}
      GROUP BY 1
      HAVING COUNT(*) >= $1
      ORDER BY MIN(pf.selection_odds)
      `,
      [minSample],
    );

    console.log('--- Legs by selection odds band ---');
    console.table(
      legsByOdds.map((r: Record<string, unknown>) => ({
        band: r.odds_band,
        legs: r.legs,
        wins: r.wins,
        win_rate: fmtPct(Number(r.win_rate)),
        roi_1u_leg: fmtNum(r.roi_flat_1u_per_leg, 4),
      })),
    );

    // --- Leg-level: EV bucket (API hybrid) ---
    const legsByEv = await ds.query(
      `
      SELECT
        CASE
          WHEN pf.expected_value IS NULL THEN 'no EV'
          WHEN pf.expected_value > 0.02 THEN 'EV > +2%'
          WHEN pf.expected_value > 0 THEN 'EV 0–2%'
          WHEN pf.expected_value > -0.02 THEN 'EV -2–0%'
          ELSE 'EV < -2%'
        END AS ev_band,
        COUNT(*)::int AS legs,
        COUNT(*) FILTER (WHERE pf.result_status = 'won')::int AS wins,
        ROUND(AVG(CASE WHEN pf.result_status = 'won' THEN 1.0 ELSE 0.0 END)::numeric, 4) AS win_rate,
        ROUND(
          SUM(CASE WHEN pf.result_status = 'won' THEN pf.selection_odds - 1 ELSE -1 END)::numeric
          / NULLIF(COUNT(*), 0),
          4
        ) AS roi_flat_1u_per_leg
      FROM prediction_fixtures pf
      JOIN predictions p ON p.id = pf.prediction_id
      JOIN tipsters t ON t.id = p.tipster_id
      WHERE pf.result_status IN ('won', 'lost')
        ${dateFilterLeg}
        ${aiClause}
      GROUP BY 1
      HAVING COUNT(*) >= $1
      ORDER BY legs DESC
      `,
      [minSample],
    );

    console.log('--- Legs by stored expected_value band ---');
    console.table(
      legsByEv.map((r: Record<string, unknown>) => ({
        ev_band: r.ev_band,
        legs: r.legs,
        wins: r.wins,
        win_rate: fmtPct(Number(r.win_rate)),
        roi_1u_leg: fmtNum(r.roi_flat_1u_per_leg, 4),
      })),
    );

    // --- Top leagues (by volume) ---
    const legsByLeague = await ds.query(
      `
      SELECT
        COALESCE(pf.league_name, '(unknown)') AS league,
        COUNT(*)::int AS legs,
        COUNT(*) FILTER (WHERE pf.result_status = 'won')::int AS wins,
        ROUND(AVG(CASE WHEN pf.result_status = 'won' THEN 1.0 ELSE 0.0 END)::numeric, 4) AS win_rate,
        ROUND(
          SUM(CASE WHEN pf.result_status = 'won' THEN pf.selection_odds - 1 ELSE -1 END)::numeric
          / NULLIF(COUNT(*), 0),
          4
        ) AS roi_flat_1u_per_leg
      FROM prediction_fixtures pf
      JOIN predictions p ON p.id = pf.prediction_id
      JOIN tipsters t ON t.id = p.tipster_id
      WHERE pf.result_status IN ('won', 'lost')
        ${dateFilterLeg}
        ${aiClause}
      GROUP BY 1
      HAVING COUNT(*) >= $1
      ORDER BY legs DESC
      LIMIT 15
      `,
      [minSample],
    );

    console.log(`--- Top 15 leagues by settled leg count (min n=${minSample}) ---`);
    console.table(
      legsByLeague.map((r: Record<string, unknown>) => ({
        league: String(r.league).slice(0, 48),
        legs: r.legs,
        wins: r.wins,
        win_rate: fmtPct(Number(r.win_rate)),
        roi_1u_leg: fmtNum(r.roi_flat_1u_per_leg, 4),
      })),
    );

    // --- Tipster rollup (settled coupons) ---
    const byTipster = await ds.query(
      `
      SELECT
        t.username,
        t.is_ai,
        COUNT(*)::int AS coupons,
        COUNT(*) FILTER (WHERE p.status = 'won')::int AS wins,
        ROUND(AVG(CASE WHEN p.status = 'won' THEN 1.0 ELSE 0.0 END)::numeric, 4) AS win_rate,
        ROUND(AVG(p.actual_result)::numeric, 4) AS avg_pnl_per_unit
      FROM predictions p
      JOIN tipsters t ON t.id = p.tipster_id
      WHERE p.status IN ('won', 'lost')
        ${dateFilterCoupon}
        ${aiClause}
      GROUP BY t.id, t.username, t.is_ai
      HAVING COUNT(*) >= 3
      ORDER BY avg_pnl_per_unit DESC NULLS LAST
      LIMIT 20
      `,
    );

    console.log('--- Tipsters: top 20 by avg coupon P&L (min 3 settled coupons) ---');
    console.table(
      byTipster.map((r: Record<string, unknown>) => ({
        username: r.username,
        ai: r.is_ai,
        coupons: r.coupons,
        wins: r.wins,
        win_rate: fmtPct(Number(r.win_rate)),
        avg_pnl_u: fmtNum(r.avg_pnl_per_unit, 4),
      })),
    );

    console.log(
      '\nNotes: Leg ROI assumes 1 unit staked on each leg independently (not the acca product). Coupon metrics use predictions.actual_result (acca, 1u stake).\n',
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
