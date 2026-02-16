-- Fixture archive: move old fixture rows here to keep fixtures table lean.
-- Only fixtures not referenced by accumulator_picks are archived (tipster history preserved).
-- Run by scheduled job daily at 2 AM.

CREATE TABLE IF NOT EXISTS fixtures_archive (
  id SERIAL PRIMARY KEY,
  original_id INT NOT NULL,
  api_id INT NOT NULL,
  league_id INT,
  home_team_name VARCHAR(150) NOT NULL,
  away_team_name VARCHAR(150) NOT NULL,
  league_name VARCHAR(100),
  match_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'NS',
  home_score INT,
  away_score INT,
  synced_at TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fixtures_archive_match_date ON fixtures_archive(match_date);
CREATE INDEX IF NOT EXISTS idx_fixtures_archive_original_id ON fixtures_archive(original_id);

COMMENT ON TABLE fixtures_archive IS 'Archived fixture rows (e.g. match_date older than 90 days) not referenced by any pick; main fixtures table stays lean.';

-- Ensure Admin sync status UI can show archive job
INSERT INTO sync_status (sync_type, status) VALUES ('archive', 'idle')
ON CONFLICT (sync_type) DO NOTHING;
