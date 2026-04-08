-- Preserve half-time score on archived fixtures (audit / future re-grade)
ALTER TABLE fixtures_archive ADD COLUMN IF NOT EXISTS ht_home_score INT NULL;
ALTER TABLE fixtures_archive ADD COLUMN IF NOT EXISTS ht_away_score INT NULL;
