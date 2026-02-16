# Enhancement Review – Fixtures Filters & Counts

This document reviews the recent enhancements (fixture counts, country/competition filters) to ensure they align with the existing project and avoid duplicates or conflicts.

---

## What Was Added

| Area | Change |
|------|--------|
| **Admin Fixtures** (`/admin/fixtures`) | Fixture count, Country dropdown, Competition dropdown, filters applied to `GET /fixtures` |
| **Create Pick** (`/create-pick`) | Available fixtures count, Competition dropdown now uses **leagues** (per country) instead of curated **tournaments** |
| **Backend** (`fixtures.service.ts`) | Filter options: `leagues[].country` now falls back to `enabled_leagues.country` when `league.country` is null |
| **Config** | Default `POSTGRES_HOST` and `.env` set to `localhost` for Docker Desktop Postgres |

---

## Consistency Check

### 1. API usage – no conflicts

- **Admin** and **Create Pick** both call:
  - `GET /fixtures/filters` → same shape: `{ countries, categories?, tournaments, leagues }`
  - `GET /fixtures?country=&league=&team=` (admin also sends `date=today`)
- **Backend** `list()` already supported `date`, `leagueId`, `country`, `team`. No new params; we only use existing ones.

### 2. Naming – intentional difference

- **Admin:** state is `selectedCompetition` (value = league id). Sent as query `league`.
- **Create Pick:** state is `selectedLeague` (value = league id). Sent as query `league`.
- Same meaning and same API param; different variable names per page. No conflict.

### 3. Filter logic – same behaviour, two places

- **Competition options** (country → leagues) are computed the same way on both pages:
  - No country → all leagues
  - Country = "World" → leagues where `country` is empty or `"World"`
  - Other country → leagues where `country` matches (case-insensitive)
- This is duplicated but consistent. Optional later improvement: shared hook or util (e.g. `useFixtureFilterOptions`) to avoid drift.

### 4. Date behaviour – intentional difference

- **Admin:** always sends `date=today` → backend returns only **today’s** fixtures (and applies country/league).
- **Create Pick:** does **not** send `date` → backend returns **all upcoming** fixtures (`match_date >= now`).
- Matches intended use: admin “today’s list” vs create-pick “upcoming for building a slip.” No conflict.

### 5. Backend filter options – single source of truth

- `getFilterOptions()` returns both `tournaments` (curated list) and `leagues` (all enabled leagues with `country` from league or enabled_league).
- **Competition dropdowns** now use **leagues** only, so country-specific leagues (e.g. England) show correctly.
- `tournaments` is still returned and stored on the frontend but is unused in the new UI; keeping it does not cause conflicts and leaves room for future use.

---

## Duplicates and Redundancy

- **No duplicate APIs:** Only existing endpoints are used; no new routes or duplicate calls.
- **No duplicate state:** Each page has its own `filterOptions`, `selectedCountry`, and competition selection; no shared global state that could get out of sync.
- **Slight redundancy:** Same “competition options from country” logic in two files. Safe to leave as-is; can be refactored later into a shared hook if desired.

---

## Potential Issues Avoided

1. **Country in leagues:** Backend now sets `leagues[].country = league.country ?? enabled_league.country`, so filtering by country works even when `league.country` is null (e.g. after sync). No conflict with existing fixture filtering, which already used `enabled_leagues.country`.
2. **Missing filter keys:** Create Pick now normalizes filter options (`countries ?? []`, etc.) so missing or null keys from the API don’t break the UI. Admin already used `|| []` when setting filter options.
3. **Option values:** Competition options use `value={String(l.id)}` and `selectedLeague`/`selectedCompetition` are compared with `String(l.id)` where needed, so type consistency is kept.

---

## Summary

- Enhancements use the **existing** fixtures API and filter options; no contradictions with current behaviour.
- **Admin** and **Create Pick** behave consistently (same filter rules, same API params), with intentional differences only where needed (date, variable names).
- **No duplicate endpoints or conflicting state**; only minor logic duplication (competition options), which is acceptable and can be refactored later.
- **Backend and env** changes (league country fallback, `POSTGRES_HOST=localhost`) are additive and defensive; they don’t override or conflict with the rest of the project.

You can keep applying these enhancements as-is; they are designed to fit the current running project without introducing contradictions or conflicts.
