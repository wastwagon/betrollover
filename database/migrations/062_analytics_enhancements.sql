-- ============================================
-- Phase 1: Analytics enhancements - events + device
-- Unifies with visitor_sessions via session_id
-- ============================================

-- Custom events (purchase, follow, coupon_view, etc.)
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL,
  page VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

-- Device type for visitor_sessions (mobile, desktop, tablet)
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS device_type VARCHAR(20);

COMMENT ON TABLE analytics_events IS 'Custom analytics events (purchase, follow, etc.) - unified with visitor_sessions via session_id';
