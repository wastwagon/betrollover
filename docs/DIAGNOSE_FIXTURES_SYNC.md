# Diagnose why some fixtures (e.g. Fenerbahçe, Porto) don’t show

The app only shows fixtures for **leagues that are enabled**. Sync fetches all fixtures from API-Sports for the date range, then **keeps only** those whose league is in your enabled list. So if a league (e.g. Turkish Super Lig, Primeira Liga) is not enabled, those fixtures never appear.

**Recommended: use your API** to diagnose and fix in one go (see **Option 1** below).

---

## Option 1: Use your API (recommended — do it properly once)

Use admin auth and your API base URL (e.g. `https://api.betrollover.com`). If your app proxies API under `/api/backend`, use e.g. `https://betrollover.com/api/backend` instead.

### Step 1: Get a token

```bash
# Replace with your admin email and password
curl -s -X POST "https://api.betrollover.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}' | jq -r '.access_token'
```

Save the `access_token` value as `TOKEN`.

### Step 2: Run diagnostic

```bash
curl -s -H "Authorization: Bearer $TOKEN" "https://api.betrollover.com/fixtures/sync/diagnostic" | jq
```

Response includes:

- `apiTotalFixtures` — total from API-Sports for the sync window
- `apiLeagues` — leagues in the API (id, name, country, fixtureCount)
- `enabledCount` / `enabledLeagueIds` — what you have enabled
- `inApiNotEnabled` — **leagues in the API but not enabled** (e.g. Fenerbahçe/Porto leagues); these are dropped during sync
- `dbUpcomingCount` / `dbWithoutOddsCount` — fixtures in DB and how many still need odds

### Step 3: Enable all leagues from API (one shot)

This adds every league that appears in the API response to your enabled list. Then you run sync to pull all fixtures and odds.

```bash
# Enable all leagues that appear in API for the sync date range
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "https://api.betrollover.com/fixtures/sync/enable-leagues-from-api" | jq
```

Example response: `{ "ok": true, "added": 42, "alreadyEnabled": 20, "leagues": [...] }`

### Step 4: Run fixture + odds sync

```bash
# Pull all fixtures (now including the newly enabled leagues) and sync odds for first batch
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "https://api.betrollover.com/fixtures/sync" | jq
```

### Step 5 (optional): Backfill odds for more fixtures

If you have many fixtures without odds, run odds sync with a larger batch (e.g. 500). You can call it multiple times until `dbWithoutOddsCount` is 0.

```bash
# Sync odds for up to 500 fixtures (default is 200)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "https://api.betrollover.com/fixtures/sync/odds?limit=500" | jq
```

To re-fetch odds for fixtures that already have them (e.g. after changing market filter): use `?force=true` and optionally `?limit=500`.

**Result:** After Step 3 + 4 (+ 5 if needed), you have **all fixtures with odds** for the sync window: Fenerbahçe, Porto, and every other league the API returns.

---

## Option 2: Run in Coolify Terminal (api container)

1. In **Coolify**: open **BetRollover** → **Terminal** tab.
2. In the **Container** dropdown, select the **api** container (e.g. `api-aw0so4cgcscsgk8c0okggswk-...`).
3. Click **Connect**.
4. In the terminal, run the diagnostic script (it uses `curl` and is included in the API image after the next deploy):

   ```bash
   /app/scripts/coolify-diagnose-fixtures.sh
   ```

   The script uses `API_SPORTS_KEY` from the container env (Coolify injects it). To use a specific date:

   ```bash
   DATE=2025-03-15 /app/scripts/coolify-diagnose-fixtures.sh
   ```

5. **If the script is not there yet** (before you redeploy), use this one-liner instead (same env, date = today):

   ```bash
   curl -s -H "x-apisports-key: $API_SPORTS_KEY" "https://v3.football.api-sports.io/fixtures?date=$(date +%Y-%m-%d)" | head -c 8000
   ```

   For a specific date:

   ```bash
   curl -s -H "x-apisports-key: $API_SPORTS_KEY" "https://v3.football.api-sports.io/fixtures?date=2025-03-15" | head -c 8000
   ```

   In the JSON you’ll see `"league":{"id":123,"name":"League Name"}`. Note the **league IDs** for Fenerbahçe / Porto (e.g. Turkish Super Lig, Primeira Liga). Then add those leagues in **Admin → Fixtures → Leagues** so they become “enabled” and their fixtures are no longer dropped.

---

## Option 3: Full diagnostic (Node script, from repo)

If you have the repo and can run Node (e.g. locally or in a dev container with DB access):

1. From the **backend** directory, set `API_SPORTS_KEY` and optionally `DATE`, and ensure DB env vars are set if you want “enabled leagues” comparison (`DATABASE_URL` or `POSTGRES_*`).
2. Run:

   ```bash
   npx ts-node --transpile-only -O '{"module":"CommonJS"}' scripts/diagnose-fixtures-sync.ts
   ```

   With a specific date:

   ```bash
   DATE=2025-03-15 npx ts-node --transpile-only -O '{"module":"CommonJS"}' scripts/diagnose-fixtures-sync.ts
   ```

This script:

- Fetches fixtures from API-Sports for the date (same as sync).
- Groups by league (id, name, count).
- Optionally lists enabled leagues from the DB and which leagues are **in the API but not enabled** (those fixtures are dropped).

---

## Summary

| What you see | What to do |
|--------------|------------|
| API returns many leagues; only some show in the app | Leagues not in “enabled” list are filtered out. Add the missing league IDs in Admin → Fixtures → Leagues. |
| Fenerbahçe / Porto (or other teams) in API response under a league ID X | Enable league ID X in Admin → Fixtures → Leagues, then run sync again (or wait for the next scheduled sync). |
| API returns 0 fixtures for the date | Try another date (e.g. a match day); or check `API_SPORTS_KEY` in Coolify / Admin → Settings. |
