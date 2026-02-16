# BetRollover v2 – Tipster Implementation Plan

**References:** [Tipstrr](https://tipstrr.com/), [Tipstrr Add Tips](https://tipstrr.com/add-tips), existing `BetRolloverApp` schema, API-Sports Football API (100 req/day).

---

## 1. Tipstrr Best Practices (from tipstrr.com)

| Practice | Description |
|----------|-------------|
| **Portfolio** | Tipsters create a portfolio before adding tips; tracks performance |
| **Verified track record** | Stats: Win rate, ROI, Avg monthly profit; builds trust |
| **Up-to-the-minute odds** | Odds from multiple bookmakers; SpeedyBet one-click add |
| **Popular events** | Show events with tip count (e.g. "73 Tips" for Inter vs Juventus) |
| **Free + premium** | Free tips daily; premium tipsters with subscriptions |
| **Sports focus** | Football primary; other sports optional |
| **Comprehensive stats** | Track performance, ROI, success rate |

---

## 2. Your Existing Schema (from betrollover_workingdata.sql)

### Core tables

| Table | Purpose |
|-------|---------|
| `accumulator_tickets` | Coupon (title, description, total_odds, price, status, is_marketplace) |
| `accumulator_picks` | Each selection (match_description, prediction, odds, result) |
| `pick_marketplace` | Listing (accumulator_id, seller_id, price, max_purchases) |
| `fixtures` | Match info (home_team, away_team, league, match_date, status) |
| `teams` | Team names by country_id |
| `countries` | Country reference |
| `user_wallets`, `wallet_transactions` | Payments |
| `escrow_funds`, `escrow_transactions` | Purchase escrow |
| `user_purchased_picks` | Who bought what |

### accumulator_picks structure

- `match_description` – e.g. "Real Madrid vs Real Betis"
- `prediction` – e.g. "Over 2.5", "1", "1X", "BTTS Yes"
- `odds` – decimal
- `result` – pending, won, lost, void

### pick_marketplace

- `price` – 0 = free, X = paid (GHS)
- `max_purchases` – 1 = single buyer, 999999 = unlimited

---

## 3. Data Flow (API-Sports → Our DB → Tipster UI)

```
API-Sports (daily sync)
    ↓
fixtures + fixture_odds (our cache)
    ↓
Tipster browses (no API calls)
    ↓
Select match → markets → outcome → odds
    ↓
Add to slip (single or accumulator)
    ↓
Set title, price (0 or GHS), list on marketplace
    ↓
Admin approves → live
```

---

## 4. New/Extended Schema (PostgreSQL)

### 4.1 `leagues` (from API-Sports)

```sql
CREATE TABLE leagues (
  id SERIAL PRIMARY KEY,
  api_id INT UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(50),
  logo VARCHAR(255),
  season INT,
  synced_at TIMESTAMP
);
```

### 4.2 `fixtures` (extend existing concept)

```sql
CREATE TABLE fixtures (
  id SERIAL PRIMARY KEY,
  api_id INT UNIQUE NOT NULL,
  league_id INT REFERENCES leagues(id),
  home_team_id INT,
  away_team_id INT,
  home_team_name VARCHAR(150) NOT NULL,
  away_team_name VARCHAR(150) NOT NULL,
  league_name VARCHAR(100),
  match_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'NS',
  home_score INT,
  away_score INT,
  synced_at TIMESTAMP
);
```

### 4.3 `fixture_odds` (markets + odds)

```sql
CREATE TABLE fixture_odds (
  id SERIAL PRIMARY KEY,
  fixture_id INT REFERENCES fixtures(id),
  market_name VARCHAR(100) NOT NULL,   -- e.g. "Match Winner", "Goals Over/Under"
  market_value VARCHAR(100) NOT NULL, -- e.g. "Home", "Over 2.5"
  odds DECIMAL(10,3) NOT NULL,
  bookmaker VARCHAR(50),
  synced_at TIMESTAMP
);
```

### 4.4 Link accumulator_picks to fixtures

Add `fixture_id` to `accumulator_picks` for settlement and display.

---

## 5. API-Sports Sync (≤100 req/day)

| Job | Endpoint | When | Requests |
|-----|----------|------|----------|
| Leagues | `/leagues?type=league&current=true` | Weekly | 1 |
| Fixtures today | `/fixtures?date=YYYY-MM-DD` | Daily 06:00 | 1 |
| Fixtures tomorrow | `/fixtures?date=YYYY-MM-DD` | Daily 06:00 | 1 |
| Odds (by league) | `/odds?league=X&season=Y` | Daily | 2–3 |
| Settlement | `/fixtures?ids=...` (batch 20) | Every 4h | 2–5 |
| **Total** | | | **~10/day** |

**Scope for testing:** 1 league (e.g. Premier League 39), today + tomorrow only.

---

## 6. Tipster Selection Flow (Step-by-Step)

### 6.1 Create Pick (Single or Accumulator)

1. **Browse fixtures** – List from `fixtures` where `match_date` >= now, `status` = 'NS'
2. **Select match** – Click fixture → load `fixture_odds` for that match
3. **Choose market** – e.g. Match Winner (1X2), Over/Under 2.5, BTTS
4. **Choose outcome** – e.g. "Over 2.5" @ 1.72
5. **Add to slip** – Store in local state
6. **Add more (accumulator)** – Repeat 1–4, or finish
7. **Set details:**
   - Title (e.g. "Saturday Banker")
   - Description (optional)
   - Price: 0 = free, X = paid (GHS)
   - List on marketplace: yes/no
8. **Submit** – POST to API → `accumulator_tickets` + `accumulator_picks` + optional `pick_marketplace`

### 6.2 Markets to Support (Phase 1)

| Market | Values | Example |
|--------|--------|---------|
| Match Winner | 1, X, 2 | Home win @ 1.85 |
| Double Chance | 1X, X2, 12 | 1X @ 1.35 |
| Goals Over/Under | Over 2.5, Under 2.5, etc. | Over 2.5 @ 1.72 |
| Both Teams to Score | Yes, No | BTTS Yes @ 1.90 |

---

## 7. Marketplace Flow

| Step | Actor | Action |
|------|-------|--------|
| 1 | Tipster | Submits coupon (price 0 or X) |
| 2 | System | Creates accumulator_ticket (status: pending_approval), accumulator_picks |
| 3 | System | If is_marketplace: creates pick_marketplace |
| 4 | Admin | Approves → status = active |
| 5 | Buyer | Browses marketplace, purchases (if paid) |
| 6 | System | Escrow holds funds; user_purchased_picks |
| 7 | Match ends | Settlement job fetches result, updates accumulator_picks |
| 8 | System | Releases escrow to tipster (won) or refunds (lost) |

---

## 8. Implementation Order

### Phase 1: Sync + Schema (Backend only)

- [ ] `leagues`, `fixtures`, `fixture_odds` tables
- [ ] Sync service: leagues (weekly), fixtures (daily), odds (daily)
- [ ] Cron/scheduler for 06:00 UTC
- [ ] Verify data in DB

### Phase 2: Tipster Create Pick (API + Web)

- [ ] `GET /fixtures?date=` – from our DB
- [ ] `GET /fixtures/:id/odds` – from our DB
- [ ] `POST /accumulators` – create ticket + picks
- [ ] Web: Create Pick page (fixtures list → match detail → markets → slip → submit)

### Phase 3: Marketplace + Admin

- [ ] `GET /marketplace` – list active coupons
- [ ] `POST /marketplace/:id/purchase` – buy (wallet + escrow)
- [ ] Admin approve/reject
- [ ] My Picks, My Purchases pages

### Phase 4: Settlement

- [ ] Settlement job: finished fixtures → update results → settle coupons
- [ ] Escrow release/refund

### Phase 5: Tipstrr-style Enhancements

- [ ] Tipster stats (win rate, ROI)
- [ ] Popular events (tip count per fixture)
- [ ] Free tip of the day
- [ ] SpeedyBet-style one-click copy

---

## 9. API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/fixtures` | List fixtures (date, league filter) |
| GET | `/fixtures/:id` | Fixture detail + odds |
| GET | `/leagues` | List leagues |
| POST | `/accumulators` | Create coupon (ticket + picks) |
| GET | `/accumulators` | My coupons |
| GET | `/marketplace` | List marketplace coupons |
| POST | `/marketplace/:id/purchase` | Purchase coupon |
| GET | `/accumulators/:id` | Coupon detail |

---

## 10. File Structure (New)

```
BetRolloverNew/
├── backend/src/modules/
│   ├── fixtures/          # Fixtures CRUD, sync
│   ├── odds/              # Fixture odds
│   ├── accumulators/      # Create, list, settle
│   └── marketplace/       # List, purchase
├── web/app/
│   ├── create-pick/       # Tipster create flow
│   ├── marketplace/       # Browse, purchase
│   └── my-picks/          # Tipster's coupons
└── database/init/
    └── 05-fixtures-odds.sql
```

---

## 11. Decisions Locked

| Item | Choice |
|------|--------|
| Leagues | 1 for testing (Premier League 39) |
| Fixture window | Today + tomorrow |
| Markets | 1X2, Double Chance, O/U 2.5, BTTS |
| Sync time | 06:00 UTC daily |
| Price | 0 = free, X = paid GHS |
| max_purchases | 999999 for free, 1 or 999999 for paid |

---

*Next: Implement Phase 1 (sync + schema) then Phase 2 (create pick flow).*
