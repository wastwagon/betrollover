# API-Sports Multi-Sport: Fixtures & Odds (7-Day Approach)

Documentation for fetching fixtures/games and odds from API-Sports. **Same 7-day approach as Football** (today through today+6). Base URLs and quotas per API-Sports dashboard (My Access).

---

## Dashboard Reference (Source of Truth)

| Sport | Base URL | Plan | Quota/day |
|-------|----------|------|-----------|
| Football | `v3.football.api-sports.io` | Pro | 7,500 |
| Basketball | `v1.basketball.api-sports.io` | Free | 100 |
| NBA (dedicated) | `v2.nba.api-sports.io` | Free | 100 |
| Rugby | `v1.rugby.api-sports.io` | Free | 100 |
| Hockey | `v1.hockey.api-sports.io` | Free | 100 |
| Volleyball | `v1.volleyball.api-sports.io` | Free | 100 |
| MMA | `v1.mma.api-sports.io` | Free | 100 |
| American Football (NFL) | `v1.american-football.api-sports.io` | Free | 100 |

**Basketball vs NBA – use one source:** Use **Basketball API only**. It covers NBA, EuroLeague, African leagues, 420+ leagues. NBA API is redundant for fixtures/odds; use only if you need NBA-specific deep data later. See §3.

---

## Quick Reference – Endpoints

| Sport | Base URL | Fixtures/Games | Odds |
|-------|----------|----------------|------|
| Football | `v3.football.api-sports.io` | `GET /fixtures?date=YYYY-MM-DD` | `GET /odds?fixture={id}` |
| Basketball | `v1.basketball.api-sports.io` | `GET /games?date=YYYY-MM-DD` | `GET /odds?game={id}` |
| Rugby | `v1.rugby.api-sports.io` | `GET /games?date=YYYY-MM-DD` | `GET /odds?game={id}` |
| Hockey | `v1.hockey.api-sports.io` | `GET /games?date=YYYY-MM-DD` | `GET /odds?game={id}` |
| Volleyball | `v1.volleyball.api-sports.io` | `GET /games?date=YYYY-MM-DD` | `GET /odds?game={id}` |
| MMA | `v1.mma.api-sports.io` | `GET /fights?date=YYYY-MM-DD` | `GET /odds?fight={id}` or `?game=` |
| American Football | `v1.american-football.api-sports.io` | `GET /games?date=YYYY-MM-DD` or `?season=&week=` | `GET /odds?game={id}` |

**7-day flow:** For each date in `[today, today+1, …, today+6]`, fetch fixtures/games for that date, filter by enabled leagues, upsert into DB, then fetch odds for events missing odds.

---

## 1. Authentication

**Header (all sports):**
```
x-apisports-key: YOUR_API_KEY
```

**Key source:** Admin → API Settings (`apiSportsKey`) or `API_SPORTS_KEY` env. Same key works across Football, Basketball, Rugby, etc. (dashboard.api-football.com).

---

## 2. Football (Existing – Reference)

| Endpoint | URL | Params | Response |
|----------|-----|--------|----------|
| Fixtures | `GET /fixtures?date={YYYY-MM-DD}` | date | `response[].fixture.id`, `teams.home/away`, `league`, `goals` |
| Odds | `GET /odds?fixture={fixture_id}` | fixture | `response[].bookmakers[].bets[]` |

**7-day flow:**
1. Loop dates: today to today+6 (UTC).
2. For each date: `GET /fixtures?date=YYYY-MM-DD`.
3. Filter by enabled leagues.
4. Upsert fixtures.
5. Sync odds for fixtures without odds (up to N per run).

**Base URL:** `https://v3.football.api-sports.io`

---

## 3. Basketball ✅ Verified (includes NBA)

**Base URL:** `https://v1.basketball.api-sports.io`

**Use this API for all basketball including NBA.** Do not add `v2.nba.api-sports.io` for fixtures/odds—it duplicates NBA coverage and uses a separate 100 req/day quota. Basketball API is more efficient (one API, one quota, 420+ leagues).

| Endpoint | URL | Params | Notes |
|----------|-----|--------|-------|
| Games | `GET /games?date={YYYY-MM-DD}` | date | Returns hundreds of games per date |
| Odds | `GET /odds?game={game_id}` | game | Pre-match/live odds |

**Response shape (games) – verified:**
```json
{
  "response": [
    {
      "id": 470281,
      "date": "2026-02-21T00:00:00+00:00",
      "teams": { "home": { "id": 161, "name": "Washington Wizards" }, "away": { "id": 143, "name": "Indiana Pacers" } },
      "league": { "id": 12, "name": "NBA" },
      "status": { "short": "NS" },
      "scores": { "home": { "total": 131 }, "away": { "total": 118 } }
    }
  ]
}
```
- `response[].id` – game ID (use for odds)
- `response[].teams.home.name`, `response[].teams.away.name`
- `response[].league.id`, `response[].league.name`
- `response[].status.short` – NS, FT, etc.
- `response[].date` – ISO timestamp

**Odds response:** `response[].bookmakers[].bets[].values[]` – each has `value` (e.g. "Home", "Away") and `odd`.

**7-day flow (same as Football):**
1. Loop dates: today to today+6 (UTC).
2. For each date: `GET /games?date=YYYY-MM-DD`.
3. Filter by enabled basketball leagues.
4. Upsert into `sport_events` (sport='basketball').
5. Find events without odds; for each: `GET /odds?game={id}`.
6. Store in `sport_event_odds`.

---

## 4. Rugby ✅ Verified

**Base URL:** `https://v1.rugby.api-sports.io`

| Endpoint | URL | Params | Notes |
|----------|-----|--------|-------|
| Games | `GET /games?date={YYYY-MM-DD}` | date | Same pattern as basketball |
| Odds | `GET /odds?game={game_id}` | game | Pre-match/live odds |

**Response:** `response[].id`, `teams.home/away`, `league`, `status.short`, `scores.home/away` (single number). **7-day flow:** Same as Basketball.

---

## 5. Hockey

**Base URL:** `https://v1.hockey.api-sports.io`

| Endpoint | URL | Params | Notes |
|----------|-----|--------|-------|
| Games | `GET /games?date={YYYY-MM-DD}` | date | Same pattern |
| Odds | `GET /odds?game={game_id}` | game | Pre-match/live odds |

**7-day flow:** Same as Basketball. Store in `sport_events` (sport='hockey').

---

## 6. Volleyball

**Base URL:** `https://v1.volleyball.api-sports.io`

| Endpoint | URL | Params | Notes |
|----------|-----|--------|-------|
| Games | `GET /games?date={YYYY-MM-DD}` | date | Same pattern |
| Odds | `GET /odds?game={game_id}` | game | Pre-match/live odds |

**7-day flow:** Same as Basketball.

---

## 7. American Football (NFL & NCAA)

**Base URL:** `https://v1.american-football.api-sports.io` (per API-Sports dashboard)

| Endpoint | URL | Params | Notes |
|----------|-----|--------|-------|
| Games | `GET /games?date={YYYY-MM-DD}` | date | Date-based (recommended for 7-day flow) |
| Games | `GET /games?season={YYYY}&week={N}` | season, week | Alternative: week-based (NFL structure) |
| Odds | `GET /odds?game={game_id}` | game | Pre-match & live odds |

**Fixture frequency (best practice):**
- **NFL:** ~15–16 games/week. Season Sep–Jan (regular), playoffs through early Feb. Games: Thu (1 TNF), Sun (14–16), Mon (1–2 MNF), Sat in weeks 16–18. Off-season Feb–Aug: no games.
- **NCAA:** 30–60+ games/week on Thu/Fri/Sat. Season Aug–Jan. Off-season Feb–Jul: mostly empty.
- **Combined:** Peak Aug–Feb, sparse Mar–Jul.

**7-day flow (recommended):**
1. Same as Basketball: loop dates `today` to `today+6`, `GET /games?date=YYYY-MM-DD`.
2. Filter by enabled leagues (NFL, NCAA conferences).
3. Upsert into `sport_events` (sport='american_football').
4. Find events without odds; for each: `GET /odds?game={id}`.
5. Store in `sport_event_odds`.

**Best practice:**
- **Sync cadence:** Daily. Lighter load than Basketball (fewer games per day).
- **Off-season (Mar–Jul):** Run sync anyway; API returns empty, minimal quota cost.
- **Odds:** Usually available 1–7 days before kickoff; sync same run as fixtures.
- **Free plan (100 req/day):** Limit odds sync (e.g. max 50 events/run) or use 3–4 day lookahead; 7 fixture requests + ~65 odds can exceed 100. Prioritise fixture sync, then odds for upcoming games only.
- **Free plan date restriction:** NFL Free may limit fixture dates (e.g. to a narrow window). Error `"plan":"Free plans do not have access to this date"` indicates upgrade needed for full 7-day access.

---

## 8. MMA

**Base URL:** `https://v1.mma.api-sports.io`

| Endpoint | URL | Params | Notes |
|----------|-----|--------|-------|
| Fights | `GET /fights?date={YYYY-MM-DD}` | date | May use "fights" not "games" |
| Odds | `GET /odds?fight={fight_id}` or `?game=...` | fight/game | Check docs for param name |

**Note:** MMA uses "fights" and "fighters" instead of games/teams. Map to `sport_events`: home_team=fighter1, away_team=fighter2. Verify endpoint names in dashboard live tester.

---

## 9. Common Pattern (All Sports)

```
FOR each date in [today .. today+6]:
  1. GET /{resource}?date={YYYY-MM-DD}
     - Football: /fixtures
     - Basketball, Rugby, Hockey, Volleyball, American Football: /games
     - MMA: /fights (or /games if unified)
  2. Filter by enabled leagues (sport-specific config)
  3. Upsert into DB (fixtures for football, sport_events for others)
  4. Identify events without odds
  5. For each (up to limit): GET /odds?{resource}_id={id}
  6. Store odds (fixture_odds for football, sport_event_odds for others)
```

---

## 10. Rate Limits & Quotas

- **Shared key:** One API key for all sports. Each sport has its own plan and daily quota.
- **Per-sport quotas (from dashboard):**
  - Football (Pro): 7,500/day
  - Basketball, Rugby, Hockey, Volleyball, MMA, NFL (Free): 100/day each
- **Recommendation:** Run football sync first (priority). Then basketball, rugby, etc. with delay between requests (e.g. 150ms).
- **NFL Free (100/day):** Use 3–4 day lookahead or cap odds sync to stay under 100 (7 fixture + ~60 odds ≈ 67; leave headroom).

---

## 11. Verification Checklist

- [x] Basketball: `GET /games?date=YYYY-MM-DD` – verified (532 games for sample date)
- [x] Basketball: `GET /odds?game={id}` – verified (bookmaker bets)
- [x] Rugby: `GET /games?date=YYYY-MM-DD` – verified
- [ ] Hockey: same pattern (not yet tested)
- [ ] Volleyball: same pattern
- [ ] MMA: endpoint may use `/fights` – verify in dashboard
- [x] American Football: base URL `v1.american-football.api-sports.io` – verified; Free plan may restrict date range

---

## 12. Centralized Limits (Pro Upgrade Ready)

All sync and API limits are configured in `backend/src/config/api-limits.config.ts`. Set `API_SPORTS_PLAN=pro` in `.env` to use Pro defaults (higher limits, lower delays).

| Config | Free default | Pro default | Env override |
|--------|--------------|-------------|--------------|
| Lookahead days | 7 | 7 | `API_SYNC_LOOKAHEAD_DAYS` |
| Max odds events per run | 50 | 300 | `API_MAX_ODDS_EVENTS_PER_RUN` |
| Max football odds fixtures | 100 | 300 | `API_MAX_FOOTBALL_ODDS_FIXTURES` |
| League backfill per run | 30 | 50 | `API_MAX_LEAGUE_BACKFILL_PER_RUN` |
| API call delay (ms) | 350 | 100 | `API_CALL_DELAY_MS` |
| Prediction delay (ms) | 150 | 100 | `API_PREDICTION_DELAY_MS` |
| Fixtures to update per run | 50 | 100 | `API_MAX_FIXTURES_UPDATE_PER_RUN` |

---

## 13. References

- [API-Sports Basketball](https://api-sports.io/sports/basketball) – use for NBA + all leagues
- [API-Sports Rugby](https://api-sports.io/sports/rugby)
- [API-Sports Hockey](https://api-sports.io/sports/hockey)
- [API-Sports Volleyball](https://api-sports.io/sports/volleyball)
- [API-Sports MMA](https://api-sports.io/sports/mma)
- [API-Sports NFL & NCAA](https://api-sports.io/sports/nfl)
- [API Documentation (Basketball v1)](https://api-sports.io/documentation/basketball/v1)
- [Dashboard – My Access](https://dashboard.api-football.com/) – base URLs, quotas, Live Tester
