-- Public 10-day Acca Desk rollover (Sure · 1X2 / AccaSure1X2). One 2-fold per plan day (manual attach).

CREATE TABLE IF NOT EXISTS rollover_runs (
  id SERIAL PRIMARY KEY,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  current_day INTEGER NOT NULL DEFAULT 0,
  owner_username VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  broken_at TIMESTAMPTZ NULL,
  CONSTRAINT rollover_runs_status_chk CHECK (status IN ('active', 'completed', 'broken'))
);

COMMENT ON TABLE rollover_runs IS 'Public educational 10-day Acca Desk rollover. Not a bookmaker payout.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_rollover_runs_one_active
  ON rollover_runs (status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_rollover_runs_status_id
  ON rollover_runs (status, id DESC);

CREATE TABLE IF NOT EXISTS rollover_days (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES rollover_runs(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  calendar_date DATE NOT NULL,
  ticket_id INTEGER NULL REFERENCES accumulator_tickets(id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  combined_odds NUMERIC(8, 3) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ NULL,
  CONSTRAINT rollover_days_day_chk CHECK (day_number BETWEEN 1 AND 30),
  CONSTRAINT rollover_days_status_chk CHECK (status IN ('pending', 'won', 'lost', 'void', 'skipped')),
  UNIQUE (run_id, day_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rollover_days_ticket
  ON rollover_days (ticket_id)
  WHERE ticket_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rollover_days_run_date
  ON rollover_days (run_id, calendar_date);

CREATE INDEX IF NOT EXISTS idx_rollover_days_run
  ON rollover_days (run_id, day_number);
