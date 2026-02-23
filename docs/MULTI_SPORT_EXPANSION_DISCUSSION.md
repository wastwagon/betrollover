# Multi-Sport Platform Expansion – Discussion (No Implementation)

This doc discusses expanding BetRollover beyond football to basketball and other sports. **No implementation yet.** When we implement, existing football features must remain unaffected.

---

## 1. Your Current Platform (Football-Only)

- **Data:** API-Football (fixtures, odds, predictions)
- **AI Tipsters:** Use API-Football `/predictions` + odds for hybrid value filtering
- **Entities:** `Fixture`, `FixtureOdd`, `accumulator_tickets`, `accumulator_picks`, etc.—all assume football
- **Markets:** Match Winner, BTTS, Over/Under, Double Chance, Correct Score, etc.

---

## 2. API-Sports Ecosystem (from dashboard.api-football.com → My Access)

Same vendor as API-Football. One account, one API key, per-sport subscriptions. Base URLs and quotas: **API_SPORTS_MULTI_SPORT_GUIDE.md**.

| Sport | Key Features | Odds? | Predictions? | User Appeal |
|-------|--------------|-------|--------------|-------------|
| **Football** | Fixtures, livescore, standings, events, line-ups, players | ✅ | ✅ (hybrid tipsters) | Current base; Africa, Europe, global |
| **Basketball** | Leagues, livescore, games, teams, standings, statistics, bookmakers | ✅ | ❓ (no dedicated endpoint on docs) | NBA, EuroLeague, local leagues; popular in Africa |
| **Baseball** | Leagues, livescore, games, teams, standings, statistics | ✅ | ❌ | US/Japan focus; niche in Africa |
| **Hockey** | Leagues, livescore, games, events, teams, standings | ✅ | ❌ | Europe, NHL; niche |
| **Rugby** | Leagues, livescore, games, teams, standings | ✅ | ❌ | Strong in SA, UK, AU |
| **Volleyball** | Leagues, livescore, games, teams, standings | ✅ | ❌ | Growing, Olympics |
| **Handball** | Leagues, livescore, games, teams, standings | ✅ | ❌ | Europe-focused |
| **MMA** | Categories, livescore, fights, fighters, odds | ✅ | ❌ | Global, combat-sports fans |
| **NBA** (dedicated) | `v2.nba.api-sports.io` – deep NBA data | ❓ | ❌ | Redundant for fixtures/odds: use Basketball API |
| **NFL** (dedicated) | Same structure as NBA | ❓ | ❌ | US-focused |
| **AFL** | Australian rules football | ✅ | ❌ | AU-focused |
| **Formula 1** | Competitions, circuits, teams, drivers, races | ❌ | ❌ | No odds; different use case |

---

## 3. Basketball Expansion (Your Attached Card: API-Basketball 0% Used)

**Pros**

- Same API-Sports account; likely same key or simple config
- **Odds:** Bookmaker odds for pre-match and live
- **Leagues:** 420+ leagues (NBA, EuroLeague, African leagues, etc.)
- High interest in Africa (NBA, local leagues)
- Market types: moneyline, spreads, totals, player props—fits accumulator-style coupons

**Caveats**

- **Predictions:** Football has `/predictions` for AI-style tips. Basketball docs do not show an equivalent. AI tipsters may need to rely on **odds-only** (implied probability, EV) until a predictions endpoint exists.
- Schema: “Games” instead of “Fixtures”; different entity shape (teams, quarters, etc.)

**Implementation Strategy (when we do it)**

- Add `sport` column (e.g. `football` | `basketball`) to fixtures, tickets, picks
- Basketball-specific modules: `basketball-fixtures`, `basketball-odds`, optional `basketball-predictions` if available
- Keep football code paths unchanged; branch by sport where needed
- Shared: wallet, user, tipster, marketplace, escrow, settlement

---

## 4. Recommended Sports for More Users

Prioritized by fit with your platform (odds, coupons, African/global interest):

| Priority | Sport | Why |
|----------|-------|-----|
| **1** | **Basketball** | Odds + broad leagues; NBA and regional appeal; complements football |
| **2** | **Rugby** | Odds; strong in South Africa, UK, Australia; similar betting model |
| **3** | **MMA** | Odds; global, growing; distinct audience from football |
| **4** | **Volleyball** | Odds; Olympics, continental interest; lighter load than football |
| **5** | **Hockey** | Odds; Europe/NHL; smaller but engaged audience |
| **6** | **American Football** | NFL & NCAA API; same 7-day pattern; US-focused; ~15 NFL + 30–60 NCAA games/week in season. See API_SPORTS_MULTI_SPORT_GUIDE.md §7. |

**Lower priority (for now):** Baseball (US/Japan), Handball (Europe), AFL (AU-only), Formula 1 (no odds). **Do not use NBA API** for basketball—Basketball API already covers NBA; NBA API is redundant and uses separate quota.

---

## 5. Safeguarding Current Football Features

When adding new sports:

1. **Schema**
   - Add `sport` (or `sport_type`) to fixture/ticket/pick tables
   - Default existing rows to `football` so behaviour stays the same
   - Basketball (and others) get new entities or sport-specific tables if needed

2. **Code**
   - Football services (fixtures, odds, predictions, engine) remain as-is
   - New sport = new modules (`basketball/`, etc.) and shared interfaces
   - Feature flags or config to enable/disable sports per environment

3. **API & Sync**
   - Football sync cron jobs unchanged
   - Basketball sync runs separately (different endpoints, rate limits)
   - No shared rate-limit pool that could starve football

4. **UI**
   - Sport filter/tabs in marketplace, create-pick, dashboard
   - Football remains the default; basketball opt-in

5. **AI Tipsters**
   - Football tipsters untouched
   - Basketball tipsters use odds-based logic (EV, implied odds) until predictions exist
   - Separate config and personalities per sport

---

## 6. Summary

| Topic | Conclusion |
|-------|------------|
| Basketball | Strong next step; odds available; predictions TBD; needs sport dimension in schema and modules |
| Other sports | Rugby, MMA, Volleyball, Hockey are good follow-ons; same pattern |
| API-Sports | One account; Football + Basketball + others; free plan includes them |
| Current platform | Use sport flag, default `football`, separate modules and sync; no changes to core football logic |

---

**No implementation yet.** When ready, we start with Basketball and the minimal schema + module changes above, then layer Rugby/MMA/others using the same approach.
