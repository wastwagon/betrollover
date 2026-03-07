-- Ensure tipster_performance_log has unique (tipster_id, snapshot_date) for upsert
-- Required for: INSERT ... ON CONFLICT (tipster_id, snapshot_date) DO UPDATE
DO $$
BEGIN
  ALTER TABLE tipster_performance_log
  ADD CONSTRAINT tipster_performance_log_tipster_date_key
  UNIQUE (tipster_id, snapshot_date);
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- constraint already exists (e.g. from 022_tipsters_predictions.sql)
END $$;
