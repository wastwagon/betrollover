-- Match statistics for settling corners / cards markets (API-Football /fixtures/statistics)
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_corners INT NULL;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_corners INT NULL;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_yellow_cards INT NULL;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_yellow_cards INT NULL;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_red_cards INT NULL;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_red_cards INT NULL;

ALTER TABLE fixtures_archive ADD COLUMN IF NOT EXISTS home_corners INT NULL;
ALTER TABLE fixtures_archive ADD COLUMN IF NOT EXISTS away_corners INT NULL;
ALTER TABLE fixtures_archive ADD COLUMN IF NOT EXISTS home_yellow_cards INT NULL;
ALTER TABLE fixtures_archive ADD COLUMN IF NOT EXISTS away_yellow_cards INT NULL;
ALTER TABLE fixtures_archive ADD COLUMN IF NOT EXISTS home_red_cards INT NULL;
ALTER TABLE fixtures_archive ADD COLUMN IF NOT EXISTS away_red_cards INT NULL;
