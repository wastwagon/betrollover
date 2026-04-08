-- Half-time scores for first-half market settlement (API-Football score.halftime)
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS ht_home_score INT NULL;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS ht_away_score INT NULL;

-- Extra pre-match markets (sync + UI + settlement). display_order after core 1–6.
INSERT INTO market_config (market_name, tier, is_enabled, allowed_values, display_order) VALUES
('Draw No Bet', 2, true, NULL, 7),
('Odd/Even', 2, true, NULL, 8),
('First Half Winner', 2, true, NULL, 9),
('Goals Over/Under First Half', 2, true, '["0.5", "1.5", "2.5"]', 10),
('Asian Handicap', 2, true, NULL, 11)
ON CONFLICT (market_name) DO NOTHING;
