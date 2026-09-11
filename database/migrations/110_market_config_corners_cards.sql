-- Settled FT corner/card markets for Create Pick (display_order after handicaps).
-- Race To / 1H–2H corners are intentionally omitted — we lack settle inputs.
INSERT INTO market_config (market_name, tier, is_enabled, allowed_values, display_order) VALUES
('Corners Over/Under', 2, true, NULL, 100),
('Home Corners Over/Under', 2, true, NULL, 101),
('Away Corners Over/Under', 2, true, NULL, 102),
('Corners 1X2', 2, true, NULL, 103),
('Corners Asian Handicap', 2, true, NULL, 104),
('Corners Odd/Even', 2, true, NULL, 105),
('Cards Over/Under', 2, true, NULL, 110),
('Yellow Cards', 2, true, NULL, 111),
('Booking Points', 2, true, NULL, 112)
ON CONFLICT (market_name) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  tier = EXCLUDED.tier,
  display_order = EXCLUDED.display_order;
