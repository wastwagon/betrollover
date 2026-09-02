-- Durable device IDs + first-touch attribution for visitor_sessions.
-- Lets admin split unique browsers from sessions, and tag Telegram / Android app.

ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS device_id VARCHAR(64);
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS traffic_source VARCHAR(32);
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS utm_source VARCHAR(64);
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(64);
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_device_id ON visitor_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_traffic_source ON visitor_sessions(traffic_source);

COMMENT ON COLUMN visitor_sessions.device_id IS 'localStorage anonymous id; same browser across sessions. Telegram in-app may still reset.';
COMMENT ON COLUMN visitor_sessions.traffic_source IS 'Classified at ingest: telegram, android_app, organic, social, referral, direct';
