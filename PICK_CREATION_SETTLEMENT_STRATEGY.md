# Pick Creation & Settlement Flow Strategy

## Current Implementation Analysis

### What We Have:
1. **Fixture Storage**: Fixtures are stored in `fixtures` table with `apiId`, scores, status
2. **Pick Creation**: Users create picks with `fixtureId` (nullable) and manual `matchDescription`
3. **Settlement**: Checks `fixtures` table for finished matches (`status='FT'`) and settles picks
4. **Sync Service**: Fetches fixtures for today + tomorrow (2 API calls), stores all fixtures

### Current Issues:
1. **Database Bloat**: Storing ALL fixtures (even unused ones) wastes space
2. **API Credits**: Fetching fixtures daily for all matches uses unnecessary credits
3. **Settlement Gap**: If we cache once/day, how do we get real-time results?
4. **Missing Results**: Settlement depends on database having fixture results

---

## Best Practices Research (API-Football & Tipster Platforms)

### API-Football Insights:
- **Live scores update every 15 seconds** (for ongoing matches)
- **Completed matches** (`FT`) have final scores available
- **Use `/fixtures/live`** for real-time updates (single call for all live matches)
- **Cache static data** (leagues, teams) monthly
- **Cache fixture lists** for a few minutes (not days)

### Tipster Platform Patterns:
1. **On-Demand Fixture Fetching**: Only fetch fixtures when users need to create picks
2. **Selective Storage**: Store only fixtures that have picks created on them
3. **Incremental Updates**: Update fixture results periodically (every 15-30 min during match days)
4. **Result Caching**: Cache completed fixture results (they never change)
5. **Redis Caching**: Use Redis for API responses to reduce calls

---

## Proposed Solution Strategy

### Phase 1: Smart Fixture Management

#### 1.1 On-Demand Fixture Fetching (Pick Creation)
**When**: User creates a pick and selects a fixture
**How**:
- User searches/browses fixtures via API (cached in Redis for 5 minutes)
- When user selects a fixture, fetch full details ONCE
- Store fixture in database ONLY if picks are created on it
- Use `upsert` to avoid duplicates

**API Calls**:
- Browse fixtures: `/fixtures?date=YYYY-MM-DD&league=X` (cached 5 min)
- Get fixture details: `/fixtures?id=X` (only when selected)

**Database Storage**:
- Store fixture ONLY when first pick references it
- Use `apiId` as unique identifier
- Store: teams, date, league, status, scores (when available)

#### 1.2 Selective Fixture Storage
**Strategy**: "Store What You Use"
- Don't pre-fetch and store all fixtures
- Only store fixtures that have picks created on them
- This dramatically reduces database size

**Database Schema** (already exists):
```sql
fixtures (
  id (PK),
  api_id (unique),  -- API-Football fixture ID
  home_team_name,
  away_team_name,
  match_date,
  status,           -- NS, 1H, HT, 2H, FT, etc.
  home_score,
  away_score,
  synced_at
)
```

**Storage Trigger**:
- When user creates pick with `fixtureId`, check if fixture exists
- If not, fetch from API and store
- If exists, use existing record

---

### Phase 2: Efficient Result Updates & Settlement

#### 2.1 Settlement Flow Strategy

**Problem**: How to settle picks if we don't fetch fixtures daily?

**Solution**: Multi-Layer Update Strategy

**Layer 1: Real-Time Updates (During Match Days)**
- **When**: Match day (fixtures with `matchDate` = today)
- **Frequency**: Every 15-30 minutes
- **Method**: Use `/fixtures/live` endpoint (single call for all live matches)
- **Update**: Only fixtures in database that are live (`status IN ('1H', 'HT', '2H', 'ET', 'BT', 'P')`)
- **API Calls**: 1 call every 30 min = ~48 calls/day (acceptable)

**Layer 2: Final Score Updates (After Matches)**
- **When**: After match completion
- **Frequency**: Every 1-2 hours during match days
- **Method**: Query fixtures with `status != 'FT'` and `matchDate < now()`
- **Update**: Fetch results for finished matches
- **API Calls**: Batch query by date range, ~2-3 calls per update

**Layer 3: Settlement Job**
- **When**: After fixture updates (triggered by Layer 1 or 2)
- **Frequency**: Every 30-60 minutes
- **Method**: Check database fixtures with `status='FT'` and `homeScore IS NOT NULL`
- **Action**: Settle all picks referencing these fixtures

#### 2.2 Settlement Logic (Already Correct)
```typescript
// Current logic is correct:
1. Find all fixtures with status='FT' and scores available
2. Find all picks referencing these fixtures (result='pending')
3. Determine pick result (won/lost) based on scores
4. Update pick.result
5. When ALL picks in accumulator are settled:
   - If ANY pick lost → accumulator = 'lost'
   - If ALL picks won → accumulator = 'won'
6. Settle escrow based on accumulator result
```

---

### Phase 3: API Credit Optimization

#### 3.1 Caching Strategy

**Redis Caching** (Recommended):
```
Key Pattern: `fixture:${apiId}` or `fixtures:date:${date}:league:${leagueId}`
TTL: 
  - Upcoming fixtures: 5 minutes
  - Live fixtures: 30 seconds
  - Completed fixtures: 24 hours (results never change)
  - Leagues/Teams: 7 days (rarely change)
```

**Cache Hit Flow**:
1. Check Redis cache first
2. If cache hit → return cached data (0 API calls)
3. If cache miss → fetch from API, store in cache, return data

#### 3.2 API Call Optimization

**Daily API Call Budget** (assuming free tier: 100 calls/day):

**Essential Calls**:
- Live fixtures update: 48 calls/day (every 30 min during match days)
- Final score updates: 6 calls/day (every 4 hours)
- Fixture browsing (user picks): ~20 calls/day (cached)
- **Total: ~74 calls/day** ✅ Under limit

**Optimization Techniques**:
1. **Batch Requests**: Fetch multiple fixtures in one call using `fixture` parameter (comma-separated IDs)
2. **Date Range Queries**: Use date ranges instead of individual dates
3. **Status Filtering**: Only fetch fixtures with specific statuses
4. **League Filtering**: Only fetch from leagues users actually pick

---

### Phase 4: Database Storage Strategy

#### 4.1 What to Store

**MUST Store**:
- ✅ Fixtures that have picks created on them
- ✅ Fixture results (scores) once match is finished
- ✅ Leagues that users pick from

**DON'T Store**:
- ❌ All fixtures from all leagues
- ❌ Historical fixtures (unless they have picks)
- ❌ Odds data (unless needed for display)

#### 4.2 Storage Lifecycle

**Fixture Lifecycle**:
1. **Created**: When first pick references it
2. **Updated**: Scores updated during/after match
3. **Archived**: After settlement (optional: move to archive table after 90 days)

**Cleanup Strategy**:
- Keep fixtures with picks for settlement period
- Archive old fixtures (no picks, older than 30 days)
- Keep settled fixtures for 90 days (user history), then archive

#### 4.3 Database Size Management

**Estimated Storage**:
- Fixture record: ~200 bytes
- 1,000 fixtures with picks: ~200 KB
- 10,000 fixtures: ~2 MB (manageable)

**Optimization**:
- Index on `apiId` (unique lookup)
- Index on `status` + `matchDate` (settlement queries)
- Index on `homeScore IS NOT NULL` (finished matches)

---

## Implementation Plan

### Step 1: Update Pick Creation Flow
1. User searches fixtures (cached API call)
2. User selects fixture → fetch details if not in DB
3. Store fixture in DB when pick is created
4. Link pick to fixture via `fixtureId`

### Step 2: Implement Smart Sync Service
1. Create `FixtureUpdateService`:
   - Update live fixtures (every 30 min during match days)
   - Update finished fixtures (every 2 hours)
   - Only update fixtures in database (not all fixtures)

### Step 3: Add Redis Caching
1. Cache fixture API responses
2. Cache fixture lists (browse/search)
3. Set appropriate TTLs

### Step 4: Optimize Settlement
1. Settlement job runs after fixture updates
2. Only processes fixtures with scores available
3. Batch process for efficiency

### Step 5: Database Cleanup Job
1. Archive old fixtures (no picks, >30 days)
2. Archive settled fixtures (>90 days)
3. Run weekly

---

## API Call Budget Example

**Scenario**: 50 active tipsters, 200 picks/day

**Daily API Calls**:
- Live fixture updates: 48 calls (every 30 min)
- Final score updates: 6 calls (every 4 hours)
- Fixture browsing (cached): 20 calls (5 min cache)
- Pick creation (new fixtures): 30 calls (only new fixtures)
- **Total: ~104 calls/day**

**Optimization**:
- Increase cache TTL for browsing: 10 min → saves 10 calls
- Batch fixture updates: combine multiple fixtures → saves 20 calls
- **Optimized Total: ~74 calls/day** ✅

---

## Key Decisions Needed

1. **Fixture Storage**: Store only fixtures with picks? ✅ YES
2. **Update Frequency**: How often to update live fixtures? → **Every 30 minutes**
3. **Caching**: Use Redis? → **YES** (already have Redis)
4. **Cleanup**: Archive old fixtures? → **YES** (after 90 days)
5. **Settlement Trigger**: After fixture update or scheduled? → **Both** (triggered + scheduled backup)

---

## Questions to Answer

1. **Pick Creation**: Should users search fixtures from API or select from pre-loaded list?
   - **Recommendation**: Search from API (cached), more flexible

2. **Fixture Updates**: Should we update ALL fixtures or only ones with picks?
   - **Recommendation**: Only fixtures with picks (saves API calls)

3. **Settlement Timing**: How quickly should picks settle after match ends?
   - **Recommendation**: Within 1-2 hours (update every 2 hours)

4. **Historical Data**: Should we keep historical fixture results?
   - **Recommendation**: Yes, for 90 days (user history), then archive

---

## Next Steps

1. ✅ Review and approve strategy
2. Implement smart fixture fetching (on-demand)
3. Add Redis caching layer
4. Update sync service (selective updates)
5. Optimize settlement flow
6. Add database cleanup job
