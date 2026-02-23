-- Track server errors per day for admin analytics
ALTER TABLE analytics_daily
  ADD COLUMN IF NOT EXISTS errors_count INT DEFAULT 0;

COMMENT ON COLUMN analytics_daily.errors_count IS 'Number of 5xx errors on this date';
