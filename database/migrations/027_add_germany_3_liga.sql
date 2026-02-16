-- Add Germany 3. Liga (third division)
-- API-Football league ID 80
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active, category, api_type) VALUES
(80, '3. Liga', 'Germany', 13, true, 'domestic', 'league')
ON CONFLICT (api_id) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  category = EXCLUDED.category,
  api_type = EXCLUDED.api_type,
  updated_at = CURRENT_TIMESTAMP;
