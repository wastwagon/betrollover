-- Add major international tournaments for "Filter by tournament" (World Cup, Euros, Africa Cup)
-- API-Football IDs: verify at https://dashboard.api-football.com/ if fixtures don't appear
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active, category, api_type) VALUES
(1,  'FIFA World Cup',           'World', 0, true, 'international', 'cup'),
(4,  'UEFA European Championship', 'World', 0, true, 'international', 'cup'),
(5,  'Africa Cup of Nations',    'World', 0, true, 'international', 'cup')
ON CONFLICT (api_id) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  category = EXCLUDED.category,
  api_type = EXCLUDED.api_type;
