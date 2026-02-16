-- BetRollover v2 - Fixtures & Odds (API-Sports sync)
-- leagues, fixtures, fixture_odds for tipster selection flow

CREATE TABLE IF NOT EXISTS leagues (
  id SERIAL PRIMARY KEY,
  api_id INT UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(50),
  logo VARCHAR(255),
  season INT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fixtures (
  id SERIAL PRIMARY KEY,
  api_id INT UNIQUE NOT NULL,
  league_id INT REFERENCES leagues(id),
  home_team_name VARCHAR(150) NOT NULL,
  away_team_name VARCHAR(150) NOT NULL,
  league_name VARCHAR(100),
  match_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'NS',
  home_score INT,
  away_score INT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fixtures_date ON fixtures(match_date);
CREATE INDEX idx_fixtures_status ON fixtures(status);
CREATE INDEX idx_fixtures_league ON fixtures(league_id);

CREATE TABLE IF NOT EXISTS fixture_odds (
  id SERIAL PRIMARY KEY,
  fixture_id INT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  market_name VARCHAR(100) NOT NULL,
  market_value VARCHAR(100) NOT NULL,
  odds DECIMAL(10,3) NOT NULL,
  bookmaker VARCHAR(50),
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_odds_fixture ON fixture_odds(fixture_id);

-- Add fixture_id to accumulator_picks for settlement (nullable for legacy)
ALTER TABLE accumulator_picks ADD COLUMN IF NOT EXISTS fixture_id INT REFERENCES fixtures(id);
CREATE INDEX IF NOT EXISTS idx_acc_picks_fixture ON accumulator_picks(fixture_id);
