# API-Football Predictions – How to Get the Data

This guide explains how to retrieve AI predictions from the API-Football service for use in the hybrid tipster system.

---

## 1. Endpoint & Authentication

**Base URL:** `https://v3.football.api-sports.io`

**Predictions endpoint:**
```
GET /predictions?fixture={fixture_id}
```

**Headers:**
```
x-apisports-key: YOUR_API_KEY
```

**Example (curl):**
```bash
curl -X GET "https://v3.football.api-sports.io/predictions?fixture=1035009" \
  -H "x-apisports-key: 06208ae679202aa04a8478d479645756"
```

---

## 2. Your Setup (from dashboard)

- **API Key:** Stored in Admin → API Settings (or `API_SPORTS_KEY` env)
- **Plan:** Pro (7,500 requests/day)
- **URL:** `v3.football.api-sports.io`
- **Subscription:** Active until 2026-03-15

---

## 3. Response Structure

The API returns JSON in this general shape:

```json
{
  "get": "predictions",
  "parameters": { "fixture": "1035009" },
  "errors": [],
  "results": 1,
  "response": [
    {
      "predictions": {
        "winner": {
          "id": 1,
          "name": "Home",
          "comment": "65%"
        },
        "win_or_draw": true,
        "under_over": "...",
        "goals": {
          "home": "1",
          "away": "2"
        },
        "advice": "...",
        "percent": {
          "home": "65%",
          "draw": "20%",
          "away": "15%"
        }
      },
      "league": { ... },
      "teams": { ... }
    }
  ]
}
```

**Important fields:**
- `response[0].predictions` – main prediction data
- `predictions.winner` – predicted match winner (id, name, comment)
- `predictions.percent` – home/draw/away percentages
- `predictions.goals` – home/away goal predictions
- `predictions.under_over` – over/under goals

The exact structure can vary by API version. Our parser handles:
- `winner` or `percent` with `home`, `draw`, `away` (string percentages like `"65%"`)
- `goals` with `over`, `under` or `"over 2.5"`, `"under 2.5"`
- `btts` with `yes`, `no`

**Debugging:** If predictions aren't being used, log `data.response[0]` from the API to inspect the actual structure and adjust the parser in `api-predictions.service.ts` if needed.

---

## 4. How Our Implementation Uses It

**File:** `backend/src/modules/fixtures/api-predictions.service.ts`

1. **Single fixture:**
   ```typescript
   const pred = await apiPredictionsService.getPredictionsForFixture(apiFixtureId);
   ```

2. **Multiple fixtures (with rate limiting):**
   ```typescript
   const map = await apiPredictionsService.getPredictionsForFixtures(
     fixtures.map(f => ({ id: f.id, apiId: f.apiId })),
     150  // 150ms delay between requests
   );
   ```

3. **Parsed outcomes:** Each fixture gets `ApiPredictionOutcome[]` with:
   - `outcome`: `'home' | 'draw' | 'away' | 'over25' | 'under25' | 'btts'`
   - `probability`: 0–1 (e.g. 0.65 for 65%)
   - `rawPercent`: optional 0–100

---

## 5. Fixture ID Source

The **fixture ID** must be the **API-Football fixture ID**, not your database ID.

- **From fixtures table:** Use `fixtures.api_id` (synced from API-Football)
- **From API:** Use the `id` from `GET /fixtures?date=YYYY-MM-DD` or `GET /fixtures?league=X&season=Y`

---

## 6. When Predictions Are Available

- Predictions are typically available **before** the match (often 24–48 hours ahead)
- Not all fixtures have predictions; the API may return empty `response` for some matches
- Coverage is better for major leagues (Premier League, La Liga, Serie A, etc.)

---

## 7. API Usage & Limits

- **Pro plan:** 7,500 requests/day
- **Predictions:** 1 request per fixture
- **Typical usage:** ~80–100 fixtures/day → ~80–100 prediction requests
- **Our delay:** 150ms between requests to avoid rate limits

---

## 8. Testing the Endpoint

**1. Get a fixture ID** (from your DB or fixtures API):
```bash
# Example: fetch today's fixtures
curl -X GET "https://v3.football.api-sports.io/fixtures?date=2026-02-15" \
  -H "x-apisports-key: YOUR_KEY"
```

**2. Request predictions for that fixture:**
```bash
curl -X GET "https://v3.football.api-sports.io/predictions?fixture=FIXTURE_ID" \
  -H "x-apisports-key: YOUR_KEY"
```

**3. Inspect the response** – if `response` is empty or `predictions` is missing, that fixture has no predictions.

---

## 9. Fallback Behavior

If the predictions API returns no data for a fixture, our hybrid engine falls back to **implied probability from odds**:

- `implied_prob = 1 / odds`
- `our_prob = implied_prob + 0.02` (2% edge)
- `EV = (our_prob × odds) - 1`

So predictions are still generated even when the API has no data.

---

## 10. References

- [API-Football Documentation](https://www.api-football.com/documentation-v3)
- [Predictions Endpoint Blog](https://www.api-football.com/news/post/predictions-endpoint)
- [Dashboard](https://dashboard.api-football.com/) – API key, usage, plan
