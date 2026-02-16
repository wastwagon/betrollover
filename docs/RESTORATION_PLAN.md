# BetRollover Restoration Plan

**Last Updated:** 2025-02-15  
**Status:** Active restoration – leagues, fixtures, odds, settlement, coupons marketplace

---

## 1. Executive Summary

This document outlines the full restoration plan for BetRollover, covering:

| Component | Status | Notes |
|-----------|--------|-------|
| **Leagues & Competitions** | Partial → Full | Run `generate-leagues-migration.ts` for API-Football coverage |
| **Fixtures Fetching** | ✅ Restored | FootballSyncService + FixtureSchedulerService |
| **Odds Fetching** | ✅ Restored | OddsSyncService (on-demand + batch) |
| **Settlement** | ✅ Restored | SettlementService + cron triggers |
| **Coupons Marketplace** | ✅ Restored | AccumulatorsService, marketplace page, purchase flow |

---

## 2. Leagues & Competitions (API-Football Coverage)

### 2.1 Current State

- **Init (12-enabled-leagues-market-config.sql):** 14 leagues (Big 5 + UCL/UEL/UECL + 2nd tiers)
- **015_add_more_leagues:** +15 (Championship, Primeira Liga, African leagues, etc.)
- **016_add_brazil_argentina_australia:** +Brazil, Argentina, Australia 2nd tier
- **017_add_100_leagues_all_inclusive:** +~80 leagues (Europe, Asia, Americas, Africa, Oceania)
- **020_add_international_tournaments:** World Cup, Euros, Africa Cup
- **027_add_germany_3_liga:** Germany 3. Liga

**Total:** ~100+ leagues manually added. **Not** all professional leagues from API-Football.

### 2.2 Target: All Professional Leagues (API-Football)

Use the **API-driven script** to generate a comprehensive migration:

```bash
# Requires API_SPORTS_KEY or API_FOOTBALL_KEY in .env
cd /path/to/BetRolloverNew
npx ts-node scripts/generate-leagues-migration.ts
```

**Output:** `database/migrations/026_comprehensive_professional_leagues.sql`

**Script behavior:**
- Fetches `GET /leagues?type=league&current=true` and `GET /leagues?type=cup&current=true`
- Excludes: youth (U17–U23), women's, reserve, regional, amateur, 4th+ divisions
- Includes: top divisions, 2nd/3rd tiers, major cups (UCL, UEL, Copa Libertadores, etc.), international tournaments
- Uses `ON CONFLICT (api_id) DO UPDATE` so it merges with existing leagues

### 2.3 Apply Comprehensive Leagues

```bash
# With Docker
docker compose exec -T postgres psql -U betrollover -d betrollover < database/migrations/026_comprehensive_professional_leagues.sql

# Or direct psql
psql -h localhost -p 5435 -U betrollover -d betrollover -f database/migrations/026_comprehensive_professional_leagues.sql
```

Then: **Admin → Fixtures → Sync Fixtures**

### 2.4 Verification

- Admin → Fixtures → Sync Fixtures
- Check fixture count and country filter dropdown
- Leagues with no fixtures (off-season) can be set `is_active = false` if needed

---

## 3. Fixtures Fetching

### 3.1 Flow (Restored)

| Service | Responsibility |
|---------|----------------|
| **FootballSyncService** | Syncs fixtures for enabled leagues (today + 6 days) |
| **FixtureUpdateService** | Updates live (`/fixtures/live`) and finished fixtures |
| **FixtureSchedulerService** | Cron jobs for sync and updates |

### 3.2 Cron Schedule

| Job | Cron | Description |
|-----|------|-------------|
| Live fixture update | `*/5 * * * *` | Every 5 min – updates scores for live matches |
| Finished fixture update | `*/5 * * * *` | Every 5 min – fetches FT results for past matches |
| Daily fixture sync | `0 6 * * *` | 6 AM – full fixture sync for enabled leagues |
| Odds sync | `0 */2 * * *` | Every 2 hours – odds for upcoming fixtures without odds |
| Odds refresh | `0 5 * * *` | 5 AM – force refresh odds (BTTS, Correct Score, etc.) |

### 3.3 API Usage

- **Fixtures:** `GET /fixtures?date=YYYY-MM-DD` (filtered by enabled leagues in code)
- **Live:** `GET /fixtures/live` (single call for all live matches)
- **Finished:** `GET /fixtures?id=id1,id2,...` (batch by comma-separated IDs)

---

## 4. Odds Fetching

### 4.1 Flow (Restored)

| Trigger | Service | Endpoint |
|---------|---------|----------|
| User loads fixture | `FixturesService.getById()` | Auto-calls `OddsSyncService.syncOddsForFixture()` if odds empty |
| Admin Sync Fixtures | `FixturesController.sync()` | After fixture sync, auto-syncs odds for next 24h fixtures (limit 50) |
| Admin Sync Odds | `POST /fixtures/sync/odds` | Manual batch sync (fixtures without odds, or force refresh) |
| Cron | `FixtureSchedulerService` | Every 2h for fixtures without odds; daily force refresh |

### 4.2 Market Filtering

- **MarketFilterService** filters API response by `market_config` (Tier 1 + Tier 2)
- Tier 1: Match Winner, Goals Over/Under, Both Teams To Score
- Tier 2: Double Chance, Correct Score, Half-Time/Full-Time
- Best odds across bookmakers (no bookmaker stored)

### 4.3 On-Demand Odds

- `GET /fixtures/:id` with `loadOdds=true` (default) → if no odds, fetches from API and saves
- `POST /fixtures/:id/odds` → explicit sync for a single fixture

---

## 5. Settlement

### 5.1 Flow (Restored)

| Step | Description |
|------|-------------|
| 1 | Fixture status = `FT` and scores available |
| 2 | `SettlementService.runSettlement()` finds pending picks on those fixtures |
| 3 | `determinePickResult()` maps prediction → won/lost |
| 4 | When all picks in accumulator settled → ticket result = won/lost/void |
| 5 | If marketplace coupon with price > 0 → settle escrow (payout tipster or refund buyer) |

### 5.2 Supported Markets

- Match Winner (1X2): Home, Away, Draw
- Double Chance: 1X, X2, 12
- Both Teams To Score: Yes, No
- Goals Over/Under: 1.5, 2.5, 3.5
- Correct Score: e.g. 2-1, 1-1

### 5.3 Triggers

- After live fixture update (every 5 min)
- After finished fixture update (every 5 min)
- Manual: `POST /admin/settlement/run` (Admin only)

---

## 6. Coupons Marketplace

### 6.1 Components (Restored)

| Component | Location | Purpose |
|-----------|----------|---------|
| **Schema** | `accumulator_tickets`, `pick_marketplace`, `escrow_funds` | Coupons, listings, escrow |
| **Create Pick** | `AccumulatorsService.create()` | `isMarketplace` flag, ROI check for paid |
| **Marketplace API** | `GET /accumulators/marketplace` | List active coupons |
| **Purchase** | `POST /accumulators/:id/purchase` | Buy coupon, escrow funds |
| **Marketplace Page** | `web/app/marketplace/page.tsx` | Browse, purchase, unveil |
| **AI Predictions → Marketplace** | `PredictionMarketplaceSyncService` | Sync AI predictions to marketplace |

### 6.2 Flow

1. **Tipster creates coupon** with "List on marketplace" checked
2. **ROI check:** If price > 0, tipster must meet `minimum_roi` from `api_settings`
3. **Coupon created** with `isMarketplace=true`, `status=active`
4. **Buyer purchases** → escrow holds funds
5. **Settlement** → if won: payout tipster; if lost: refund buyer

### 6.3 Enhancements (Optional)

- [ ] Featured coupons section
- [ ] Filter by sport, league, tipster
- [ ] Coupon ratings/reviews
- [ ] Seller dashboard (sales, revenue)

---

## 7. Restoration Checklist

### Phase 1: Leagues

- [ ] Run `npx ts-node scripts/generate-leagues-migration.ts` (requires API key)
- [ ] Apply `026_comprehensive_professional_leagues.sql`
- [ ] Admin → Fixtures → Sync Fixtures
- [ ] Verify league count and fixture coverage

### Phase 2: Fixtures & Odds

- [ ] Confirm `FixtureSchedulerService` cron jobs are active (backend running)
- [ ] Admin → Fixtures → Sync Fixtures
- [ ] Admin → Fixtures → Sync Odds (or wait for auto-sync)
- [ ] Create pick → select fixture → verify odds load

### Phase 3: Settlement

- [ ] Create test coupon with picks on upcoming fixtures
- [ ] Wait for match to finish (or use past fixture if testing)
- [ ] Verify settlement runs (check accumulator result, escrow)

### Phase 4: Marketplace

- [ ] Create coupon with "List on marketplace"
- [ ] Browse `/marketplace` as buyer
- [ ] Purchase coupon (free or paid)
- [ ] Verify unveil and settlement flow

---

## 8. File Reference

| File | Purpose |
|------|---------|
| `scripts/generate-leagues-migration.ts` | Generate 026 from API-Football |
| `database/migrations/026_comprehensive_professional_leagues.sql` | Generated leagues (run script first) |
| `backend/src/modules/fixtures/football-sync.service.ts` | Fixture sync |
| `backend/src/modules/fixtures/fixture-update.service.ts` | Live + finished updates |
| `backend/src/modules/fixtures/odds-sync.service.ts` | Odds sync |
| `backend/src/modules/fixtures/fixture-scheduler.service.ts` | Cron jobs |
| `backend/src/modules/accumulators/settlement.service.ts` | Settlement logic |
| `backend/src/modules/accumulators/accumulators.service.ts` | Coupon create, marketplace |
| `web/app/marketplace/page.tsx` | Marketplace UI |

---

## 9. Environment

- **API Key:** `API_SPORTS_KEY` or `API_FOOTBALL_KEY` in `.env` (backend root)
- **Database:** Postgres (port 5435), Redis (6380)
- **API:** 6001, Web: 6002
- **Admin:** `admin@betrollover.com` / `password`
