-- Brazil, Argentina, Australia + popular Tier 2 (second division) leagues
-- Run this then Admin → Fixtures → Sync Fixtures.
-- League IDs: API-Sports (api-football.com). Verify at dashboard.api-football.com if a league returns no fixtures.

-- =============================================================================
-- POPULAR TIER 2 (SECOND DIVISION) LEAGUES – includes English Championship
-- =============================================================================
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(72,  'Championship',            'England',   9,  true),   -- England tier 2
(536, 'LaLiga2',                'Spain',     10, true),  -- Spain tier 2 (Segunda)
(136, 'Serie B',                'Italy',     11, true),  -- Italy tier 2
(79,  '2. Bundesliga',          'Germany',  12, true),  -- Germany tier 2
(62,  'Ligue 2',                'France',    13, true),  -- France tier 2
(89,  'Eerste Divisie',         'Netherlands', 14, true) -- Netherlands tier 2
ON CONFLICT (api_id) DO NOTHING;

-- England: tier 3 & 4 (below Championship)
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(40,  'League One',              'England',  32, true),
(41,  'League Two',              'England',  33, true)
ON CONFLICT (api_id) DO NOTHING;

-- Brazil & South America
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(74,  'Serie A',                  'Brazil',   18, true),
(75,  'Serie B',                  'Brazil',   19, true),
(128, 'Liga Profesional',        'Argentina', 29, true),
(130, 'Primera B Nacional',      'Argentina', 30, true)
ON CONFLICT (api_id) DO NOTHING;

-- Australia
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(314, 'A-League Men',            'Australia', 31, true)
ON CONFLICT (api_id) DO NOTHING;
