-- Team logos and country codes for badges/flags (Phase 1 + 2)
-- fixtures: team logos + country codes (always)
-- sport_events: same, only if table exists (multi-sport deployments)

-- fixtures (always exists)
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_team_logo VARCHAR(500);
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_team_logo VARCHAR(500);
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_country_code VARCHAR(10);
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_country_code VARCHAR(10);

-- sport_events (created by 048_multi_sport_foundation; skip if football-only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sport_events') THEN
    ALTER TABLE sport_events ADD COLUMN IF NOT EXISTS home_team_logo VARCHAR(500);
    ALTER TABLE sport_events ADD COLUMN IF NOT EXISTS away_team_logo VARCHAR(500);
    ALTER TABLE sport_events ADD COLUMN IF NOT EXISTS home_country_code VARCHAR(10);
    ALTER TABLE sport_events ADD COLUMN IF NOT EXISTS away_country_code VARCHAR(10);
  END IF;
END $$;
