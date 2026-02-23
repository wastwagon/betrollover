-- Sport Events & Sport Event Odds tables
-- Non-football sports (Basketball, Rugby, MMA, Volleyball, Hockey, American Football, Tennis)
-- Football continues to use the fixtures / fixture_odds tables.
--
-- CANONICAL schema — must match:
--   backend/src/modules/sport-events/entities/sport-event.entity.ts
--   database/migrations/048_multi_sport_foundation.sql   (CREATE TABLE)
--   database/migrations/049_add_team_logos_and_country_codes.sql  (ADD COLUMN)
--
-- On a fresh DB this init script creates the full table so migrations 048 and 049
-- are safe no-ops (both use CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS sport_events (
  id                SERIAL PRIMARY KEY,
  sport             VARCHAR(30)   NOT NULL,
  api_id            BIGINT        NOT NULL,
  league_id         INTEGER,
  league_name       VARCHAR(150),
  home_team         VARCHAR(200)  NOT NULL,
  away_team         VARCHAR(200)  NOT NULL,
  home_team_logo    VARCHAR(500),
  away_team_logo    VARCHAR(500),
  home_country_code VARCHAR(10),
  away_country_code VARCHAR(10),
  event_date        TIMESTAMP     NOT NULL,
  status            VARCHAR(20)   NOT NULL DEFAULT 'NS',
  home_score        INTEGER,
  away_score        INTEGER,
  raw_json          JSONB,
  synced_at         TIMESTAMP,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (sport, api_id)
);

CREATE INDEX IF NOT EXISTS idx_sport_events_sport      ON sport_events (sport);
CREATE INDEX IF NOT EXISTS idx_sport_events_event_date ON sport_events (event_date);
CREATE INDEX IF NOT EXISTS idx_sport_events_status     ON sport_events (status);

-- Odds attached to sport_events rows (one row per outcome per market)
CREATE TABLE IF NOT EXISTS sport_event_odds (
  id             SERIAL  PRIMARY KEY,
  sport_event_id INTEGER NOT NULL REFERENCES sport_events (id) ON DELETE CASCADE,
  market_name    VARCHAR(100) NOT NULL,
  market_value   VARCHAR(100) NOT NULL,
  odds           DECIMAL(10,3) NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sport_event_odds_event_id ON sport_event_odds (sport_event_id);

-- Add FK from accumulator_picks.event_id → sport_events.id (safe: column exists from 03-core-tables.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'accumulator_picks_event_id_fkey'
      AND table_name = 'accumulator_picks'
  ) THEN
    ALTER TABLE accumulator_picks
      ADD CONSTRAINT accumulator_picks_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES sport_events(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_accumulator_picks_event_id ON accumulator_picks(event_id) WHERE event_id IS NOT NULL;
