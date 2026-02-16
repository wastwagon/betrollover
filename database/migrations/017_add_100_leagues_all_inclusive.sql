-- Add leagues to reach 100+ total (all-inclusive platform)
-- Run after 015 + 016, then Admin → Fixtures → Sync Fixtures.
-- League IDs: API-Sports (api-football.com). Verify at dashboard.api-football.com if a league returns no fixtures.
-- If your plan doesn't cover a league, it may return no fixtures; set is_active = false for that row if needed.

-- =============================================================================
-- EUROPE – more top & second tiers (unique api_id per league)
-- =============================================================================
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(197, 'Super League',             'Greece',       40, true),
(218, 'Bundesliga',               'Austria',      41, true),
(207, 'Super League',             'Switzerland',  42, true),
(119, 'Superliga',                'Denmark',      43, true),
(113, 'Allsvenskan',              'Sweden',       44, true),
(103, 'Eliteserien',              'Norway',       45, true),
(106, 'Ekstraklasa',              'Poland',       46, true),
(210, 'HNL',                      'Croatia',      47, true),
(201, 'Liga 1',                   'Romania',      48, true),
(319, 'First League',             'Czech-Republic', 49, true),
(281, 'SuperLiga',                'Serbia',       50, true),
(267, 'First League',             'Bulgaria',     51, true),
(219, 'NB I',                     'Hungary',      52, true),
(299, 'Ligat haAl',               'Israel',       53, true),
(308, 'First Division',           'Cyprus',       54, true),
(204, 'First League',             'Turkey',       55, true),
(73,  'Championship',             'Scotland',     56, true),
(169, 'Premier Division',        'Ireland',      57, true),
(239, 'Premier League',           'Belarus',      58, true),
(211, 'PrvaLiga',                 'Slovenia',     59, true),
(332, 'Fortuna Liga',             'Slovakia',     60, true),
(114, 'Úrvalsdeild',              'Iceland',      61, true),
(283, 'Premier League',           'Northern-Ireland', 62, true),
(301, 'Premier League',           'Kazakhstan',   63, true),
(231, 'Premier League',           'Ukraine',      64, true),
(236, 'Premier League',           'Russia',       65, true),
(96,  'Liga Portugal 2',          'Portugal',     66, true),
(42,  'National League',          'England',      67, true)
ON CONFLICT (api_id) DO NOTHING;

-- =============================================================================
-- ASIA (unique api_id per league)
-- =============================================================================
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(294, 'Stars League',             'Qatar',        70, true),
(309, 'Pro League',               'UAE',          71, true),
(310, 'Persian Gulf Pro League',  'Iran',         72, true),
(323, 'Indian Super League',     'India',        73, true),
(170, 'Super League',             'China',        74, true),
(98,  'J1 League',                'Japan',        75, true),
(292, 'K League 1',               'South-Korea',  76, true),
(284, 'Thai League 1',            'Thailand',     77, true),
(285, 'V.League 1',               'Vietnam',      78, true),
(286, 'Liga 1',                   'Indonesia',    79, true),
(287, 'Super League',             'Malaysia',     80, true),
(288, 'PFL',                      'Philippines',  81, true),
(289, 'Jordan League',            'Jordan',       82, true),
(290, 'Iraqi League',             'Iraq',        83, true),
(291, 'Oman League',              'Oman',         84, true)
ON CONFLICT (api_id) DO NOTHING;

-- =============================================================================
-- AMERICAS – more CONMEBOL & CONCACAF (api_id unique; 239=Belarus, 273=Nigeria already)
-- =============================================================================
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(240, 'Liga Águila',              'Colombia',     85, true),
(275, 'Primera División',         'Chile',        86, true),
(268, 'Primera División',         'Uruguay',     87, true),
(272, 'Liga 1',                   'Peru',         88, true),
(274, 'Serie A',                  'Ecuador',     89, true),
(278, 'Primera División',         'Paraguay',    90, true),
(279, 'Primera División',         'Bolivia',     91, true),
(280, 'Primera División',         'Venezuela',   92, true),
(276, 'Primera División',         'Costa-Rica',  93, true),
(254, 'USL Championship',         'USA',         94, true),
(322, 'CPL',                      'Canada',      95, true),
(277, 'Liga Nacional',            'Guatemala',   96, true),
(269, 'Liga Nacional',            'Honduras',    97, true),
(270, 'Primera División',         'El-Salvador', 98, true)
ON CONFLICT (api_id) DO NOTHING;

-- =============================================================================
-- AFRICA – more leagues (unique api_ids; 277=Guatemala, 288-291=Asia already)
-- =============================================================================
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(324, 'Premier League',           'Uganda',      100, true),
(325, 'Premier League',           'Tanzania',    101, true),
(326, 'Ligue 1',                  'Senegal',     102, true),
(327, 'Ligue 1',                  'Ivory-Coast', 103, true),
(328, 'Girabola',                 'Angola',      104, true),
(329, 'Premier League',           'Sudan',       105, true),
(330, 'Ligue 1',                  'Algeria',     106, true),
(331, 'First Division',           'South-Africa', 108, true),
(333, 'Premier League',           'Ethiopia',    109, true),
(334, 'Ligue 1',                  'Mali',        111, true),
(335, 'Premier League',           'Botswana',    112, true),
(336, 'Premier League',           'Namibia',     113, true)
ON CONFLICT (api_id) DO NOTHING;

-- =============================================================================
-- OCEANIA (322=Canada CPL; use 341 for New Zealand)
-- =============================================================================
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(341, 'A-League',                 'New-Zealand', 115, true)
ON CONFLICT (api_id) DO NOTHING;

-- =============================================================================
-- MORE EUROPE (smaller nations – unique api_ids)
-- =============================================================================
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
(337, 'National Division',        'Luxembourg',  116, true),
(338, 'Premier League',           'Malta',       117, true),
(339, 'First League',             'North-Macedonia', 118, true),
(340, 'Meistriliiga',             'Estonia',     119, true),
(342, 'Virslīga',                 'Latvia',      120, true),
(343, 'A Lyga',                   'Lithuania',   121, true),
(344, 'Super League',             'Finland',     122, true)
ON CONFLICT (api_id) DO NOTHING;