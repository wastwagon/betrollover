-- Campaign stake, admin reset, and same-calendar-day Day 2 (evening after afternoon).

ALTER TABLE rollover_runs
  ADD COLUMN IF NOT EXISTS campaign_stake_ghs NUMERIC(12, 2) NOT NULL DEFAULT 20;

ALTER TABLE rollover_runs
  ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ NULL;

ALTER TABLE rollover_runs DROP CONSTRAINT IF EXISTS rollover_runs_status_chk;
ALTER TABLE rollover_runs
  ADD CONSTRAINT rollover_runs_status_chk CHECK (status IN ('active', 'completed', 'broken', 'reset'));

DROP INDEX IF EXISTS idx_rollover_days_run_date;
CREATE INDEX IF NOT EXISTS idx_rollover_days_run_date ON rollover_days (run_id, calendar_date);

CREATE TABLE IF NOT EXISTS rollover_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_campaign_stake_ghs NUMERIC(12, 2) NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO rollover_settings (id, default_campaign_stake_ghs)
VALUES (1, 20)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE rollover_settings IS 'Singleton: default example stake for new rollover campaigns.';
COMMENT ON COLUMN rollover_runs.campaign_stake_ghs IS 'Example campaign stake (GHS) for this 30-day run. Not a real payout.';
