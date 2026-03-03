# Settlement Pipeline Review

## Overview

Settlement determines the final outcome (won/lost/void) of each pick in a coupon and settles escrow for marketplace purchases. All sports must complete two stages:

1. **Results sync** — Fetch final scores from external APIs and update fixtures/sport_events
2. **Settlement** — Match pending picks to finished events, apply `determinePickResult`, update tickets and escrow

---

## Pipeline by Sport

| Sport | Table | Results Source | Sync Schedule | Notes |
|-------|-------|----------------|---------------|-------|
| Football | `fixtures` | API-Sports | Every 5 min | `FixtureUpdateService.updateFinishedFixtures()` |
| Volleyball | `sport_events` | API-Sports | Every 2 hours | `VolleyballSyncService.updateFinishedVolleyball()` |
| Basketball | `sport_events` | The Odds API | Every 2 hours | `OddsApiSettlementService.syncResults()` |
| Rugby | `sport_events` | The Odds API | Every 2 hours | Same |
| MMA | `sport_events` | The Odds API | Every 2 hours | Same |
| Hockey | `sport_events` | The Odds API | Every 2 hours | Same |
| American Football | `sport_events` | The Odds API | Every 2 hours | Same |
| Tennis | `sport_events` | The Odds API | Every 2 hours | Same |

---

## Failure Points

### 1. Results not written to DB

**Football**
- `fixtures?ids=` must use **comma-separated** IDs (API-Football docs). Hyphen-separated fails for multiple fixtures.
- Requires `API_SPORTS_KEY` / `apiSportsKey` in api_settings.

**Odds API sports**
- Requires `ODDS_API_KEY`.
- Event matching: `(sport, apiId)` or `raw_json->>'id' = result.id`.
- Scores endpoint returns events from last 3 days (`daysFrom=3`). Older matches need manual settlement.

**Volleyball**
- Uses same API key as football.
- Fetches `games?date=YYYY-MM-DD` for past dates with unfinished events.

### 2. Picks not linked

- Picks must have `fixtureId` (football) or `eventId` (others). Orphaned picks (`fixture_id` and `event_id` both null) can never settle.
- Check diagnostic: `orphanedPicks` count.

### 3. Unfinished events without scores

- Fixtures/events with `match_date`/`event_date` > 2 hours ago but no scores — results sync failed.
- Check diagnostic: `unfinishedFixturesNoScores`, `unfinishedEventsNoScores`.

### 4. Prediction format not matched

- `determinePickResult` must parse the `prediction` string. Unsupported formats log "Unmatched prediction".
- Supported: Match Winner, Double Chance, Over/Under, BTTS, Handicap, Correct Score, etc. See `SETTLEMENT_SUPPORTED_MARKETS`.

---

## Diagnostic Endpoint

`GET /admin/settlement/diagnostic` returns:

| Field | Meaning |
|-------|---------|
| `pendingFixturePicks` | Football picks waiting for scores |
| `pendingEventPicks` | Non-football picks waiting for scores |
| `orphanedPicks` | Picks with no fixture/event link — cannot settle |
| `ftFixturesWithScores` | Football fixtures ready for settlement |
| `ftEventsWithScores` | Sport events ready for settlement |
| `unfinishedFixturesNoScores` | Football: past matches still missing scores |
| `unfinishedEventsNoScores` | Others: past events still missing scores |
| `apiSportsKeyConfigured` | Football + Volleyball API key set |
| `oddsApiKeyConfigured` | Odds API key set |

---

## Manual Settlement

1. **Run Settlement** — Admin → Dashboard → "Run Settlement Now". Syncs Odds API + Volleyball results, then runs settlement.
2. **Manual sport event** — For events >3 days old (Odds API limit) or API failures: `POST /admin/sport-events/:id/settle` with `{ homeScore, awayScore }`.

---

## Logging

Settlement logs (when `LOG_LEVEL=debug` or when picks/tickets change):

- `Settlement: X finished fixtures, Y total`
- `Settlement: X finished sport_events, Y pending fixture picks, Z pending event picks`
- `Settlement: X picks updated, Y tickets settled`
- `Unmatched prediction: "..."` — prediction format not supported
