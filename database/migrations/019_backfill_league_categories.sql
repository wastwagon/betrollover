-- Backfill category and api_type for existing enabled_leagues; set bookmaker_tier for core leagues.
-- Run after 018. See docs/FIXTURES_LEAGUES_IMPLEMENTATION_PLAN.md

-- International (country = World): UEFA CL/EL/ECL
UPDATE enabled_leagues
SET category = 'international', api_type = 'league'
WHERE country = 'World' AND (category IS NULL OR category = '');

-- All other existing rows: domestic leagues (cups will be added later with category=cup)
UPDATE enabled_leagues
SET category = 'domestic', api_type = 'league'
WHERE (category IS NULL OR category = '') AND country IS DISTINCT FROM 'World';

-- Bookmaker tier: core = widely offered by Bet365, Betway, 1xBet (top divisions + major intl)
UPDATE enabled_leagues SET bookmaker_tier = 'core'
WHERE api_id IN (
  39,   -- Premier League
  140,  -- La Liga
  135,  -- Serie A
  78,   -- Bundesliga
  61,   -- Ligue 1
  2,    -- Champions League
  3,    -- Europa League
  848,  -- Europa Conference League
  72,   -- Championship
  536,  -- LaLiga2
  136,  -- Serie B
  79,   -- 2. Bundesliga
  62,   -- Ligue 2
  94,   -- Primeira Liga
  88,   -- Eredivisie
  203,  -- Süper Lig
  253,  -- MLS
  262,  -- Liga MX
  307,  -- Saudi Pro League
  71    -- Serie A (Brazil)
);

-- Optional: extended = second tiers and strong domestic (already have many; tag a subset)
UPDATE enabled_leagues SET bookmaker_tier = 'extended'
WHERE bookmaker_tier IS NULL
  AND api_id IN (
    89,   -- Eerste Divisie
    73,   -- Scotland Championship
    169,  -- Ireland Premier
    197,  -- Greece Super League
    207,  -- Switzerland Super League
    119,  -- Denmark Superliga
    113,  -- Sweden Allsvenskan
    103,  -- Norway Eliteserien
    106   -- Poland Ekstraklasa
  );
