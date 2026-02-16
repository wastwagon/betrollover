-- Add category, api_type, bookmaker_tier to enabled_leagues (see docs/FIXTURES_LEAGUES_IMPLEMENTATION_PLAN.md)
-- Run before 019 (backfill).

ALTER TABLE enabled_leagues
  ADD COLUMN IF NOT EXISTS category VARCHAR(20),
  ADD COLUMN IF NOT EXISTS api_type VARCHAR(10),
  ADD COLUMN IF NOT EXISTS bookmaker_tier VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_enabled_leagues_category ON enabled_leagues(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enabled_leagues_bookmaker_tier ON enabled_leagues(bookmaker_tier) WHERE bookmaker_tier IS NOT NULL;
