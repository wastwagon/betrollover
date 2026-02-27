# Odds API Settlement

## Overview

Non-football sports (basketball, rugby, MMA, hockey, american football, tennis) use **The Odds API** for events and scores. Settlement works in two steps:

1. **OddsApiSettlementService.syncResults()** — Fetches completed scores from The Odds API and marks `sport_events` as `FT` (finished).
2. **SettlementService.runSettlement()** — Finds pending picks on finished fixtures/events and settles them (won/lost).

## Important: 3-Day Window

The Odds API `/scores` endpoint only returns completed games from the **last 1–3 days** (`daysFrom` parameter, max 3). Matches older than 3 days are **not** returned by the API.

- **Cron:** Runs every 2 hours to reduce the chance of missing the window.
- **Manual:** When you run "Run Settlement" or "Sync Results & Settle", both steps run in sequence.

## Manual Settlement Flow

When admin runs settlement (Dashboard or Admin → Sports → "Sync Results & Settle"):

1. `syncResults()` fetches scores from The Odds API (last 3 days).
2. `runSettlement()` settles picks on all finished fixtures and events.

## Manual Override for Old Matches

If a match is **older than 3 days** and the API no longer returns it, use the manual settle endpoint:

```
POST /admin/sport-events/:id/settle
Body: { "homeScore": 0, "awayScore": 2 }
```

- **Tennis:** Use sets won (e.g. Jack Draper won 2–0 → `homeScore: 0`, `awayScore: 2`).
- **Other sports:** Use points/goals (e.g. basketball 108–95 → `homeScore: 108`, `awayScore: 95`).

To find the event ID: check the coupon/pick detail (`eventId`) or Admin → Sports → select sport → events table.

## Environment

- `ODDS_API_KEY` — Required for all Odds API sports.
- `TENNIS_ODDS_API_KEY` — Optional override for tennis (same key as ODDS_API_KEY).
- `ENABLE_SCHEDULING=true` — Required for cron jobs (results sync every 2h).
