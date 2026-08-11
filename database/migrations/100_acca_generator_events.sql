-- Acca Generator product events for monetization analytics (quota hits, empty pool, tool opens)
CREATE TABLE IF NOT EXISTS acca_generator_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE acca_generator_events IS 'Product signals for Acca Generator: tool_open, quota_hit, empty_pool.';
COMMENT ON COLUMN acca_generator_events.event_type IS 'tool_open | quota_hit | empty_pool';

CREATE INDEX IF NOT EXISTS idx_acca_generator_events_type_created
  ON acca_generator_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_acca_generator_events_user_created
  ON acca_generator_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
