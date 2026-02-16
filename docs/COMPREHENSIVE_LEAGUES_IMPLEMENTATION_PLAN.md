# Comprehensive Professional Leagues Implementation Plan

**Goal:** Add all available professional football leagues from API-Football in one pass, so we never revisit this again.

**API-Football coverage:** 1,230 leagues & cups. We filter to **professional men's leagues + major cups** only.

---

## 1. Scope Definition

### 1.1 INCLUDE

| Category | Examples |
|----------|----------|
| **Top divisions (1st tier)** | Every country's top league (Premier League, La Liga, Süper Lig, etc.) |
| **Second divisions** | Championship, LaLiga2, Serie B, 2. Bundesliga, J2 League, etc. |
| **Third divisions** (major countries only) | League One, League Two, Serie C, 3. Liga, National League |
| **Major continental club cups** | UCL, UEL, UECL, Copa Libertadores, Sudamericana, AFC Champions League, CAF Champions League, CONCACAF Champions League |
| **International tournaments** | World Cup, Euros, Copa America, Africa Cup, Gold Cup, Asian Cup |
| **Domestic cups** (optional) | FA Cup, Coppa Italia, Copa del Rey, DFB-Pokal, Coupe de France |

### 1.2 EXCLUDE

| Category | Examples |
|----------|----------|
| **Youth leagues** | U17, U18, U19, U20, U21, U23, Primavera, Youth League |
| **Women's leagues** | WSL, NWSL, Damallsvenskan, Frauen-Bundesliga (add later if needed) |
| **Regional/state leagues** | Brazil state leagues (Paulista, Carioca, etc.), Australia NPL regions |
| **Amateur / 4th+ divisions** | Provincial, Landesliga, Non-League below National League |
| **Reserve leagues** | Reserve League, U21 Division |

---

## 2. Implementation Approach

### Option A: API-Driven Script (Recommended)

1. **Create script** `scripts/generate-leagues-migration.ts`
2. Script fetches from API-Football:
   - `GET /leagues?type=league` (all leagues)
   - `GET /leagues?type=cup` (all cups)
3. Filters to professional leagues using rules above
4. Outputs `database/migrations/026_comprehensive_professional_leagues.sql`
5. Run migration → Sync Fixtures

**Pros:** Always uses current API IDs; no manual mapping.  
**Cons:** Requires API key; run once per major API update.

### Option B: Static Migration

1. Manually compile list from [API-Football coverage](https://api-football.com/coverage)
2. Resolve league IDs via dashboard or API
3. Single migration file with all INSERTs

**Pros:** No API dependency for migration.  
**Cons:** IDs can drift if API changes; tedious to maintain.

---

## 3. Schema & Columns

`enabled_leagues` already has:

| Column | Purpose |
|--------|---------|
| `api_id` | API-Football league ID (unique) |
| `name` | Display name |
| `country` | For filtering (England, Spain, World, etc.) |
| `priority` | Sort order (lower = higher) |
| `is_active` | Include in sync (true/false) |
| `category` | domestic \| cup \| international |
| `api_type` | league \| cup |
| `bookmaker_tier` | core \| extended \| niche |

**Priority bands:**
- 1–20: Big 5 + UCL/UEL/UECL + top 2nd tiers
- 21–50: Other European top + Americas/Asia top
- 51–100: European 2nd/3rd tiers, smaller nations
- 101–150: Asia, Africa, Oceania
- 151–200: CONCACAF, minor leagues
- 201+: Niche / extended

---

## 4. Filter Rules (Script Logic)

```ts
// Exclude patterns (case-insensitive)
const EXCLUDE_PATTERNS = [
  /\b(u17|u18|u19|u20|u21|u23|u-17|u-18|u-19|u-20|u-21|u-23)\b/i,
  /\b(youth|junior|primavera|aspirantes)\b/i,
  /\b(women|feminine|damallsvenskan|wsl|nwsl|frauen)\b/i,
  /\b(reserve|reserva|2nd team)\b/i,
  /\b(provincial|landesliga|regional|amateur)\b/i,
  /\b(play-off|playoff|promotion|relegation)\s*(round|group)?\b/i,
  /\b(4th|5th|6th)\s*(division|liga)\b/i,
];

// Include cups (whitelist by name/ID)
const MAJOR_CUPS = [
  'Champions League', 'Europa League', 'Europa Conference League',
  'Copa Libertadores', 'Copa Sudamericana', 'CONMEBOL',
  'AFC Champions League', 'CAF Champions League', 'CONCACAF Champions League',
  'World Cup', 'Euro Championship', 'Africa Cup', 'Copa America', 'Gold Cup', 'Asian Cup',
  'FA Cup', 'Coppa Italia', 'Copa del Rey', 'DFB Pokal', 'Coupe de France',
  'Copa do Brasil', 'Copa Argentina', 'Copa Colombia', 'Copa Chile',
];
```

---

## 5. Execution Steps

1. **Run script** (requires `API_SPORTS_KEY` in `.env` at project root):
   ```bash
   cd /path/to/BetRolloverNew
   # Ensure .env has API_SPORTS_KEY=your_key
   npx ts-node scripts/generate-leagues-migration.ts
   ```
   Output: `database/migrations/026_comprehensive_professional_leagues.sql`

2. **Review** generated `database/migrations/021_comprehensive_professional_leagues.sql`

3. **Apply migration**:
   ```bash
   psql -U $DB_USER -d $DB_NAME -f database/migrations/026_comprehensive_professional_leagues.sql
   ```
   Or use your migration runner if you have one.

4. **Sync fixtures**:
   - Admin → Fixtures → Sync Fixtures  
   - Or: `curl -X POST .../admin/fixtures/sync -H "Authorization: Bearer $TOKEN"`

5. **Verify**: Check fixture count and country filter dropdown.

---

## 6. Post-Migration

- **Leagues with no fixtures:** Some leagues may be off-season or not covered by your API plan. Set `is_active = false` for those rows if needed.
- **API quota:** More leagues = more fixtures per sync. Monitor `api_settings.daily_requests_used`.
- **bookmaker_tier:** Run migration 019 (or equivalent) to set `core`/`extended` for top leagues.

---

## 7. Countries Covered (from API-Football)

Per [coverage](https://api-football.com/coverage), we target **all countries** with at least one professional top division:

- **Europe:** 50+ countries
- **Americas:** USA, Mexico, Canada, Brazil, Argentina, Colombia, Chile, Uruguay, Peru, Ecuador, Paraguay, Bolivia, Venezuela, Costa Rica, Guatemala, Honduras, El Salvador, Jamaica, Panama, Nicaragua, Trinidad, etc.
- **Asia:** Saudi Arabia, Qatar, UAE, Iran, Japan, South Korea, China, India, Thailand, Vietnam, Indonesia, Malaysia, Philippines, Uzbekistan, etc.
- **Africa:** Ghana, South Africa, Egypt, Nigeria, Morocco, Tunisia, Kenya, Zambia, Zimbabwe, Uganda, Tanzania, Senegal, Ivory Coast, Algeria, etc.
- **Oceania:** Australia, New Zealand

---

## 8. Files Touched

| File | Action |
|-----|--------|
| `docs/COMPREHENSIVE_LEAGUES_IMPLEMENTATION_PLAN.md` | Created (this doc) |
| `scripts/generate-leagues-migration.ts` | Created – fetches API, outputs SQL |
| `database/migrations/026_comprehensive_professional_leagues.sql` | Generated by script |

---

## 9. Rollback

If needed:
```sql
-- Remove leagues added by 026 (keep init + 015–020)
-- Only if 021 uses a distinct priority range or marker
DELETE FROM enabled_leagues WHERE priority >= 200;
-- Or restore from backup
```

---

*Last updated: 2025-02-15*
