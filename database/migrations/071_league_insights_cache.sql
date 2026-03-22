-- Cached API-Football league standings / top scorers to limit external API usage (45–60 min refresh in app).
CREATE TABLE IF NOT EXISTS league_insights_cache (
  id SERIAL PRIMARY KEY,
  league_api_id INT NOT NULL,
  season INT NOT NULL,
  kind VARCHAR(20) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_league_insights UNIQUE (league_api_id, season, kind)
);

CREATE INDEX IF NOT EXISTS idx_league_insights_lookup
  ON league_insights_cache (league_api_id, season, kind);
