# Country filter and why some countries don’t show fixtures

## Country list (UX)

The **Country** dropdown on Create Pick is now driven by **upcoming fixtures**:

- The API returns only countries that have at least one fixture with status `NS` or `TBD` and `match_date >= now`.
- So users only see countries that actually have fixtures in the next 7 days (the sync window), which improves UX.
- If there are no upcoming fixtures at all, the list falls back to all countries from `enabled_leagues` so the dropdown is never empty.

Implementation: `GET /fixtures/filters` → `getFilterOptions()` in `fixtures.service.ts` runs a query that joins `fixtures` → `leagues` → `enabled_leagues` and returns distinct `enabled_leagues.country` for upcoming fixtures.

---

## Why other countries (Ghana, Nigeria, Portugal, USA, Saudi, etc.) might not sync

### 1. **Enabled leagues in the DB**

- Countries appear in the filter only if they have **enabled leagues** and **at least one upcoming fixture**.
- Enabled leagues come from:
  - **Init seed** (e.g. England, Spain, Italy, Germany, France, World, Netherlands).
  - **Migrations** 015 (more European + African), 016 (Brazil, Argentina, Australia, tier 2), 017 (100+ leagues), 020 (World Cup, Euros, Africa Cup).
- If migrations 015/016/017 weren’t run, your DB only has the init set, so you’ll only see a few countries (and only those with upcoming fixtures).

**Check:**  
`SELECT DISTINCT country FROM enabled_leagues WHERE is_active = true ORDER BY country;`

### 2. **API-Football only returns fixtures for the next 7 days**

- The sync uses API-Football’s fixtures endpoint for **today + 6 days** (UTC).
- If a league has no matches in that window (e.g. off-season, international break), **no fixtures** are stored for that league, so that country won’t appear in the “countries with upcoming fixtures” list even if the league is enabled.

### 3. **League IDs must match API-Football**

- `enabled_leagues.api_id` must match the **league ID** in [API-Football](https://www.api-football.com/) (dashboard.api-football.com).
- If an ID is wrong or deprecated, the API returns no (or different) data and we don’t store fixtures for that league.
- Sync only stores fixtures whose `league.id` (from the API) is in our `enabled_leagues.api_id` set.

### 4. **League metadata (leagues table)**

- Fixtures are joined to leagues via `fixtures.league_id` → `leagues.id`, and we match to `enabled_leagues` via `leagues.api_id` = `enabled_leagues.api_id`.
- League rows are created when:
  - We sync leagues from the API (current leagues for enabled `api_id`s), and
  - We backfill up to 30 missing leagues per sync (by `api_id` from `enabled_leagues`).
- If a league never gets a fixture in the 7-day window, it might still get metadata from the backfill, but the **country list** only includes countries that have **upcoming fixtures**, not every enabled country.

### 5. **What to do if a country never appears**

1. **Run migrations** so more leagues (and countries) are in `enabled_leagues`:  
   `scripts/run-league-migrations.sh` or run migrations 015, 016, 017, 020.
2. **Confirm league IDs** at [API-Football](https://www.api-football.com/) and fix any `api_id` in `enabled_leagues` (or add the league) if needed.
3. **Run fixture sync** (e.g. Admin → Sync). After sync, the Country dropdown will list only countries that have at least one upcoming fixture in the DB.
4. If a league is off-season or has no games in the next 7 days, that country will not appear in the Country list until fixtures exist in the sync window.

---

## Optional: count upcoming fixtures per country

To see which countries have upcoming fixtures in the DB:

```sql
SELECT el.country, COUNT(*) AS upcoming_count
FROM fixtures f
JOIN leagues l ON f.league_id = l.id
JOIN enabled_leagues el ON el.api_id = l.api_id AND el.is_active = true
WHERE f.status IN ('NS', 'TBD') AND f.match_date >= NOW()
GROUP BY el.country
ORDER BY upcoming_count DESC;
```

This matches the logic used to build the Country list in `getFilterOptions()`.
