# Leagues Strategy & Platform Growth

This doc explains which leagues are enabled, why, and how to add or verify more.

**Full implementation plan (country filter, categories, bookmakers, international/women/youth):** see **[FIXTURES_LEAGUES_IMPLEMENTATION_PLAN.md](./FIXTURES_LEAGUES_IMPLEMENTATION_PLAN.md)**.

## Why more leagues help

- **More fixtures per day** → tipsters see matches for Tomorrow and the next days (not just “no fixtures”).
- **African leagues** → local fans (Ghana, Nigeria, South Africa, Egypt, etc.) can tip and follow their leagues; increases sign-ups and retention.
- **Popular European + global** → Championship, Eredivisie, Primeira Liga, MLS, Liga MX, Saudi Pro League attract international users and fill the calendar.
- **Brazil, Argentina, Australia** → huge fan bases and betting interest; more global reach.
- **“Junior” / second-tier leagues** (England League One/Two, LaLiga2, Serie B, 2. Bundesliga, Ligue 2, Eerste Divisie) → many more fixtures per week and appeal to users who follow lower divisions.

## Current leagues (after init + migrations `015` + `016`)

**Init script (`12-enabled-leagues-market-config.sql`) now includes popular Tier 2:** English Championship, LaLiga2, Serie B, 2. Bundesliga, Ligue 2, Eerste Divisie. So even a fresh DB has these second divisions.

### Phase 1 – init (top tiers + popular Tier 2)
- England: Premier League, **Championship** (tier 2)  
- Spain: La Liga, **LaLiga2** (tier 2)  
- Italy: Serie A, **Serie B** (tier 2)  
- Germany: Bundesliga, **2. Bundesliga** (tier 2)  
- France: Ligue 1, **Ligue 2** (tier 2)  
- Netherlands: **Eerste Divisie** (tier 2)  
- Europe: Champions League, Europa League, Europa Conference League  

### Added in 015 – European & global
- Portugal: Primeira Liga  
- Netherlands: Eredivisie  
- Turkey: Süper Lig  
- Scotland: Scottish Premiership  
- Belgium: Pro League  
- USA: MLS  
- Mexico: Liga MX  
- Saudi Arabia: Saudi Professional League  

### Added – Africa
- **Ghana**: Premier League  
- **South Africa**: Premier Soccer League  
- **Egypt**: Premier League  
- **Nigeria**: NPFL  
- **Morocco**: Botola Pro  
- **Tunisia**: Ligue 1  
- **Kenya**: Premier League  
- **Zambia**: Super League  
- **Zimbabwe**: Premier Soccer League  

### Added in 016 – Brazil, Argentina, Australia
- **Brazil**: Serie A, Serie B  
- **Argentina**: Liga Profesional, Primera B Nacional  
- **Australia**: A-League Men  

### Added in 016 – English & European second-tier (“junior”) leagues
- **England**: League One, League Two (below Championship)  
- **Spain**: LaLiga2 (Segunda División)  
- **Italy**: Serie B  
- **Germany**: 2. Bundesliga  
- **France**: Ligue 2  
- **Netherlands**: Eerste Divisie  

## After adding leagues

1. **Run the migrations** (if you use migrations):
   ```bash
   psql -U your_user -d your_db -f database/migrations/015_add_more_leagues.sql
   psql -U your_user -d your_db -f database/migrations/016_add_brazil_argentina_australia_second_tier.sql
   psql -U your_user -d your_db -f database/migrations/017_add_100_leagues_all_inclusive.sql
   ```
   Or run the `INSERT` statements from those files in your DB tool. After 015+016+017 you have **100+ leagues**.

2. **Sync fixtures**  
   Admin → **Fixtures** → **Sync Fixtures**.  
   This pulls the next 7 days for all enabled leagues. After that, “Tomorrow” and the next days should show many more matches.

3. **If a league still has no fixtures**  
   - Check that the league is **current** on [API-Football](https://www.api-football.com/) (some African leagues have different season dates).  
   - Confirm the **league ID** in the [API-Football dashboard](https://dashboard.api-football.com/) (Ids → Leagues). If the ID in our DB is wrong, update `enabled_leagues.api_id` and sync again.  
   - You can temporarily set `is_active = false` for a league that you don’t want to use.

## Adding more leagues later

1. Get the **league ID** from [API-Football dashboard](https://dashboard.api-football.com/) (Ids → Leagues) or from a `GET /leagues` call (filter by country/name).
2. Insert into `enabled_leagues`:
   ```sql
   INSERT INTO enabled_leagues (api_id, name, country, priority, is_active)
   VALUES (YOUR_LEAGUE_ID, 'League Name', 'Country', 30, true)
   ON CONFLICT (api_id) DO NOTHING;
   ```
3. Run **Sync Fixtures** again.

## Leagues that attract more users (ideas)

- **Ghana / West Africa**: Ghana Premier League (included); add others from API if available (e.g. other West African top leagues).  
- **Nigeria**: NPFL (included).  
- **Southern Africa**: South Africa PSL, Zambia, Zimbabwe (included).  
- **North Africa**: Egypt, Morocco, Tunisia (included).  
- **East Africa**: Kenya (included); add Uganda/Tanzania if IDs are available.  
- **Americas**: Brazil Serie A/B and Argentina (included); Colombia, Chile, Uruguay if you want more CONMEBOL.  
- **Oceania**: Australia A-League (included).  
- **Second-tier / “junior”**: England League One/Two, LaLiga2, Serie B, 2. Bundesliga, Ligue 2, Eerste Divisie (included). You can add Portugal Liga 2, Turkey First League, etc. via dashboard IDs if needed.

You can enable/disable leagues or change `priority` (lower = higher in filters) anytime; the next sync will respect the current `enabled_leagues` rows.

---

## Reaching 100+ leagues (all-inclusive)

Migration **`017_add_100_leagues_all_inclusive.sql`** adds 70+ leagues so the platform reaches **100+ enabled leagues**:

- **Europe (29):** Greece, Austria, Switzerland, Denmark, Sweden, Norway, Poland, Croatia, Romania, Czech, Serbia, Bulgaria, Hungary, Israel, Cyprus, Turkey First League, Scotland Championship, Ireland, Belarus, Slovenia, Slovakia, Iceland, Northern Ireland, Kazakhstan, Ukraine, Russia, Portugal Liga 2, England National League, Luxembourg, Malta, North Macedonia, Estonia, Latvia, Lithuania, Finland.
- **Asia (15):** Qatar, UAE, Iran, India, China, Japan, South Korea, Thailand, Vietnam, Indonesia, Malaysia, Philippines, Jordan, Iraq, Oman.
- **Americas (14):** Colombia, Chile, Uruguay, Peru, Ecuador, Paraguay, Bolivia, Venezuela, Costa Rica, USL Championship (USA), Canada CPL, Guatemala, Honduras, El Salvador.
- **Africa (12):** Uganda, Tanzania, Senegal, Ivory Coast, Angola, Sudan, Algeria, South Africa First Division, Ethiopia, Mali, Botswana, Namibia.
- **Oceania (1):** New Zealand A-League.

**Run order:** 015 → 016 → 017, then **Sync Fixtures**. Some league IDs may not exist on your API plan; if a league returns no fixtures, check the [API-Football dashboard](https://dashboard.api-football.com/) and set `is_active = false` for that row if needed.
