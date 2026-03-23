-- Live match minute from API-Football (fixture.status.elapsed). Nullable when not in-play or unknown.
ALTER TABLE fixtures
  ADD COLUMN IF NOT EXISTS status_elapsed SMALLINT NULL;

COMMENT ON COLUMN fixtures.status_elapsed IS 'API-Football live minute (status.elapsed); null for NS/FT or when API omits it';
