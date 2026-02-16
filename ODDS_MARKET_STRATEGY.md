# Odds & Market Strategy - Implementation Plan
## Tier 1 + Tier 2 Markets | Popular Leagues | Streamlined Pick Creation

---

## 🎯 Strategy Overview

### Markets to Support (Tier 1 + Tier 2)

**Tier 1 (Core Markets):**
1. ✅ **Match Winner (1X2)** - Home/Draw/Away
2. ✅ **Goals Over/Under** - 1.5, 2.5, 3.5 lines
3. ✅ **Both Teams To Score (BTTS)** - Yes/No

**Tier 2 (Secondary Markets):**
4. ✅ **Double Chance** - 1X, 12, X2
5. ✅ **Correct Score** - Specific scores
6. ✅ **Half-Time/Full-Time** - HT/FT combinations

**Total Markets:** 6 market types
**Odds Format:** Decimal only (no bookmaker display)

---

## 🌍 League Selection Strategy

### Phase 1: Popular Worldwide Leagues (Start Here)

**Top 5 Domestic Leagues:**
- **Premier League** (England) - League ID: 39
- **La Liga** (Spain) - League ID: 140
- **Serie A** (Italy) - League ID: 135
- **Bundesliga** (Germany) - League ID: 78
- **Ligue 1** (France) - League ID: 61

**International Competitions:**
- **Champions League** - League ID: 2
- **Europa League** - League ID: 3
- **Europa Conference League** - League ID: 848

**Total:** 8 leagues to start

### Phase 2: Expand Later (As We Grow)
- MLS (USA) - League ID: 253
- Brasileirão (Brazil) - League ID: 71
- Liga MX (Mexico) - League ID: 262
- Eredivisie (Netherlands) - League ID: 88
- Primeira Liga (Portugal) - League ID: 94
- And more based on user demand

---

## 🔄 How International Competitions Work

### Champions League / Europa League Handling

**API-Football Structure:**
- International competitions are **leagues** in API-Football
- Champions League = League ID: 2
- Europa League = League ID: 3
- They appear in `/leagues` endpoint with `country: "World"`

**Our Approach:**
1. **Include in league filter** - Treat them like any other league
2. **Sync fixtures** - Same process as domestic leagues
3. **Fetch odds** - Same market filtering applies
4. **Display** - Show "Champions League" or "Europa League" as league name

**No Special Handling Needed** - They're just leagues with `country: "World"`

---

## 📊 Market Filtering Logic

### API-Football Market Names (What to Filter)

**Tier 1 Markets:**
- `"Match Winner"` → Filter for: "Home", "Draw", "Away"
- `"Goals Over/Under"` → Filter for: "Over 1.5", "Over 2.5", "Over 3.5", "Under 1.5", "Under 2.5", "Under 3.5"
- `"Both Teams To Score"` → Filter for: "Yes", "No"

**Tier 2 Markets:**
- `"Double Chance"` → Filter for: "1X", "12", "X2"
- `"Correct Score"` → Filter for: All score combinations (e.g., "1-0", "2-1", "2-2", etc.)
- `"Half-Time/Full-Time"` → Filter for: HT/FT combinations (e.g., "Home/Home", "Draw/Draw", etc.)

### Filtering Implementation

```typescript
const ALLOWED_MARKETS = [
  'Match Winner',
  'Goals Over/Under',
  'Both Teams To Score',
  'Double Chance',
  'Correct Score',
  'Half-Time/Full-Time'
];

const ALLOWED_OVER_UNDER = ['1.5', '2.5', '3.5']; // Only these lines

// Filter logic:
// 1. Check if market name is in ALLOWED_MARKETS
// 2. For Over/Under, check if value contains allowed lines
// 3. Store odds (no bookmaker field needed)
```

---

## 🎨 Streamlined Pick Creation UX

### Current Flow (Too Many Clicks):
1. Browse fixtures list
2. Click fixture → Load odds
3. Select market
4. Select outcome
5. Add to slip
6. Repeat for multiple picks
7. Fill form (title, description, price)
8. Submit

### New Streamlined Flow (3-4 Clicks):

**Step 1: Quick Selection**
- Show fixtures in cards/grid
- Each card shows: Teams, League, Date, **Quick Market Buttons**
- Quick buttons: "Home Win (2.10)", "Over 2.5 (1.85)", "BTTS Yes (1.90)"
- **One click** → Adds to slip immediately

**Step 2: View Slip**
- Shows all selections
- Can remove or edit
- Shows total odds calculation

**Step 3: Finalize**
- Title (auto-generated or manual)
- Price (default: 0 for free)
- Submit

### UI Mockup Concept:

```
┌─────────────────────────────────────────┐
│  Create Pick                            │
├─────────────────────────────────────────┤
│  [Today] [Tomorrow] [All]               │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ 🏆 Premier League                 │  │
│  │ Arsenal vs Chelsea                 │  │
│  │ Today 15:00                       │  │
│  │                                    │  │
│  │ [Home 2.10] [Draw 3.40] [Away 3.20]│
│  │ [Over 2.5: 1.85] [Under 2.5: 1.95]│
│  │ [BTTS Yes: 1.90] [BTTS No: 1.95]  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ Your Slip (2 selections)          │  │
│  │ 1. Arsenal vs Chelsea - Home 2.10 │
│  │ 2. Man City vs Liverpool - Over 2.5│
│  │ Total Odds: 3.89                  │  │
│  │ [Clear] [Continue →]              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🗄️ Database Changes

### 1. Remove Bookmaker Field (Optional)

**Current:**
```sql
bookmaker VARCHAR(50)  -- Remove this
```

**New:**
```sql
-- Remove bookmaker column (or keep NULL, don't display)
-- Store only: market_name, market_value, odds
```

### 2. Add League Filter Table

```sql
CREATE TABLE IF NOT EXISTS enabled_leagues (
  id SERIAL PRIMARY KEY,
  api_id INT UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- For sorting
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial leagues
INSERT INTO enabled_leagues (api_id, name, priority) VALUES
(39, 'Premier League', 1),
(140, 'La Liga', 2),
(135, 'Serie A', 3),
(78, 'Bundesliga', 4),
(61, 'Ligue 1', 5),
(2, 'Champions League', 6),
(3, 'Europa League', 7),
(848, 'Europa Conference League', 8);
```

### 3. Market Filtering Config

```sql
CREATE TABLE IF NOT EXISTS market_config (
  id SERIAL PRIMARY KEY,
  market_name VARCHAR(100) UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  tier INT DEFAULT 1, -- 1 or 2
  allowed_values JSONB, -- For Over/Under lines, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert market config
INSERT INTO market_config (market_name, tier, allowed_values) VALUES
('Match Winner', 1, NULL),
('Goals Over/Under', 1, '["1.5", "2.5", "3.5"]'),
('Both Teams To Score', 1, NULL),
('Double Chance', 2, NULL),
('Correct Score', 2, NULL),
('Half-Time/Full-Time', 2, NULL);
```

---

## 🔧 Implementation Plan

### Phase 1: Backend - Market Filtering

1. **Update `FixtureOdd` Entity**
   - Remove `bookmaker` field (or set to NULL, don't display)
   - Keep: `marketName`, `marketValue`, `odds`

2. **Create Market Filter Service**
   - Filter markets by `ALLOWED_MARKETS` list
   - Filter Over/Under by allowed lines (1.5, 2.5, 3.5)
   - Average odds if multiple bookmakers (or take first)

3. **Update Odds Sync Logic**
   ```typescript
   // In football-sync.service.ts or new odds-sync.service.ts
   const allowedMarkets = ['Match Winner', 'Goals Over/Under', ...];
   const allowedOverUnder = ['1.5', '2.5', '3.5'];
   
   // Filter markets
   const filteredBets = bookmakers[0].bets.filter(bet => 
     allowedMarkets.includes(bet.name)
   );
   
   // Filter Over/Under values
   if (bet.name === 'Goals Over/Under') {
     bet.values = bet.values.filter(v => 
       allowedOverUnder.some(line => v.value.includes(line))
     );
   }
   ```

4. **League Filtering**
   - Add `enabled_leagues` table
   - Filter fixtures by `league_id IN (SELECT api_id FROM enabled_leagues WHERE is_active = true)`
   - Only sync odds for enabled leagues

### Phase 2: Frontend - Streamlined UX

1. **Update Pick Creation Page**
   - Show fixtures in grid/cards
   - Display quick market buttons on each card
   - One-click add to slip
   - Show slip sidebar or bottom sheet

2. **Market Display**
   - Group markets by type
   - Show most popular first (1X2, Over/Under, BTTS)
   - Hide bookmaker info completely

3. **Slip Management**
   - Show selections clearly
   - Allow removal
   - Auto-calculate total odds
   - Quick form for title/price

### Phase 3: API Optimization

1. **Filter Fixtures by League**
   - Only fetch fixtures for enabled leagues
   - Reduces API calls significantly

2. **Batch Odds Fetching**
   - Fetch odds for multiple fixtures in one call (if API supports)
   - Or fetch odds only when fixture selected (on-demand)

3. **Cache Strategy**
   - Cache fixtures: 1 hour
   - Cache odds: 30 minutes (they change frequently)
   - Cache leagues: 7 days

---

## 📈 Expected Results

### API Efficiency:
- **Before:** Fetching odds for all 1,008 fixtures = 1,008 API calls
- **After:** Fetching odds only for enabled leagues (~50-100 fixtures/day) = 50-100 calls
- **Reduction:** ~90% fewer API calls

### Data Storage:
- **Before:** ~20 odds per fixture × 1,008 fixtures = 20,160 odds records
- **After:** ~8-10 odds per fixture × 100 fixtures = 800-1,000 odds records
- **Reduction:** ~95% less data storage

### User Experience:
- **Before:** 7-8 clicks to create one pick
- **After:** 3-4 clicks to create one pick
- **Improvement:** 50% faster pick creation

---

## ✅ Next Steps

1. **Confirm League List** - Are these 8 leagues good to start?
2. **Confirm Market List** - Tier 1 + Tier 2 markets OK?
3. **Confirm UX Flow** - Quick buttons on fixture cards OK?
4. **Start Implementation** - Backend filtering first, then frontend UX

---

## 🎯 Summary

- **Markets:** Tier 1 + Tier 2 (6 market types)
- **Leagues:** 8 popular leagues (5 domestic + 3 international)
- **Odds:** Decimal only, no bookmaker display
- **UX:** Streamlined 3-4 click flow
- **Efficiency:** ~90% fewer API calls, ~95% less storage

Ready to implement when you approve! 🚀
