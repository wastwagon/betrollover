# Multi-Sport Implementation Plan & Phases

Implementation plan for expanding BetRollover to Basketball, Rugby, MMA, Volleyball, and Hockey. **Existing football features must remain unaffected.**

---

## Overview

| Phase | Sport | Timeline | Focus |
|-------|-------|----------|-------|
| **0** | Foundation | 1–2 weeks | Schema, config, shared infra |
| **1** | Basketball | 2–3 weeks | First new sport; v1.basketball (includes NBA); pattern for others |
| **2** | Rugby | 1–2 weeks | Reuse Basketball pattern |
| **3** | MMA | 1–2 weeks | Fights instead of games; minor adapters |
| **4** | Volleyball | 1–2 weeks | Same pattern as Rugby |
| **5** | Hockey | 1–2 weeks | Same pattern as Rugby |
| **6** | American Football | 1–2 weeks | NFL & NCAA; v1.american-football; 100 req/day Free |

**Total estimate:** 8–13 weeks. **API strategy:** One API per sport; Basketball covers NBA—no NBA API.

---

## Phase 0: Foundation (Before Any New Sport) ✅ DONE

**Goal:** Schema and config ready so new sports can be added without touching football.

### 0.1 Schema Changes

| Change | Detail |
|--------|--------|
| **Sport enum** | Add `sport_type` table or enum: `football`, `basketball`, `rugby`, `mma`, `volleyball`, `hockey`, `american_football` |
| **Unified event table** | Create `sport_events` (id, sport, api_id, league_id, home_team, away_team, event_date, status, raw_json, created_at, updated_at) as the single source for all sport events. Migrate football fixtures into this OR keep `fixtures` as football-only and add sport-specific tables (basketball_games, rugby_games, etc.). **Recommended:** Keep `fixtures` as football; add `sport_events` for new sports only. |
| **accumulator_tickets** | Already has `sport` column; ensure default `football` for existing rows. |
| **accumulator_picks** | Add `sport` column (default `football`). Add `event_id` (nullable) for non-football events. Keep `fixture_id` for football; for other sports, `event_id` points to sport_events.id. |
| **prediction_fixtures** | Add `sport` (default `football`), `event_id` (nullable). |

### 0.2 Config & Feature Flags

| Item | Detail |
|------|--------|
| **Enabled sports** | `ENABLED_SPORTS=football,basketball` (env or DB config). Football always enabled. |
| **API keys** | Extend `api_settings` or add `api_sport_config` table: sport, base_url, api_key, rate_limit_per_day. |
| **Sync schedule** | Per-sport cron keys: `fixtures_football`, `fixtures_basketball`, etc. |

### 0.3 Shared Interfaces

| Interface | Purpose |
|-----------|---------|
| `ISportEvent` | Common shape: id, sport, homeTeam, awayTeam, eventDate, status |
| `ISportOddsSync` | syncOdds(events), getOdds(eventId) |
| `ISportEventSync` | syncUpcomingEvents(leagueIds?, daysAhead?) |

### 0.4 Migration Strategy

- All migrations additive (no drop/rename of football columns).
- Default values so existing rows behave identically.
- Rollback plan: feature flag off + no new data written for new sports.

---

## Phase 1: Basketball

**Goal:** Basketball fixtures, odds, create-pick, marketplace, and (optional) odds-only AI tipsters.

### 1.1 API Integration

| Task | Detail |
|------|--------|
| **Basketball API client** | Use **`v1.basketball.api-sports.io` only**. Covers NBA + 420+ leagues. Do not add NBA API (`v2.nba.api-sports.io`)—redundant for fixtures/odds, wastes quota. |
| **Endpoints** | `GET /games?date=YYYY-MM-DD`, `GET /odds?game={id}`. |
| **Rate limiting** | 100 req/day (Free plan). Run fixtures first (7 dates), then cap odds sync to stay under quota. |

### 1.2 Backend

| Task | Detail |
|------|--------|
| **Entities** | `BasketballGame`, `BasketballGameOdd` (or use `sport_events` + `sport_event_odds` if unified). |
| **Sync** | `BasketballSyncService`: fetch games (next 7 days), store in `sport_events` or `basketball_games`. |
| **Odds sync** | `BasketballOddsSyncService`: fetch odds for games missing odds; store in sport_event_odds. |
| **Create-pick** | Extend accumulators API: accept `sport: 'basketball'`, resolve `event_id` from basketball games. |
| **Marketplace** | Filter by sport; basketball coupons visible when sport filter = basketball. |
| **Settlement** | Extend `SettlementService`: handle basketball game results (from basketball API) and settle basketball picks. |

### 1.3 AI Tipsters (Basketball)

- No predictions API for basketball → use **odds-only** logic (implied probability, EV).
- New config: `ai-tipsters-basketball.config.ts` with basketball leagues (NBA, EuroLeague, etc.).
- New engine: `BasketballPredictionEngineService` (simplified: no API predictions, only value from odds).

### 1.4 Frontend

| Task | Detail |
|------|--------|
| **Sport filter** | Marketplace, create-pick, discover: add sport dropdown/tabs (Football | Basketball). Default = Football. |
| **Create-pick** | Basketball tab: load basketball games, display odds, add to slip (same UX as football). |
| **Slip cart** | Extend to store `sport` per selection; support mixed-sport coupons or restrict to single sport per coupon (recommended: single sport). |

### 1.5 Testing & Rollout

- Feature flag `ENABLE_BASKETBALL=true`.
- Smoke test: sync 1 league, create basketball coupon, purchase, settle.
- Football regression: all existing flows unchanged.

---

## Phase 2: Rugby

**Goal:** Rugby games, odds, create-pick, marketplace, settlement. Reuse Phase 1 pattern.

### 2.1 API Integration

- `RugbyApiService` (api-sports.io/documentation/rugby/v1): games, odds.
- Same rate-limit and config approach as basketball.

### 2.2 Backend

- Entities: `RugbyGame` or `sport_events` with sport=rugby.
- `RugbySyncService`, `RugbyOddsSyncService`.
- Accumulators, marketplace, settlement: extend to `sport=rugby`.

### 2.3 Frontend

- Add Rugby to sport filter/tabs.
- Create-pick Rugby tab.

### 2.4 AI Tipsters (Optional)

- Odds-only rugby tipsters; config for top leagues (Premiership, Super Rugby, etc.).

---

## Phase 3: MMA

**Goal:** MMA fights, odds, create-pick, marketplace, settlement. Fights = 2 fighters instead of 2 teams.

### 3.1 Differences from Team Sports

| Aspect | Adaptation |
|--------|------------|
| **Event shape** | `home_fighter`, `away_fighter` (or `fighter1`, `fighter2`). |
| **Markets** | Moneyline (fighter A/B), method of victory, round, etc. |
| **Odds** | Same structure (bookmaker odds per market). |

### 3.2 Backend

- `MmaApiService` (api-sports.io/documentation/mma/v1): fights, odds.
- `sport_events` with sport=mma; `home_team`/`away_team` map to fighter names.
- Sync, odds, accumulators, settlement: same pattern, adapted for fight semantics.

### 3.3 Frontend

- MMA tab: display fights; market labels (Fighter A Win, Fighter B Win, etc.).

---

## Phase 4: Volleyball ✅ DONE

**Goal:** Volleyball games, odds, create-pick, marketplace, settlement. Same pattern as Rugby.

### 4.1 Backend

- `VolleyballApiService`, `VolleyballSyncService`, `VolleyballController`, `VolleyballModule`.
- Config: `volleyball-leagues.config.ts` (ENABLED_VOLLEYBALL_LEAGUES env).
- GET /volleyball/events?days=7, POST /admin/sport-sync/volleyball, cron 7:00 AM.
- Settlement, accumulators, marketplace: sport=volleyball.

### 4.2 Frontend

- Volleyball tab on create-pick and marketplace.

---

## Phase 5: Hockey ✅ DONE

**Goal:** Hockey games, odds, create-pick, marketplace, settlement. Same pattern as Rugby.

### 5.1 Backend

- `HockeyApiService`, `HockeySyncService`, `HockeyController`, `HockeyModule`.
- Config: `hockey-leagues.config.ts` (ENABLED_HOCKEY_LEAGUES env).
- GET /hockey/events?days=7, POST /admin/sport-sync/hockey, cron 7:15 AM.
- Settlement, accumulators, marketplace: sport=hockey.

### 5.2 Frontend

- Hockey tab on create-pick and marketplace.

---

## Phase 6: American Football (NFL & NCAA) ✅ DONE

**Goal:** NFL & NCAA games, odds, create-pick, marketplace, settlement. Same pattern as Basketball.

### 6.1 Backend

- `AmericanFootballApiService`, `AmericanFootballSyncService`, `AmericanFootballController`, `AmericanFootballModule`.
- Config: `american-football-leagues.config.ts` (ENABLED_AMERICAN_FOOTBALL_LEAGUES env).
- GET /american-football/events?days=7, POST /admin/sport-sync/american-football, cron 7:30 AM.
- Settlement, accumulators, marketplace: sport=american_football.
- Free plan may restrict date range; Pro plan recommended for full 7-day access.

### 6.2 Frontend

- American Football tab on create-pick and marketplace.

---

## Dependency Graph

```
Phase 0 (Foundation)
    │
    ├── Phase 1 (Basketball) ──────────────────┐
    │                                          │
    ├── Phase 2 (Rugby) ───────────────────────┤
    │   (depends on Phase 0; can start         │  All phases 2–5
    │    after Phase 1 pattern is proven)      │  reuse Phase 1 pattern
    │                                          │
    ├── Phase 3 (MMA) ─────────────────────────┤
    │   (minor adapter for fights)             │
    │                                          │
    ├── Phase 4 (Volleyball) ──────────────────┤
    │                                          │
    ├── Phase 5 (Hockey) ──────────────────────┤
    │                                          │
    └── Phase 6 (American Football) ───────────┘
```

---

## Safeguards Checklist (Every Phase)

- [ ] No changes to football sync schedule or logic
- [ ] No changes to football prediction engine
- [ ] Default sport = football for all existing UI paths
- [ ] Feature flag for new sport; can disable without code revert
- [ ] Migrations are additive; rollback = disable feature flag
- [ ] Football regression tests pass before and after each phase

---

## API-Sports Endpoints Reference (Dashboard: My Access)

| Sport | Base URL | Quota (Free) | Key Endpoints |
|-------|----------|--------------|---------------|
| Football | `v3.football.api-sports.io` | Pro 7,500 | Fixtures, Odds |
| Basketball | `v1.basketball.api-sports.io` | 100/day | Games, Odds (includes NBA) |
| Rugby | `v1.rugby.api-sports.io` | 100/day | Games, Odds |
| Hockey | `v1.hockey.api-sports.io` | 100/day | Games, Odds |
| Volleyball | `v1.volleyball.api-sports.io` | 100/day | Games, Odds |
| MMA | `v1.mma.api-sports.io` | 100/day | Fights, Odds |
| American Football | `v1.american-football.api-sports.io` | 100/day | Games, Odds |

**Basketball vs NBA:** Use Basketball API only. NBA API (`v2.nba.api-sports.io`) is redundant—same NBA games, separate quota. One API key for all sports.

---

## File Structure (Proposed)

```
backend/src/
├── modules/
│   ├── fixtures/           # Football only (unchanged)
│   ├── sport-events/       # NEW: unified event abstraction for new sports
│   │   ├── entities/
│   │   ├── sport-events.module.ts
│   │   └── ...
│   ├── basketball/
│   │   ├── basketball-api.service.ts
│   │   ├── basketball-sync.service.ts
│   │   ├── basketball-odds.service.ts
│   │   └── basketball.module.ts
│   ├── rugby/
│   │   └── ...
│   ├── mma/
│   │   └── ...
│   ├── volleyball/
│   │   └── ...
│   ├── hockey/
│   │   └── ...
│   └── accumulators/       # Extended to accept sport + event_id
```

---

## Summary

| Phase | Deliverable | Risk |
|-------|-------------|------|
| 0 | Schema, config, interfaces | Low |
| 1 | Basketball end-to-end | Medium (first new sport) |
| 2–5 | Rugby, MMA, Volleyball, Hockey | Low (pattern established) |

**Critical rule:** Each phase ships only when football regression passes and the new sport is feature-flagged off by default until QA sign-off.
