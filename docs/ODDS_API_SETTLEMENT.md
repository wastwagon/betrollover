# Odds API Settlement

## Overview

Non-football sports (basketball, rugby, MMA, hockey, american football, tennis) use **The Odds API** for events and scores. Settlement works in two steps:

1. **OddsApiSettlementService.syncResults()** — Fetches completed scores from The Odds API and marks `sport_events` as `FT` (finished).
2. **SettlementService.runSettlement()** — Finds pending picks on finished fixtures/events and settles them (won/lost).

## Important: 3-Day Window

The Odds API `/scores` endpoint only returns completed games from the **last 1–3 days** (`daysFrom` parameter, max 3). Matches older than 3 days are **not** returned by the API.

- **Cron:** Runs every 2 hours to reduce the chance of missing the window.
- **Manual:** When you run "Run Settlement" or "Sync Results & Settle", both steps run in sequence.

## Multi-Sport vs Football

- **Football** picks use `fixtures` (API-Football). Results are fetched via **Admin → Fixtures → "Fetch Results & Settle"** (or cron in FixtureScheduler). "Sync Results & Settle" on the **Multi-Sport** page does **not** fetch football results.
- **Basketball, Rugby, MMA, Hockey, American Football, Tennis** use `sport_events` and **The Odds API** for scores. **Volleyball** uses `sport_events` but results come from **API-Sports** (volleyball), not The Odds API.
- **Admin → Sports → "Sync Results & Settle"** runs: (1) Odds API scores for the six Odds API sports, (2) API-Sports volleyball results, (3) `runSettlement()` for **all** finished fixtures and events. So one click updates non-football events and then settles every pending pick on any finished fixture/event (including football picks whose fixture was already marked FT elsewhere).

For **mixed coupons** (e.g. football + basketball + tennis): use **Fixtures** to fetch football results first, then **Sports → Sync Results & Settle** to fetch other sports and run settlement. Or use **Dashboard → Run Settlement Now** which does not fetch new results but runs settlement on already-finished data.

## Manual Settlement Flow

When admin runs **Admin → Sports → "Sync Results & Settle"** (or Dashboard → Run Settlement Now):

1. `syncResults()` fetches scores from The Odds API (last 3 days) for basketball, rugby, MMA, hockey, american football, tennis.
2. `updateFinishedVolleyball()` fetches volleyball results from API-Sports.
3. `runSettlement()` settles picks on **all** finished fixtures (football) and finished sport_events (all other sports). Escrow is released/refunded for fully settled marketplace coupons.

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
