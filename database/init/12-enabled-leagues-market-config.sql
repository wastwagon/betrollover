-- Enabled Leagues & Market Configuration
-- Controls which leagues and markets we sync/display

-- Enabled Leagues Table
CREATE TABLE IF NOT EXISTS enabled_leagues (
  id SERIAL PRIMARY KEY,
  api_id INT UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(50),
  logo VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- For sorting (lower = higher priority)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market Configuration Table
CREATE TABLE IF NOT EXISTS market_config (
  id SERIAL PRIMARY KEY,
  market_name VARCHAR(100) UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  tier INT DEFAULT 1, -- 1 = Tier 1 (core), 2 = Tier 2 (secondary)
  allowed_values JSONB, -- For Over/Under lines, etc. NULL = all values allowed
  display_order INT DEFAULT 0, -- For UI sorting
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enabled_leagues_active ON enabled_leagues(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_market_config_enabled ON market_config(is_enabled, tier, display_order);

-- Insert Initial Enabled Leagues (Phase 1: Top tiers + popular Tier 2)
INSERT INTO enabled_leagues (api_id, name, country, priority, is_active) VALUES
-- Tier 1 (top divisions)
(39, 'Premier League', 'England', 1, true),
(140, 'La Liga', 'Spain', 2, true),
(135, 'Serie A', 'Italy', 3, true),
(78, 'Bundesliga', 'Germany', 4, true),
(61, 'Ligue 1', 'France', 5, true),
(2, 'Champions League', 'World', 6, true),
(3, 'Europa League', 'World', 7, true),
(848, 'Europa Conference League', 'World', 8, true),
-- Popular Tier 2 (second division) – English Championship + major European
(72, 'Championship', 'England', 9, true),
(536, 'LaLiga2', 'Spain', 10, true),
(136, 'Serie B', 'Italy', 11, true),
(79, '2. Bundesliga', 'Germany', 12, true),
(62, 'Ligue 2', 'France', 13, true),
(89, 'Eerste Divisie', 'Netherlands', 14, true)
ON CONFLICT (api_id) DO NOTHING;

-- Insert Market Configuration (Tier 1 + Tier 2)
INSERT INTO market_config (market_name, tier, is_enabled, allowed_values, display_order) VALUES
-- Tier 1 Markets
('Match Winner', 1, true, NULL, 1),
('Goals Over/Under', 1, true, '["1.5", "2.5", "3.5"]', 2),
('Both Teams To Score', 1, true, NULL, 3),
-- Tier 2 Markets
('Double Chance', 2, true, NULL, 4),
('Correct Score', 2, true, NULL, 5),
('Half-Time/Full-Time', 2, true, NULL, 6)
ON CONFLICT (market_name) DO NOTHING;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_enabled_leagues_updated_at ON enabled_leagues;
CREATE TRIGGER update_enabled_leagues_updated_at
  BEFORE UPDATE ON enabled_leagues
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_market_config_updated_at ON market_config;
CREATE TRIGGER update_market_config_updated_at
  BEFORE UPDATE ON market_config
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
