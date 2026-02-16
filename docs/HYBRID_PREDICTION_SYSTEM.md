# Hybrid AI Prediction System

This document describes the prediction system implemented from the `football-tipster-hybrid` package, adapted for the BetRollover NestJS/Next.js stack.

## Overview

The system uses a **hybrid approach**:
1. **API-Football Predictions** – Fetches AI predictions from the `/predictions?fixture={id}` endpoint (6 algorithms, team form, H2H, etc.)
2. **Value Filtering** – Matches API probabilities with bookmaker odds, calculates Expected Value
3. **Fallback** – When API predictions are unavailable, uses implied probability from odds + small edge

## Flow

1. **Odds sync** – Ensures upcoming fixtures have odds (syncs up to 30 fixtures without odds on manual run)
2. **API predictions** – Fetches predictions for each fixture (1 request per fixture, 150ms delay)
3. **Fixture-level candidates** – For each fixture, builds candidates:
   - If API has outcome (home/draw/away/over25/under25/btts): use API probability
   - Else: use implied prob from odds
4. **EV calculation** – `EV = (probability × odds) - 1`
5. **Tipster filter** – Each tipster filters by:
   - `min_api_confidence` (when using API) or `min_win_probability` (internal)
   - `target_odds_min` / `target_odds_max`
   - `min_expected_value`
   - Leagues, bet types, selection filters
6. **2-fixture acca** – Best 2 legs by combined EV + probability score
7. **Save** – Predictions saved with `source`: `api_football` or `internal`

## Configuration

### AI Tipsters (`backend/src/config/ai-tipsters.config.ts`)

**25 tipsters with date-aligned names and profit focus:**

| Type | Count | Selection focus |
|------|-------|-----------------|
| **Weekly** | 4 | 1 pick per day, very selective (Weekly Premium, Bankroll, Steady, Elite) |
| **Weekend** | 4 | Sat/Sun fixtures only (Value, EPL, La Liga, Bundesliga) |
| **Midweek** | 2 | Tue/Wed/Thu fixtures (Champions League, Europa, cups) |
| **Daily** | 4 | All days when value appears (Value, Value Hunter, Form, Stats) |
| **Market** | 3 | BTTS, Over 2.5, Under 2.5 specialists |
| **League** | 3 | Serie A, Ligue 1, Championship |
| **Style** | 5 | Home Win, Underdog, High Odds, Acca, Big 6 |

- `fixture_days`: `'weekend'` (Sat/Sun) or `'midweek'` (Tue/Wed/Thu) – filters by fixture kickoff day
- `min_api_confidence`: ~0.5–0.65 depending on risk level

### API-Football

- Requires API-Sports key (Admin → API Settings or `API_SPORTS_KEY` env)
- Predictions endpoint: `GET https://v3.football.api-sports.io/predictions?fixture={id}`
- ~1 request per fixture; rate limit 150ms between requests

## Database

### New/Updated Tables (migration `024_hybrid_predictions_tables.sql`)

- `predictions.source` – `api_football` | `internal`
- `generation_logs` – Logs each run (status, count, API requests, errors)
- `admin_actions` – Audit trail for admin actions

## Endpoints

- `POST /admin/predictions/generate` – Manual trigger (optionally `?date=YYYY-MM-DD`)
- `GET /admin/predictions/generation-logs` – View recent generation logs

## Cron Schedule (Automatic Generation)

Predictions are generated automatically like fixtures—no admin action required:

| Time | Job | Description |
|------|-----|-------------|
| **6:00 AM** | Fixtures sync | 7 days ahead |
| **7:00 AM** | Odds force refresh | BTTS, Correct Score, etc. |
| **9:00 AM** | **Prediction generation** | Main run for all 25 AI tipsters |
| **11:00 AM** | **Prediction catch-up** | Runs only if today has 0 predictions (handles 9 AM failures or late fixture/odds sync) |

- **All 25 tipsters post daily** when API-Football has predictions. Each tipster posts only when they find qualifying value (EV, odds, leagues). No random variety or day restrictions.
- Uses `sync_status` (type `predictions`) for consistency with fixtures/odds—visible in Admin sync status
- `isSyncRunning` guard prevents overlapping runs
- Stale run detection: if a run is "running" for >1 hour, a new run is allowed

## Features from football-tipster-hybrid

| Feature | Status |
|---------|--------|
| API-Football predictions | ✅ Implemented |
| Value betting (EV filter) | ✅ Implemented |
| 25 AI tipsters (all post daily when API has predictions) | ✅ Implemented |
| 2-fixture accumulators | ✅ Existing |
| Posted timestamp on coupon cards | ✅ Implemented |
| Generation logs | ✅ Implemented |
| Admin actions audit | ✅ Implemented |
| Daily performance | ✅ Via `tipster_performance_log` |
| Odds sync before generation | ✅ Implemented |
