-- Phase 0: Multi-sport foundation
-- Keeps football unchanged. Adds schema for Basketball, Rugby, MMA, Volleyball, Hockey.

-- sport_events: unified table for non-football events (games, fights)
CREATE TABLE IF NOT EXISTS sport_events (
  id SERIAL PRIMARY KEY,
  sport VARCHAR(30) NOT NULL,
  api_id BIGINT NOT NULL,
  league_id INT,
  league_name VARCHAR(150),
  home_team VARCHAR(200) NOT NULL,
  away_team VARCHAR(200) NOT NULL,
  event_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'NS',
  home_score INT,
  away_score INT,
  raw_json JSONB,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sport, api_id)
);

CREATE INDEX IF NOT EXISTS idx_sport_events_sport ON sport_events(sport);
CREATE INDEX IF NOT EXISTS idx_sport_events_event_date ON sport_events(event_date);
CREATE INDEX IF NOT EXISTS idx_sport_events_status ON sport_events(status);

-- sport_event_odds: odds for sport_events
CREATE TABLE IF NOT EXISTS sport_event_odds (
  id SERIAL PRIMARY KEY,
  sport_event_id INT NOT NULL REFERENCES sport_events(id) ON DELETE CASCADE,
  market_name VARCHAR(100) NOT NULL,
  market_value VARCHAR(100) NOT NULL,
  odds DECIMAL(10,3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sport_event_odds_sport_event ON sport_event_odds(sport_event_id);

-- accumulator_picks: add sport and event_id for multi-sport
ALTER TABLE accumulator_picks ADD COLUMN IF NOT EXISTS sport VARCHAR(30) DEFAULT 'football';
ALTER TABLE accumulator_picks ADD COLUMN IF NOT EXISTS event_id INT REFERENCES sport_events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_accumulator_picks_event_id ON accumulator_picks(event_id) WHERE event_id IS NOT NULL;

-- Ensure accumulator_tickets sport default (already has column; ensure default)
ALTER TABLE accumulator_tickets ALTER COLUMN sport SET DEFAULT 'Football';

-- prediction_fixtures: add sport and event_id (football uses fixture_id, others use event_id in Phase 1+)
ALTER TABLE prediction_fixtures ADD COLUMN IF NOT EXISTS sport VARCHAR(30) DEFAULT 'football';
ALTER TABLE prediction_fixtures ADD COLUMN IF NOT EXISTS event_id INT REFERENCES sport_events(id) ON DELETE SET NULL;
ALTER TABLE prediction_fixtures ALTER COLUMN fixture_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prediction_fixtures_event_id ON prediction_fixtures(event_id) WHERE event_id IS NOT NULL;
