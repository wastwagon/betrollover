-- Admin can hide public archive records without resetting the live table.

ALTER TABLE rollover_settings
  ADD COLUMN IF NOT EXISTS stats_cleared_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN rollover_settings.stats_cleared_at IS 'Ended campaigns before this timestamp are omitted from public rollover records.';
