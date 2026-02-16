# Fixtures & Leagues: Full Implementation Plan & Best Practices

This document is the single source of truth for making the platform’s fixture and league system **comprehensive**, **bookmaker-aligned**, and **future-proof** for a global tipster product (Ghana-based). It covers the country filter fix, categories (domestic, cups, international, women, youth), bookmaker alignment, schema/sync/UI strategy, and pros/cons.

---

## 1. Country filter (fixed)

**Issue:** Filter by country on Create Pick did not work or showed empty countries.

**Root causes:**  
- Backend matched `league.country` with strict case and no trim; API can return different casing.  
- Countries list came only from the `league` table; before first sync that table is empty, so the dropdown had no options.

**Changes made:**

- **Backend (`fixtures.service.ts`):**
  - **`list()`:** When filtering by `country`, use **case-insensitive** and **trimmed** comparison:  
    `LOWER(TRIM(league.country)) = LOWER(TRIM(:country))`.
  - **`getFilterOptions()`:** Build the **countries** list from **both**:
    - `league` table (synced from API), and  
    - `enabled_leagues` (seed/migrations).  
  - Merge, dedupe, and sort so the Country dropdown is **never empty** even before the first fixture sync.

- **Frontend (`create-pick/page.tsx`):**  
  League dropdown filtered by selected country using **case-insensitive** comparison so it matches the backend.

**Verification:**  
Select a country (e.g. England) → only fixtures from that country and leagues from that country in the League dropdown. “All Countries” still shows all.

---

## 2. League categories (best-practice model)

To support **international tournaments**, **women**, and **youth** without re-breaking fixtures later, we treat leagues by **category** and optionally by **type** (league vs cup).

### 2.1 Recommended categories

| Category        | Description                     | API-Football notes                          | Bookmaker relevance      |
|----------------|----------------------------------|---------------------------------------------|---------------------------|
| **Domestic league** | Top / lower divisions by country | `type=league`, `country=Country`             | High – core product      |
| **Cup**        | Domestic cups (FA Cup, Coppa Italia, etc.) | `type=cup`, `country=Country`        | High – widely offered     |
| **International** | UEFA CL/EL/ECL, World Cup, continental | Often `country=World` or similar     | Very high                 |
| **Women**      | Women’s leagues and cups         | Same endpoints; league IDs differ          | Growing – many bookmakers |
| **Youth**      | U21/U19, reserves, etc.          | Same endpoints; league IDs differ          | Lower – fewer bookmakers  |

### 2.2 API-Football behaviour (v3)

- **Leagues endpoint:** `GET https://v3.football.api-sports.io/leagues`
  - **`type`:** `league` | `cup` (documented).
  - **`current`:** `true` for current season.
  - **`country`:** optional; “World” often used for international.
- **Fixtures:** `GET /fixtures?date=YYYY-MM-DD` returns all fixtures for that date; filter in code by enabled league IDs (as today).
- **Women / youth:** No separate `type`; they are distinct **league IDs**. Identify them by name or by a maintained list / `category` in our DB.

**Best practice:**  
- Do **not** rely only on `type=league` for sync.  
- Support **`type=league`** and **`type=cup`** and optionally multiple requests (e.g. by type or by country) so cups and international are included.  
- Tag **women** and **youth** via a **category** (or equivalent) in `enabled_leagues` so UI and filters can treat them consistently.

---

## 3. Bookmaker alignment

**Goal:** Leagues we show should be ones that **popular bookmakers** (e.g. Bet365, Betway, 1xBet) actually offer, so tipsters don’t pick leagues with no market.

**Approach:**

1. **Curate a “bookmaker-supported” set**  
   - Research (once) which leagues each bookmaker offers (sport → football → leagues).  
   - Keep an internal list or DB flag (e.g. `bookmaker_tier: 'core' | 'extended' | null`) so we can:
     - Prioritise core leagues in UI (order, badges, or filters).  
     - Optionally hide or deprioritise leagues that no major bookmaker supports.

2. **Tag, don’t delete**  
   - Prefer marking leagues as “extended” or “niche” rather than removing them; some tipsters and regions (e.g. Ghana, Africa) may still want them.

3. **Where to store**  
   - **Option A:** Add column `enabled_leagues.bookmaker_tier` or `supported_by` (e.g. JSON array of bookmaker names).  
   - **Option B:** Separate table `league_bookmaker_support(league_id, bookmaker, tier)` for fine-grained control.  
   - Start simple (e.g. one column) and expand if needed.

4. **UI**  
   - Filter or section “Popular with bookmakers” / “Available on Betway, 1xBet…” using the above tag.  
   - Keeps Create Pick relevant and avoids “this league isn’t on my bookmaker” complaints.

---

## 4. Schema evolution (future-proof)

Current:

- **`enabled_leagues`:** `api_id`, `name`, `country`, `logo`, `is_active`, `priority`.  
- **`leagues`:** Synced copy from API (`apiId`, `name`, `country`, `logo`, `season`, `syncedAt`).

Recommended **additions** (so we don’t have to “fix fixtures again”):

| Column (example)     | Type        | Purpose |
|----------------------|------------|--------|
| **`category`**       | `varchar`  | `domestic` \| `cup` \| `international` \| `women` \| `youth` for filtering and UI. |
| **`api_type`**       | `varchar`  | `league` \| `cup` from API (for sync logic). |
| **`bookmaker_tier`** | `varchar`  | e.g. `core` \| `extended` \| `niche` \| null (optional). |

- **Backfill:** Set `category` / `api_type` from known lists (e.g. Champions League → international, FA Cup → cup).  
- **New leagues:** When adding a league, set `category` and optionally `api_type` and `bookmaker_tier`.  
- **Sync:** Continue to sync only by `api_id`; category/api_type are for our UX and logic, not for the API response.

**Migrations:**  
- One migration adding `category`, `api_type`, `bookmaker_tier` (all nullable).  
- Second migration (or data script) backfilling existing rows.  
- No change to `fixtures` or `league` FK; only `enabled_leagues` and optional `leagues` (if we mirror category there) grow.

---

## 5. Sync strategy (comprehensive fixtures)

**Current:**  
- One call: `leagues?type=league&current=true` → sync metadata for enabled `api_id`s.  
- Then `fixtures?date=X` for 7 UTC days → keep only fixtures whose `league.id` is in enabled list.

**Target:**

1. **Leagues metadata**
   - Call **`leagues?type=league&current=true`** (unchanged).
   - Add **`leagues?type=cup&current=true`** (or by country if needed) so cups are in the same pipeline.
   - Merge results and still only **upsert leagues that exist in `enabled_leagues`** (by `api_id`).  
   - Store `type` in DB if we add `api_type` (or infer category from `country === 'World'` for international).

2. **Fixtures**
   - **Unchanged:** `fixtures?date=YYYY-MM-DD` per date for 7 days; filter by enabled league IDs.  
   - One request per date keeps quota under control (7 per full sync).

3. **International / women / youth**
   - Same **fixtures** endpoint; no new endpoint.  
   - Add the **right league IDs** to `enabled_leagues` with the right `category` (and optional `api_type`).  
   - Sync already includes any league in `enabled_leagues`; no change to fixture flow.

4. **Quota (Pro 7,500/day)**
   - Leagues: 1–2 calls per sync (league + cup).  
   - Fixtures: 7 calls (7 days).  
   - Odds: per fixture/date as today.  
   - Leaves headroom for odds and one full sync per day; document “run sync once per day (e.g. 6 AM)” as best practice.

---

## 6. UI (Create Pick & filters)

- **Country:** Already fixed; works with merged list and case-insensitive backend.  
- **League:** Already filtered by selected country; optional “Popular with bookmakers” filter using `bookmaker_tier`.  
- **Category (future):**  
  - Add filter or tabs: **All | Leagues | Cups | International | Women | Youth** (or a subset).  
  - Backend: `GET /fixtures?date=…&country=…&league=…&category=…`; `getFilterOptions()` returns `categories` and leagues with `category`.  
  - Ensures international, women, and youth are first-class and discoverable.

---

## 7. Pros and cons of this path

**Pros**

- **One-time design:** Category and bookmaker alignment built in; no need to “fix fixtures again” when adding cups/women/youth.  
- **Bookmaker relevance:** Tipsters see leagues they can actually bet on; better trust and retention.  
- **Global + local:** Ghana/Africa and international tournaments in one product; single codebase.  
- **Quota-safe:** Sync strategy stays within Pro limits; clear “sync once per day” rule.  
- **Backward compatible:** New columns nullable; existing flows keep working.

**Cons / risks**

- **Manual curation:** Category and bookmaker tier need initial setup and occasional updates when new leagues are added.  
- **API IDs:** Women/youth league IDs must be discovered (dashboard or API) and added to `enabled_leagues`; no automatic “all women” filter from API.  
- **More leagues:** 100+ leagues + cups + international + women/youth can make the league dropdown heavy; **category filter** and **search** become important.

**Mitigations**

- Document “how to add a league” (ID, name, country, category, bookmaker_tier) in LEAGUES_AND_GROWTH.md.  
- Consider lazy-loading or search-only league list if the dropdown grows too large.  
- Use priority and bookmaker_tier to sort leagues (e.g. core first, then by country).

---

## 8. Implementation checklist (no order implied)

- [x] Country filter: backend case-insensitive + trim; getFilterOptions merge countries from league + enabled_leagues; frontend case-insensitive league filter.  
- [x] Schema: add `category`, `api_type`, `bookmaker_tier` to `enabled_leagues` (migration 018 + backfill 019).  
- [x] Sync: add `leagues?type=cup&current=true` and merge with league list; still filter by enabled IDs.  
- [x] Backfill categories for existing leagues (international, cup, domestic); set bookmaker_tier core/extended for top leagues (019).  
- [ ] Bookmaker: expand research and set `bookmaker_tier` for more leagues as needed; document source.  
- [x] API: optional `category` and `bookmaker_tier` in `GET /fixtures/filters` and `GET /fixtures?category=&bookmaker_tier=`.  
- [x] UI: category filter and "Popular with bookmakers" checkbox on Create Pick.  
- [x] Docs: LEAGUES_AND_GROWTH.md links this plan.

**Run migrations 018 and 019** (e.g. `psql -U user -d db -f database/migrations/018_...sql` then `019_...sql`) so the new columns exist and are backfilled before using category/bookmaker filters.

---

## 9. References

- **Country filter:** `backend/src/modules/fixtures/fixtures.service.ts` (`list`, `getFilterOptions`); `web/app/create-pick/page.tsx` (country + league filters).  
- **Sync:** `backend/src/modules/fixtures/football-sync.service.ts` (leagues + fixtures).  
- **Leagues growth:** `docs/LEAGUES_AND_GROWTH.md` (current leagues, migrations 015–017, how to add leagues).  
- **API-Football:** [Leagues by type](https://www.api-football.com/news/post/leagues-by-type) (league/cup); [List of leagues & cups](https://api-football.com/news/post/list-of-all-available-leagues-cup); [Dashboard](https://dashboard.api-football.com/) for league IDs and coverage.

This plan is the place to update when we add international tournaments, women, youth, or bookmaker tiers so the platform stays comprehensive and maintainable.
