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

## Why didn’t automatic settlement run?

Automatic settlement for tennis (and other Odds API sports) can miss events for these reasons:

1. **3-day window** — The Odds API `/scores` endpoint is called with `daysFrom=3`. It only returns matches **completed in the last 3 days**. If the match finished more than 3 days ago, or the cron didn’t run within that window, the API never returns it and we never mark the event FT.
2. **Sport key / tournament** — We only fetch scores for **active** tennis (and other) sport keys (e.g. `tennis_atp_*`, `tennis_wta_*`). If the tournament wasn’t in the active list when the event was created or when the cron ran, we don’t request scores for that key.
3. **API didn’t include the match** — The API may not return every completed match (e.g. smaller tournaments, or delayed result ingestion). If the match isn’t in the response, we can’t update it.
4. **Matching failed** — We match by `(sport, apiId)` or by `(homeTeam, awayTeam, eventDate)`. If the API returns a slightly different name (e.g. `"Fucsovics M."` vs `"Marton Fucsovics"`), the fallback match can fail. **Date matching** used to use `event_date::date`, which depended on the DB session timezone; for events only ~24h old this could be off by one day. The fallback now uses `(event_date AT TIME ZONE 'UTC')::date` so the API’s UTC date and the stored event date are compared in UTC.
5. **Rate limiting (429)** — Your logs show `[OddsSyncService] Failed to fetch odds for fixture ... 429`. That’s the **football odds** sync hitting rate limits. The same API key is often used for tennis. If the **scores** request for tennis also gets 429, we log `Scores fetch failed for tennis_xxx: 429` and get no results, so no tennis events are updated that run. Reducing football odds request volume or using a separate key for tennis can help.

The Nest log line `Settlement: 947 finished sport_events, 0 pending fixture picks, 0 pending event picks` means: at that run there were no **pending** picks left to settle. So either the two tennis events were never marked FT (so their picks were never in the “pending event picks” set), or they were already settled (e.g. manually). For “auto didn’t work”, the usual case is (1) or (4) or (5): window, matching, or 429.

**What to do:** Use **manual settlement** (Admin → Sports → Tennis → Settle) when a match is over but still PENDING. Optionally run **Sync Results & Settle** soon after matches finish (within 3 days) to maximise the chance the API returns them.

## Quick fix: tennis (or other) events over but still PENDING

If matches are already finished but the Odds API did not settle them (e.g. outside the 3-day window or API didn’t return them):

1. **Admin → Sports** (Multi-Sport page).
2. Select **Tennis** (or the sport).
3. Set the **days** filter to **7** or **14** and click **Refresh** so the events list includes the match date.
4. Find the match in the table (e.g. "Marton Fucsovics vs Arthur Fils"). If status is not **FT**, you’ll see a **Settle** button.
5. Click **Settle**, enter **Home score** and **Away score** (for tennis: **sets won** by each player, e.g. 2–0 or 2–1).
6. Click **Settle**. The event is marked FT and settlement runs; all pending picks on that event are resolved (won/lost) and coupons that are fully settled will release escrow.

Repeat for each event that is over but still PENDING. For "Match Winner" tennis picks, the winner is the player with the higher sets; enter sets so that the correct player has the higher score (home/away is as stored in the event).

## Environment

- `ODDS_API_KEY` — Required for all Odds API sports.
- `TENNIS_ODDS_API_KEY` — Optional override for tennis (same key as ODDS_API_KEY).
- `ENABLE_SCHEDULING=true` — Required for cron jobs (results sync every 2h).
