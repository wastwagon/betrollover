-- Align default minimum win rate with platform standard (admin can still change per row).
ALTER TABLE api_settings
  ALTER COLUMN minimum_win_rate SET DEFAULT 45.0;
