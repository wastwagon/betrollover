-- Acca Generator analytics: persist risk band + speed up time-range queries
ALTER TABLE acca_generator_runs
  ADD COLUMN IF NOT EXISTS risk_level VARCHAR(16) NULL;

COMMENT ON COLUMN acca_generator_runs.risk_level IS 'sure | safe | medium | high — per-leg odd band used for the run.';

-- Backfill from odd bands (Sure was added later; older rows map by odd_max).
UPDATE acca_generator_runs
SET risk_level = CASE
  WHEN odd_max <= 1.45 THEN 'sure'
  WHEN odd_max <= 1.80 THEN 'safe'
  WHEN odd_max <= 2.50 THEN 'medium'
  ELSE 'high'
END
WHERE risk_level IS NULL;

CREATE INDEX IF NOT EXISTS idx_acca_generator_runs_created
  ON acca_generator_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_acca_generator_runs_risk_created
  ON acca_generator_runs (risk_level, created_at DESC);
