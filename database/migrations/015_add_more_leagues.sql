-- Add more leagues: popular European/global + African (to grow tipster platform)
-- Run this then Admin → Fixtures → Sync Fixtures to pull fixtures for the new leagues.
-- League IDs from API-Sports (api-football.com). Verify at dashboard.api-football.com if a league returns no fixtures.

-- Popular European & global (more fixtures = more engagement)
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(72,  'Championship',              'England',  9,  true),
(94,  'Primeira Liga',             'Portugal', 10, true),
(88,  'Eredivisie',                'Netherlands', 11, true),
(203, 'Süper Lig',                 'Turkey',   12, true),
(71,  'Scottish Premiership',      'Scotland', 13, true),
(144, 'Pro League',                'Belgium',  14, true),
(253, 'MLS',                       'USA',      15, true),
(262, 'Liga MX',                   'Mexico',   16, true),
(307, 'Saudi Professional League', 'Saudi Arabia', 17, true)
ON CONFLICT (api_id) DO NOTHING;

-- African leagues (Ghana-focused platform + wider Africa appeal)
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(235, 'Premier League',            'Ghana',    20, true),
(384, 'Premier Soccer League',     'South Africa', 21, true),
(357, 'Premier League',            'Egypt',    22, true),
(273, 'NPFL',                      'Nigeria',  23, true),
(295, 'Botola Pro',                'Morocco',  24, true),
(316, 'Ligue 1',                   'Tunisia',  25, true),
(271, 'Premier League',            'Kenya',    26, true),
(229, 'Super League',              'Zambia',   27, true),
(233, 'Premier Soccer League',     'Zimbabwe', 28, true)
ON CONFLICT (api_id) DO NOTHING;
