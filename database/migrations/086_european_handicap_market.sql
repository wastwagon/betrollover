-- European / 3-way handicap lines (API-Football naming varies by bookmaker)
INSERT INTO market_config (market_name, tier, is_enabled, allowed_values, display_order) VALUES
('European Handicap', 2, true, NULL, 12)
ON CONFLICT (market_name) DO NOTHING;
