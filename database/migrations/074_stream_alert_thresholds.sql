-- Live-scores SSE alert thresholds (shared across all admins; stored on api_settings row id=1)
ALTER TABLE api_settings
  ADD COLUMN IF NOT EXISTS stream_warn_active_connections INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS stream_critical_active_connections INTEGER NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS stream_warn_events_per_minute INTEGER NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS stream_warn_avg_payload_bytes INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS stream_warn_stale_seconds INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS stream_critical_stale_seconds INTEGER NOT NULL DEFAULT 180;

COMMENT ON COLUMN api_settings.stream_warn_active_connections IS 'SSE metrics: warn when active connections >= this';
COMMENT ON COLUMN api_settings.stream_critical_active_connections IS 'SSE metrics: critical when active connections >= this';
COMMENT ON COLUMN api_settings.stream_warn_events_per_minute IS 'SSE metrics: warn when avg events/min >= this';
COMMENT ON COLUMN api_settings.stream_warn_avg_payload_bytes IS 'SSE metrics: warn when avg payload bytes/event >= this';
COMMENT ON COLUMN api_settings.stream_warn_stale_seconds IS 'SSE metrics: warn when last event age (s) >= this';
COMMENT ON COLUMN api_settings.stream_critical_stale_seconds IS 'SSE metrics: critical when last event age (s) >= this';
