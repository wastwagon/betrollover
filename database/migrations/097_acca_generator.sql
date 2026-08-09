-- Acca Generator: admin limits + per-user generation audit/quota
ALTER TABLE api_settings
  ADD COLUMN IF NOT EXISTS acca_generator_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS acca_generator_min_legs INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS acca_generator_max_legs INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS acca_generator_daily_generations INTEGER NOT NULL DEFAULT 10;

COMMENT ON COLUMN api_settings.acca_generator_enabled IS 'When false, Acca Generator API returns 503 for non-admins.';
COMMENT ON COLUMN api_settings.acca_generator_min_legs IS 'Minimum fixtures/legs a user may request (1–20).';
COMMENT ON COLUMN api_settings.acca_generator_max_legs IS 'Maximum fixtures/legs a user may request (1–20).';
COMMENT ON COLUMN api_settings.acca_generator_daily_generations IS 'Max Acca Generator runs per free user per UTC day; 0 = unlimited.';

CREATE TABLE IF NOT EXISTS acca_generator_runs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  legs_requested INTEGER NOT NULL,
  legs_returned INTEGER NOT NULL,
  markets JSONB NOT NULL DEFAULT '[]'::jsonb,
  odd_min NUMERIC(8, 3) NOT NULL,
  odd_max NUMERIC(8, 3) NOT NULL,
  combined_odds NUMERIC(12, 3) NULL,
  selections JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_ticket_id INTEGER NULL REFERENCES accumulator_tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acca_generator_runs_user_created
  ON acca_generator_runs (user_id, created_at DESC);
